"use node";

import { v } from "convex/values";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { CAMPOS_FICHA, faltanDatos, type CampoFicha, type Confianza } from "./ficha";

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
export async function transcribirAudio(audioUrl: string): Promise<string> {
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
    const criterio = def.criterio ? `\n    criterio: ${def.criterio}` : "";
    return `• ${def.clave} (${def.etiqueta}, grupo ${def.grupo}, fuente: ${def.fuente})${criterio}\n${opciones}`;
  }).join("\n");
}

const PROMPT_SISTEMA = `Sos un asistente que arma fichas de relevamiento de viviendas precarias para la ONG Rancho Cero (Cireneos, Uruguay). La IA propone, las personas deciden. La ficha sigue la tabla de puntajes real de Cireneos.

Regla principal: completás la ficha SOLO con lo que realmente surge de las fotos y del audio. NO inventás ni adivinás. No existen campos obligatorios: en una visita se mencionan algunas cosas y otras no, y está bien. Completás lo que tengas; lo que no se mencione ni se vea, queda sin dato.

Reglas:
- Si un campo surge de la evidencia (se ve en una foto o se dice en el audio), elegís UN valor de su lista cerrada, con su evidencia y su confianza. Nunca un valor fuera de la lista.
- Si un campo NO se menciona en el audio NI se ve en las fotos: dejá "valor": "" (vacío), "confianza": "baja", "dudoso": true y "motivoDuda": una frase corta como "No se menciona en el audio" o "No se ve en las fotos". NO elijas un valor "plausible": dejalo vacío.
- "evidencia": "foto N: lo que se ve" o cita textual del audio. Corta, máximo una frase. Si el campo quedó sin dato, "evidencia": "".
- Confianza "alta" = evidencia directa y clara. "media" = parcial o indirecta. "baja" = sin evidencia (y entonces va sin dato).
- "dudoso" = true cuando la confianza es "baja" o el campo quedó sin dato.
- Audios: puede haber más de uno ("Audio 1", "Audio 2"…). Son de la misma visita; los nuevos completan lo que faltaba. Usalos todos juntos; si se contradicen, vale el más nuevo.
- Fotos: llegan sin orden ni títulos. Pueden mostrar cualquier parte de la vivienda o varias a la vez. Analizalas TODAS y no asumas qué muestra cada una por su posición. Para citarlas usá "foto N".
- Los campos de SALUD Y FAMILIA (enfermedad, menoresDe5, menores5a12, menores12a18, monoparental) y vinculoOrganizacion, desalojo y adicionales salen SOLO del audio. Si el audio no los menciona, van SIN dato (valor ""). Nunca se infieren de las fotos.
- Salud (campo "enfermedad"): nunca inferir. Si no se menciona, va sin dato. Nunca guardar el diagnóstico exacto, solo la categoría (nada/leve/media/grave).
- El "ajuste" (opcional) refleja factores que la tabla NO contempla (violencia o riesgo en el hogar, vivienda al borde de un talud o cañada, riesgo eléctrico grave, sin acceso a agua potable, persona postrada, embarazo → suben; solución habitacional en curso, estado mejor que lo relevado → bajan). Porcentaje entre -15 y +15. Si no hay factores, ajuste = null. Inundación y desalojo YA son campos de la tabla, no van como ajuste.
- "explicacion": texto breve en español simple sobre qué campos pesaron más y por qué.

Respondé SOLO con un objeto JSON válido, sin texto adicional ni markdown, con esta forma exacta:
{
  "campos": {
    "<clave>": { "valor": "..." | "", "evidencia": "...", "confianza": "alta|media|baja", "dudoso": true|false, "motivoDuda": "..." }
  },
  "ajuste": { "porcentaje": number, "motivo": "...", "evidencia": "..." } | null,
  "explicacion": "..."
}
Incluí TODAS estas claves de campo (con valor real o vacío según corresponda): ${CAMPOS_FICHA.map((c) => c.clave).join(", ")}.`;

type RespuestaClaude = {
  campos: Record<string, Partial<CampoFicha>>;
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
export async function completarFicha(
  fotosUrls: string[],
  transcripcion: string
): Promise<RespuestaClaude> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno ANTHROPIC_API_KEY en Convex.");
  }
  const modelo = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";

  // Cada foto va precedida de su número, solo para poder citarla ("foto N").
  // El número no dice nada de lo que muestra: las fotos llegan sin orden.
  const imagenes = await Promise.all(fotosUrls.map((url, i) => descargarImagen(url, i)));
  const bloquesImagen = imagenes.flatMap(({ base64, mediaType }, i) => [
    { type: "text" as const, text: `foto ${i + 1}:` },
    {
      type: "image" as const,
      source: { type: "base64" as const, media_type: mediaType, data: base64 },
    },
  ]);

  const textoUsuario = `Catálogo de campos y sus valores válidos:\n${catalogoParaPrompt()}\n\nRecibiste ${fotosUrls.length} foto(s) de la vivienda, sin orden ni títulos. Analizalas todas juntas.\n\nTranscripción de los audios del voluntario:\n"""\n${transcripcion || "(sin audio o transcripción vacía)"}\n"""\n\nCompletá la ficha siguiendo las reglas.`;

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
        // Margen amplio para que la ficha completa no se corte por longitud.
        max_tokens: 8000,
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
    campos: (json.campos ?? {}) as Record<string, Partial<CampoFicha>>,
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

// Normaliza la respuesta de la IA al shape exacto del schema. Completa con lo
// que la IA aportó; lo que no tenga valor válido queda SIN dato (valor "",
// dudoso) en vez de inventar un valor.
export function normalizarCampos(
  campos: Record<string, Partial<CampoFicha>>
): Record<string, CampoFicha> {
  const salida: Record<string, CampoFicha> = {};
  for (const def of CAMPOS_FICHA) {
    const c = campos?.[def.clave] ?? {};
    const valorValido = def.opciones.some((o) => o.valor === c.valor);
    if (!valorValido) {
      // Sin dato: no se mencionó ni se vio. No se inventa un valor.
      const motivo = typeof c.motivoDuda === "string" && c.motivoDuda.trim();
      salida[def.clave] = {
        valor: "",
        evidencia: "",
        confianza: "baja",
        dudoso: true,
        motivoDuda: motivo || "No se mencionó en el audio ni se ve en las fotos.",
      };
      continue;
    }

    const confianza: Confianza = (["alta", "media", "baja"] as const).includes(
      c.confianza as Confianza
    )
      ? (c.confianza as Confianza)
      : "baja";
    // La confianza baja siempre queda señalada para revisión.
    const dudoso = c.dudoso === true || confianza === "baja";
    const motivo = typeof c.motivoDuda === "string" ? c.motivoDuda.trim() : "";
    salida[def.clave] = {
      valor: c.valor as string,
      evidencia: typeof c.evidencia === "string" ? c.evidencia : "",
      confianza,
      dudoso,
      motivoDuda: dudoso ? motivo || "La IA no encontró evidencia clara." : "",
    };
  }
  return salida;
}

// 3) Orquesta todo: transcribe, completa la ficha y la guarda en el caso.
// Usa TODO lo que tiene el caso: sus fotos actuales y todos sus audios (el
// primero y los que se agregaron cuando faltaban datos). Solo transcribe los
// audios que todavía no tienen transcripción.
export const procesarVisita = action({
  args: {
    casoId: v.id("casos"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    ok: boolean;
    transcripcion: string;
    transcripcionFallo: boolean;
    campos: Record<string, CampoFicha>;
    faltanDatos: boolean;
    ajuste: Ajuste;
    explicacion: string;
  }> => {
    // Solo usuarios autenticados pueden gastar créditos de IA.
    const identidad = await ctx.auth.getUserIdentity();
    if (!identidad) {
      throw new Error("Necesitás iniciar sesión para procesar una visita.");
    }

    const caso = await ctx.runQuery(api.casos.obtenerCaso, { casoId: args.casoId });
    if (!caso) throw new Error("El caso no existe.");

    // Resuelve storage IDs a URLs servibles.
    const fotosUrls: string[] = [];
    for (const id of caso.fotos) {
      const url = await ctx.storage.getUrl(id as Id<"_storage">);
      if (url) fotosUrls.push(url);
    }
    if (fotosUrls.length === 0) {
      throw new Error("El caso no tiene fotos accesibles.");
    }

    // Paso 1: transcribir los audios nuevos. Si uno falla, se sigue con lo que
    // haya (el resto de los audios y las fotos) y se reintenta la próxima vez.
    let transcripcion = caso.audioTranscripcion ?? "";
    let transcripcionFallo = false;
    const yaTranscriptos = new Set((caso.transcripciones ?? []).map((t) => t.audioStorageId));
    const audios = [caso.audioStorageId, ...(caso.audiosExtra ?? [])].filter(
      (id): id is string => !!id
    );
    for (const audioId of audios) {
      if (yaTranscriptos.has(audioId)) continue;
      const audioUrl = await ctx.storage.getUrl(audioId as Id<"_storage">);
      if (!audioUrl) continue;
      try {
        const texto = await transcribirAudio(audioUrl);
        transcripcion = await ctx.runMutation(api.casos.guardarTranscripcion, {
          casoId: args.casoId,
          audioStorageId: audioId,
          transcripcion: texto,
        });
      } catch (err) {
        // Degradación: la ficha se completa igual con lo que haya.
        console.error("Transcripción falló, se sigue con lo que hay:", err);
        transcripcionFallo = true;
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
      faltanDatos: faltanDatos(campos),
      ajuste: respuesta.ajuste,
      explicacion: respuesta.explicacion,
    };
  },
});
