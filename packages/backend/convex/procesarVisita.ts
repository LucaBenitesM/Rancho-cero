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

const MIME_POR_DEFECTO = "image/jpeg";

function mimeDesdeUrl(url: string): string {
  const limpio = url.split("?")[0].toLowerCase();
  if (limpio.endsWith(".png")) return "image/png";
  if (limpio.endsWith(".webp")) return "image/webp";
  if (limpio.endsWith(".gif")) return "image/gif";
  return MIME_POR_DEFECTO;
}

// 1) Transcribe el audio con ElevenLabs Scribe.
async function transcribirAudio(audioUrl: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno ELEVENLABS_API_KEY en Convex.");
  }

  const audioResp = await fetch(audioUrl);
  if (!audioResp.ok) {
    throw new Error("No se pudo descargar el audio del storage.");
  }
  const audioBlob = await audioResp.blob();

  const form = new FormData();
  form.append("file", audioBlob, "audio.webm");
  form.append("model_id", process.env.ELEVENLABS_STT_MODEL ?? "scribe_v1");

  const resp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });

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

const PROMPT_SISTEMA = `Sos un asistente que arma fichas de relevamiento de viviendas precarias para la ONG Rancho Cero (Cireneos, Uruguay). La IA propone, las personas deciden.

Reglas estrictas:
- Para cada campo elegís UN valor de su lista cerrada. Nunca inventás valores.
- Cada campo trae su evidencia: "foto N: lo que se ve" o una cita textual del audio.
- Confianza "alta" = evidencia directa y clara. "media" = parcial o indirecta. "baja" = inferencia sin evidencia.
- "aConfirmar" = true cuando la confianza es baja, no hay evidencia, o la foto y el audio se contradicen.
- Los campos de FAMILIA (integrantes, menores, mayores, discapacidad, enfermedadGrave, embarazo) salen SOLO del audio. Nunca se infieren de las fotos. Si el audio no los menciona, aConfirmar=true.
- Salud (discapacidad, enfermedad, embarazo): nunca inferir. Si no se mencionan, aConfirmar=true. Nunca guardar el diagnóstico exacto.
- Si no hay información para un campo, igual elegí el valor más plausible pero marcá aConfirmar=true y confianza "baja".
- El "ajuste" (opcional) refleja factores que la ficha NO contempla (violencia en el hogar, zona inundable, desalojo inminente, persona postrada → suben; solución habitacional en curso, estado mejor que lo relevado → bajan). Rango -15 a +15. Si no hay factores, ajuste = null.
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
  ajuste: { porcentaje: number; motivo: string; evidencia: string } | null;
  explicacion: string;
};

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

  // Descarga cada foto y la codifica en base64 para el bloque de imagen.
  const bloquesImagen = await Promise.all(
    fotosUrls.map(async (url, i) => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`No se pudo descargar la foto ${i + 1}.`);
      const buffer = await resp.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mimeDesdeUrl(url),
          data: base64,
        },
      };
    })
  );

  const textoUsuario = `Catálogo de campos y sus valores válidos:\n${catalogoParaPrompt()}\n\nLas fotos están numeradas en orden (foto 1, foto 2, ...).\n\nTranscripción del audio del voluntario:\n"""\n${transcripcion || "(sin audio o transcripción vacía)"}\n"""\n\nCompletá la ficha siguiendo las reglas.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 2048,
      system: PROMPT_SISTEMA,
      messages: [
        {
          role: "user",
          content: [...bloquesImagen, { type: "text", text: textoUsuario }],
        },
      ],
    }),
  });

  if (!resp.ok) {
    const detalle = await resp.text();
    throw new Error(`Anthropic devolvió ${resp.status}: ${detalle}`);
  }

  const data = (await resp.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  const texto = data.content.find((b) => b.type === "text")?.text ?? "";
  const json = extraerJson(texto);
  return json as RespuestaClaude;
}

// Extrae el primer objeto JSON del texto (por si viene con texto o ```json).
function extraerJson(texto: string): unknown {
  const sinCerca = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
  const inicio = sinCerca.indexOf("{");
  const fin = sinCerca.lastIndexOf("}");
  if (inicio === -1 || fin === -1) {
    throw new Error("Claude no devolvió un JSON reconocible.");
  }
  return JSON.parse(sinCerca.slice(inicio, fin + 1));
}

// Normaliza la respuesta de la IA al shape exacto del schema.
function normalizarCampos(
  campos: Record<string, CampoIA>
): Record<string, CampoIA> {
  const salida: Record<string, CampoIA> = {};
  for (const def of CAMPOS_FICHA) {
    const c = campos?.[def.clave];
    const valorValido = def.opciones.some((o) => o.valor === c?.valor);
    salida[def.clave] = {
      valor: valorValido ? c!.valor : def.opciones[0].valor,
      evidencia: c?.evidencia ?? "",
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
    fotos: v.array(v.string()),
    audioStorageId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    ok: boolean;
    transcripcion: string;
    campos: Record<string, CampoIA>;
    ajuste: { porcentaje: number; motivo: string; evidencia: string } | null;
    explicacion: string;
  }> => {
    // Resuelve storage IDs a URLs servibles.
    const fotosUrls: string[] = [];
    for (const id of args.fotos) {
      const url = await ctx.storage.getUrl(id as any);
      if (url) fotosUrls.push(url);
    }
    if (fotosUrls.length === 0) {
      throw new Error("El caso no tiene fotos accesibles.");
    }

    // Paso 1: transcripción (si hay audio).
    let transcripcion = "";
    if (args.audioStorageId) {
      const audioUrl = await ctx.storage.getUrl(args.audioStorageId as any);
      if (audioUrl) {
        transcripcion = await transcribirAudio(audioUrl);
        await ctx.runMutation(api.casos.guardarTranscripcion, {
          casoId: args.casoId,
          transcripcion,
        });
      }
    }

    // Paso 2: Claude completa la ficha.
    const respuesta = await completarFicha(fotosUrls, transcripcion);
    const campos = normalizarCampos(respuesta.campos ?? {});

    // Paso 3: guardar en Convex (calcula puntaje base).
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
      campos,
      ajuste: respuesta.ajuste ?? null,
      explicacion: respuesta.explicacion ?? "",
    };
  },
});
