"use node";

import { v } from "convex/values";

import { api } from "./_generated/api";
import { action } from "./_generated/server";
import { CAMPOS_FICHA, type Confianza } from "./ficha";

// ─────────────────────────────────────────────────────────────
// PROCESAR VISITA — llamada principal de IA (PLAN.md, llamada 1).
//
//   audio  --ElevenLabs-->  transcripción
//   fotos + transcripción  --Claude-->  ficha + ajuste + explicación
//
// Las API keys SIEMPRE salen de variables de entorno de Convex:
//   ELEVENLABS_API_KEY, ANTHROPIC_API_KEY
// (opcionales: ANTHROPIC_MODEL, ELEVENLABS_STT_MODEL)
// ─────────────────────────────────────────────────────────────

type CampoIA = {
  valor: string;
  evidencia: string;
  confianza: Confianza;
  aConfirmar: boolean;
};

type Ajuste = { porcentaje: number; motivo: string; evidencia: string } | null;

// Tipos de imagen que acepta la API de Claude.
const MIME_IMAGEN_VALIDOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MIME_POR_DEFECTO = "image/jpeg";

// fetch con tiempo límite para no colgar la demo si la red o la API no responden.
async function fetchConTimeout(
  url: string,
  init: RequestInit,
  ms: number
): Promise<Response> {
  const controlador = new AbortController();
  const t = setTimeout(() => controlador.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controlador.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`La llamada superó el tiempo límite de ${Math.round(ms / 1000)}s.`);
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

// 1) Transcribe el audio con ElevenLabs Scribe. Timeout de 60s.
async function transcribirAudio(audioUrl: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno ELEVENLABS_API_KEY en Convex.");
  }

  const audioResp = await fetchConTimeout(audioUrl, {}, 30_000);
  if (!audioResp.ok) {
    throw new Error("No se pudo descargar el audio del storage.");
  }
  const audioBlob = await audioResp.blob();

  const form = new FormData();
  // El nombre es solo informativo; ElevenLabs detecta el formato por el contenido.
  form.append("file", audioBlob, "audio");
  form.append("model_id", process.env.ELEVENLABS_STT_MODEL ?? "scribe_v1");

  const resp = await fetchConTimeout(
    "https://api.elevenlabs.io/v1/speech-to-text",
    { method: "POST", headers: { "xi-api-key": apiKey }, body: form },
    60_000
  );

  if (!resp.ok) {
    const detalle = await resp.text();
    throw new Error(`ElevenLabs devolvió ${resp.status}: ${detalle}`);
  }

  const data = (await resp.json()) as { text?: string };
  return data.text ?? "";
}

// Construye el bloque de instrucciones con la lista cerrada de valores.
function catalogoParaPrompt(): string {
  return CAMPOS_FICHA.map((def) => {
    const opciones = def.opciones
      .map((o) => `    - "${o.valor}": ${o.descripcion}`)
      .join("\n");
    return `• ${def.clave} (${def.etiqueta}, grupo ${def.grupo}, fuente: ${def.fuente})\n${opciones}`;
  }).join("\n");
}

const CLAVES_SOLO_PERSONA = CAMPOS_FICHA.filter((c) => c.soloPersona).map((c) => c.clave);

const PROMPT_SISTEMA = `Sos un asistente que arma fichas de relevamiento de viviendas precarias para la ONG Rancho Cero (Cireneos, Uruguay). La IA propone, las personas deciden. La ficha sigue la tabla de puntajes real de Cireneos.

Reglas estrictas:
- Para cada campo elegís UN valor de su lista cerrada. Nunca inventás valores.
- Cada campo trae su evidencia: "foto N: lo que se ve" o una cita textual del audio.
- Confianza "alta" = evidencia directa y clara. "media" = parcial o indirecta. "baja" = inferencia sin evidencia.
- "aConfirmar" = true cuando la confianza es baja, no hay evidencia, o la foto y el audio se contradicen.
- Los campos de SALUD Y FAMILIA (enfermedad, menoresDe5, menores5a12, menores12a18, monoparental) y los de DIMENSIÓN SOCIAL que dependen del relato (vinculoOrganizacion, desalojo) salen SOLO del audio. Nunca se infieren de las fotos. Si el audio no los menciona, aConfirmar=true.
- Salud (campo "enfermedad"): nunca inferir. Si no se menciona, usá "nada" con aConfirmar=true. Nunca guardar el diagnóstico exacto, solo la categoría (nada/leve/media/grave).
- NUNCA completes estos campos, los elige una persona: ${CLAVES_SOLO_PERSONA.join(", ")}. Para ellos poné el primer valor de la lista, confianza "baja" y aConfirmar=true SIEMPRE.
- Si no hay información para un campo, igual elegí el valor más plausible pero marcá aConfirmar=true y confianza "baja".
- El "ajuste" (opcional) refleja factores que la tabla NO contempla (violencia o riesgo en el hogar, vivienda al borde de un talud o cañada, riesgo eléctrico grave, sin acceso a agua potable, persona postrada, embarazo → suben; solución habitacional en curso, estado mejor que lo relevado → bajan). El porcentaje va entre -15 y +15. Si no hay factores, ajuste = null. Ojo: inundación y desalojo YA son campos de la tabla, no van como ajuste.
- "explicacion": texto breve en español simple sobre qué campos pesaron más y por qué.

Respondé SOLO con un objeto JSON válido, sin texto adicional ni markdown, con esta forma exacta:
{
  "campos": {
    "<clave>": { "valor": "...", "evidencia": "...", "confianza": "alta|media|baja", "aConfirmar": true|false }
  },
  "ajuste": { "porcentaje": number, "motivo": "...", "evidencia": "..." } | null,
  "explicacion": "..."
}
Tenés que incluir TODAS estas claves de campo: ${CAMPOS_FICHA.map((c) => c.clave).join(", ")}.`;

type RespuestaClaude = {
  campos: Record<string, CampoIA>;
  ajuste: Ajuste;
  explicacion: string;
};

// Descarga una foto y devuelve su base64 + media_type real (del header).
async function descargarImagen(
  url: string,
  indice: number
): Promise<{ base64: string; mediaType: string }> {
  const resp = await fetchConTimeout(url, {}, 30_000);
  if (!resp.ok) throw new Error(`No se pudo descargar la foto ${indice + 1}.`);

  // El tipo correcto viene en el header content-type de la descarga; las URLs
  // del storage de Convex no tienen extensión, así que no se puede adivinar.
  const ctHeader = (resp.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const mediaType = MIME_IMAGEN_VALIDOS.has(ctHeader) ? ctHeader : MIME_POR_DEFECTO;

  const buffer = await resp.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return { base64, mediaType };
}

// 2) Llama a Claude con fotos (base64) + transcripción y pide la ficha.
async function completarFicha(
  fotosUrls: string[],
  transcripcion: string
): Promise<RespuestaClaude> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno ANTHROPIC_API_KEY en Convex.");
  }
  const modelo = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

  const bloquesImagen = await Promise.all(
    fotosUrls.map(async (url, i) => {
      const { base64, mediaType } = await descargarImagen(url, i);
      return {
        type: "image" as const,
        source: { type: "base64" as const, media_type: mediaType, data: base64 },
      };
    })
  );

  const textoUsuario = `Catálogo de campos y sus valores válidos:\n${catalogoParaPrompt()}\n\nLas fotos están numeradas en orden (foto 1, foto 2, ...).\n\nTranscripción del audio del voluntario:\n"""\n${transcripcion || "(sin audio o transcripción vacía)"}\n"""\n\nCompletá la ficha siguiendo las reglas.`;

  const resp = await fetchConTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        // 18 campos con evidencia + explicación entran holgados en 4096.
        max_tokens: 4096,
        system: PROMPT_SISTEMA,
        messages: [
          {
            role: "user",
            content: [...bloquesImagen, { type: "text", text: textoUsuario }],
          },
        ],
      }),
    },
    90_000
  );

  if (!resp.ok) {
    const detalle = await resp.text();
    throw new Error(`Anthropic devolvió ${resp.status}: ${detalle}`);
  }

  const data = (await resp.json()) as {
    stop_reason?: string;
    content: Array<{ type: string; text?: string }>;
  };

  // Si la respuesta se cortó por tokens, el JSON viene incompleto: avisamos claro.
  if (data.stop_reason === "max_tokens") {
    throw new Error("La respuesta de la IA se cortó por longitud. Reintentá.");
  }

  const texto = data.content.find((b) => b.type === "text")?.text ?? "";
  const json = extraerJson(texto) as Partial<RespuestaClaude>;
  return {
    campos: (json.campos ?? {}) as Record<string, CampoIA>,
    ajuste: normalizarAjuste(json.ajuste),
    explicacion: typeof json.explicacion === "string" ? json.explicacion : "",
  };
}

// Extrae el primer objeto JSON del texto (por si viene con texto o ```json).
function extraerJson(texto: string): unknown {
  const sinCerca = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
  const inicio = sinCerca.indexOf("{");
  const fin = sinCerca.lastIndexOf("}");
  if (inicio === -1 || fin === -1) {
    throw new Error("La IA no devolvió un resultado reconocible. Reintentá.");
  }
  try {
    return JSON.parse(sinCerca.slice(inicio, fin + 1));
  } catch {
    throw new Error("La IA devolvió un resultado inválido. Reintentá.");
  }
}

// Valida y acota el ajuste: número finito, clamp a -15..+15. Si no, null.
function normalizarAjuste(ajuste: unknown): Ajuste {
  if (!ajuste || typeof ajuste !== "object") return null;
  const a = ajuste as Record<string, unknown>;
  const n = Number(a.porcentaje);
  if (!Number.isFinite(n)) return null;
  const porcentaje = Math.max(-15, Math.min(15, Math.round(n)));
  return {
    porcentaje,
    motivo: typeof a.motivo === "string" ? a.motivo : "",
    evidencia: typeof a.evidencia === "string" ? a.evidencia : "",
  };
}

// Normaliza la respuesta de la IA al shape exacto del schema.
function normalizarCampos(campos: Record<string, CampoIA>): Record<string, CampoIA> {
  const salida: Record<string, CampoIA> = {};
  for (const def of CAMPOS_FICHA) {
    // Los campos que elige una persona nunca llevan el valor de la IA.
    if (def.soloPersona) {
      salida[def.clave] = {
        valor: def.opciones[0].valor,
        evidencia: "",
        confianza: "baja",
        aConfirmar: true,
      };
      continue;
    }

    const c = campos?.[def.clave];
    const valorValido = def.opciones.some((o) => o.valor === c?.valor);
    salida[def.clave] = {
      valor: valorValido ? c!.valor : def.opciones[0].valor,
      evidencia: valorValido && typeof c?.evidencia === "string" ? c.evidencia : "",
      confianza: (["alta", "media", "baja"] as const).includes(c?.confianza as Confianza)
        ? (c!.confianza as Confianza)
        : "baja",
      // Si el valor no era válido o faltaba, se marca a confirmar.
      aConfirmar: valorValido ? Boolean(c?.aConfirmar) : true,
    };
  }
  return salida;
}

// 3) Orquesta todo: transcribe, completa la ficha y la guarda en el caso.
export const procesarVisita = action({
  args: {
    casoId: v.id("casos"),
    fotos: v.array(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    ok: boolean;
    transcripcion: string;
    transcripcionFallo: boolean;
    campos: Record<string, CampoIA>;
    ajuste: Ajuste;
    explicacion: string;
  }> => {
    // Solo usuarios autenticados pueden gastar créditos de IA.
    const identidad = await ctx.auth.getUserIdentity();
    if (!identidad) {
      throw new Error("Necesitás iniciar sesión para procesar una visita.");
    }

    // Resuelve storage IDs a URLs servibles (en orden).
    const fotosUrls: string[] = [];
    for (const id of args.fotos) {
      const url = await ctx.storage.getUrl(id);
      if (url) fotosUrls.push(url);
    }
    if (fotosUrls.length === 0) {
      throw new Error("El caso no tiene fotos accesibles.");
    }

    // Paso 1: transcripción (si hay audio). Si falla, se sigue solo con fotos.
    let transcripcion = "";
    let transcripcionFallo = false;
    if (args.audioStorageId) {
      const audioUrl = await ctx.storage.getUrl(args.audioStorageId);
      if (audioUrl) {
        try {
          transcripcion = await transcribirAudio(audioUrl);
          await ctx.runMutation(api.casos.guardarTranscripcion, {
            casoId: args.casoId,
            transcripcion,
          });
        } catch (err) {
          // Degradación: la ficha se completa igual con las fotos.
          console.error("Transcripción falló, se sigue solo con fotos:", err);
          transcripcionFallo = true;
        }
      }
    }

    // Paso 2: Claude completa la ficha.
    const respuesta = await completarFicha(fotosUrls, transcripcion);
    const campos = normalizarCampos(respuesta.campos ?? {});

    // Paso 3: guardar en Convex (calcula puntaje base y de tabla).
    await ctx.runMutation(api.casos.guardarFichaIA, {
      casoId: args.casoId,
      campos: campos as any,
      ajustePorcentaje: respuesta.ajuste?.porcentaje,
      ajusteMotivo: respuesta.ajuste?.motivo,
      ajusteEvidencia: respuesta.ajuste?.evidencia,
      explicacion: respuesta.explicacion,
    });

    return {
      ok: true,
      transcripcion,
      transcripcionFallo,
      campos,
      ajuste: respuesta.ajuste,
      explicacion: respuesta.explicacion,
    };
  },
});
