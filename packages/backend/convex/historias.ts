// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Historia para donantes (PLAN.md, llamadas 2 y 3)
//
//   ficha del caso  --Claude-->  historia anónima (3 a 5 frases)
//   historia        --Claude-->  alertas de privacidad (texto + sugerencia)
//
// La IA propone, el coordinador decide: nada se publica hasta que alguien
// con sesión aprueba la historia ("Aprobar y publicar").
//
// A Claude solo le llegan los VALORES de la ficha (categorías cerradas),
// nunca el alias, el barrio ni la transcripción del audio.
//
// Variables de entorno de Convex: ANTHROPIC_API_KEY y ANTHROPIC_MODEL.
// ─────────────────────────────────────────────────────────────

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { requerirUsuario } from "./casos";
import { requerirCoordinador } from "./roles";
import { CLAVES_CAMPO, definicionDe } from "./ficha";
import { META_CASA } from "./urgencia";

export type AlertaPrivacidad = { texto: string; motivo: string; sugerencia: string };

const alertaValidator = v.object({
  texto: v.string(),
  motivo: v.string(),
  sugerencia: v.string(),
});

const MAX_LARGO_HISTORIA = 2000;

// ─── Llamada a Claude ────────────────────────────────────────

// Llama a la API de Claude y devuelve el JSON de la respuesta. Timeout de 60s.
async function pedirJsonAClaude(sistema: string, usuario: string): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno ANTHROPIC_API_KEY en Convex.");
  }
  const modelo = process.env.ANTHROPIC_MODEL;
  if (!modelo) {
    throw new Error("Falta la variable de entorno ANTHROPIC_MODEL en Convex.");
  }

  const controlador = new AbortController();
  const t = setTimeout(() => controlador.abort(), 60_000);
  let resp: Response;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 2000,
        system: sistema,
        messages: [{ role: "user", content: usuario }],
      }),
      signal: controlador.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("La llamada superó el tiempo límite de 60s.");
    }
    throw err;
  } finally {
    clearTimeout(t);
  }

  if (!resp.ok) {
    const detalle = await resp.text();
    throw new Error(`Anthropic devolvió ${resp.status}: ${detalle}`);
  }

  const data = (await resp.json()) as {
    stop_reason?: string;
    content: Array<{ type: string; text?: string }>;
  };
  if (data.stop_reason === "max_tokens") {
    throw new Error("La respuesta de la IA se cortó por longitud. Reintentá.");
  }

  const texto = data.content.find((b) => b.type === "text")?.text ?? "";
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

// ─── 1. Historia anónima ─────────────────────────────────────

const PROMPT_HISTORIA = `Escribís historias para donantes de Rancho Cero (Cireneos, Uruguay), que reemplaza viviendas precarias por casas container de US$ 15.000.

A partir de la ficha de relevamiento de una familia, escribí una historia anónima y digna:
- Entre 3 y 5 frases, en español.
- Con respeto: sin dramatizar, sin dar lástima, sin adjetivos exagerados. Hablá de la familia como protagonista, no como víctima.
- Explicá qué necesita la familia y por qué su casa es urgente, con hechos concretos de la ficha (techo, piso, baño, espacio, riesgos, desalojo).
- Podés cerrar con una frase sobre lo que cambia una casa firme, sin pedir dinero de forma insistente.

Privacidad (obligatorio):
- Nunca nombres, apellidos, alias, calles, números de casa, barrios, ciudades, escuelas ni lugares de trabajo.
- Nunca edades exactas: usá "niños pequeños", "en edad escolar", "adolescentes".
- Nunca diagnósticos ni enfermedades concretas: como mucho "una persona con un problema de salud".
- No describas caras ni rasgos físicos de nadie.
- No inventes datos que no estén en la ficha.

Respondé SOLO con un objeto JSON válido, sin texto adicional ni markdown:
{ "historia": "..." }`;

// Ficha en texto legible (solo categorías cerradas, sin datos personales).
function fichaParaPrompt(campos: Record<string, string>, ajusteMotivo?: string): string {
  const lineas = CLAVES_CAMPO.filter((clave) => campos[clave]).map((clave) => {
    const def = definicionDe(clave);
    const etiqueta = def?.etiqueta ?? clave;
    const descripcion =
      def?.opciones.find((o) => o.valor === campos[clave])?.descripcion ?? campos[clave];
    return `- ${etiqueta}: ${descripcion}`;
  });
  if (ajusteMotivo) {
    lineas.push(`- Factor adicional de urgencia (aceptado por el coordinador): ${ajusteMotivo}`);
  }
  return lineas.join("\n");
}

// ─── 2. Revisión de privacidad ───────────────────────────────

const PROMPT_PRIVACIDAD = `Revisás la privacidad de historias públicas para donantes de una ONG de vivienda en Uruguay. La historia NO puede permitir identificar a la familia.

Marcá cada fragmento que contenga alguno de estos datos:
- nombres o apellidos (de cualquier persona)
- calles, direcciones, números de casa, barrios, ciudades o lugares reconocibles
- escuelas, liceos, lugares de trabajo u otras instituciones concretas
- diagnósticos médicos exactos o enfermedades concretas
- edades exactas
- rasgos físicos o descripciones de caras
- cualquier otro detalle tan específico que alguien del barrio pudiera reconocer a la familia

No marques datos genéricos como "niños pequeños", "adolescentes", "una persona con un problema de salud", "el techo se llueve" o "la casa se inunda".

Para cada alerta:
- "texto": el fragmento problemático, copiado EXACTAMENTE como aparece en la historia (lo más corto posible).
- "motivo": qué tipo de dato es, en pocas palabras (ej. "edad exacta").
- "sugerencia": el texto con el que conviene reemplazar ese fragmento, listo para pegar.

Respondé SOLO con un objeto JSON válido, sin texto adicional ni markdown:
{ "alertas": [ { "texto": "...", "motivo": "...", "sugerencia": "..." } ] }
Si no hay nada que marcar: { "alertas": [] }`;

async function revisarTexto(historia: string): Promise<AlertaPrivacidad[]> {
  const json = (await pedirJsonAClaude(
    PROMPT_PRIVACIDAD,
    `Historia a revisar:\n"""\n${historia}\n"""`
  )) as { alertas?: unknown };
  if (!Array.isArray(json.alertas)) return [];
  return json.alertas
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a) => ({
      texto: typeof a.texto === "string" ? a.texto.trim() : "",
      motivo: typeof a.motivo === "string" ? a.motivo.trim() : "",
      sugerencia: typeof a.sugerencia === "string" ? a.sugerencia.trim() : "",
    }))
    .filter((a) => a.texto.length > 0);
}

// ─── Funciones de Convex ─────────────────────────────────────

/** Datos de la ficha que se le pasan a Claude (uso interno de las acciones). */
export const datosParaHistoria = internalQuery({
  args: { casoId: v.id("casos") },
  handler: async (ctx, { casoId }) => {
    const caso = await ctx.db.get(casoId);
    if (!caso) return null;
    const campos: Record<string, string> = {};
    for (const clave of CLAVES_CAMPO) {
      const c = (caso as unknown as Record<string, { valor?: string } | undefined>)[clave];
      if (c?.valor) campos[clave] = c.valor;
    }
    return {
      estado: caso.estado,
      campos,
      ajusteMotivo: caso.ajusteEstado === "aceptado" ? caso.ajusteMotivo : undefined,
    };
  },
});

/** Genera una historia nueva a partir de la ficha y la revisa. No guarda nada. */
export const generar = action({
  args: { casoId: v.id("casos") },
  handler: async (ctx, { casoId }): Promise<{ texto: string; alertas: AlertaPrivacidad[] }> => {
    await requerirCoordinador(ctx, "Solo los coordinadores pueden generar historias.");
    const identidad = await ctx.auth.getUserIdentity();
    if (!identidad) throw new Error("Necesitás iniciar sesión.");

    const datos = await ctx.runQuery(internal.historias.datosParaHistoria, { casoId });
    if (!datos) throw new Error("El caso no existe.");
    if (datos.estado === "relevado") {
      throw new Error("Primero hay que revisar y guardar la ficha del caso.");
    }

    const json = (await pedirJsonAClaude(
      PROMPT_HISTORIA,
      `Ficha de relevamiento:\n${fichaParaPrompt(datos.campos, datos.ajusteMotivo)}\n\nEscribí la historia.`
    )) as { historia?: unknown };
    const texto = typeof json.historia === "string" ? json.historia.trim() : "";
    if (!texto) throw new Error("La IA no devolvió una historia. Reintentá.");

    const alertas = await revisarTexto(texto);
    return { texto, alertas };
  },
});

/** Revisa la privacidad de una historia (por ejemplo, después de editarla). */
export const revisarPrivacidad = action({
  args: { texto: v.string() },
  handler: async (ctx, { texto }): Promise<{ alertas: AlertaPrivacidad[] }> => {
    await requerirCoordinador(ctx, "Solo los coordinadores pueden editar historias.");
    const identidad = await ctx.auth.getUserIdentity();
    if (!identidad) throw new Error("Necesitás iniciar sesión.");
    const limpio = texto.trim();
    if (!limpio) throw new Error("La historia está vacía.");
    if (limpio.length > MAX_LARGO_HISTORIA) throw new Error("La historia es demasiado larga.");
    return { alertas: await revisarTexto(limpio) };
  },
});

/** Datos de la pantalla "Aprobar historia": el caso y lo ya publicado. */
export const obtenerParaAprobar = query({
  args: { casoId: v.id("casos") },
  handler: async (ctx, { casoId }) => {
    await requerirCoordinador(ctx, "Solo los coordinadores pueden aprobar historias.");
    await requerirUsuario(ctx);
    const caso = await ctx.db.get(casoId);
    if (!caso) return null;

    const historia = await ctx.db
      .query("historias")
      .withIndex("por_caso", (q) => q.eq("casoId", casoId))
      .first();
    const campana = await ctx.db
      .query("campanas")
      .withIndex("por_caso", (q) => q.eq("casoId", casoId))
      .first();

    return {
      alias: caso.alias ?? "Familia",
      barrio: caso.barrio ?? "—",
      estado: caso.estado,
      publicada:
        historia && historia.aprobada
          ? {
              texto: historia.textoRevisado ?? historia.textoOriginal,
              aprobadaEn: historia.aprobadaEn,
            }
          : null,
      campana: campana
        ? { metaUsd: campana.metaUsd, recaudadoUsd: campana.recaudadoUsd, activa: campana.activa }
        : null,
    };
  },
});

/** Guarda la historia aprobada y crea o actualiza la campaña del caso. */
export const aprobarYPublicar = mutation({
  args: {
    casoId: v.id("casos"),
    textoOriginal: v.string(), // lo que escribió la IA
    texto: v.string(), // la versión final aprobada por el coordinador
    alertas: v.array(alertaValidator), // alertas vistas al aprobar
  },
  handler: async (ctx, args) => {
    await requerirCoordinador(ctx, "Solo los coordinadores pueden aprobar historias.");
    const usuarioId = await requerirUsuario(ctx);
    const caso = await ctx.db.get(args.casoId);
    if (!caso) throw new Error("El caso no existe.");
    if (!caso.consentimiento) {
      throw new Error("El caso no tiene el consentimiento de la familia.");
    }
    if (caso.estado === "relevado") {
      throw new Error("Primero hay que revisar y guardar la ficha del caso.");
    }
    const texto = args.texto.trim();
    if (!texto) throw new Error("La historia está vacía.");
    if (texto.length > MAX_LARGO_HISTORIA) throw new Error("La historia es demasiado larga.");

    const aprobacion = {
      textoOriginal: args.textoOriginal.trim() || texto,
      textoRevisado: texto, // es lo que muestra la página de campaña
      aprobada: true,
      alertasPrivacidad: args.alertas,
      aprobadaPor: usuarioId,
      aprobadaEn: Date.now(),
    };

    const historia = await ctx.db
      .query("historias")
      .withIndex("por_caso", (q) => q.eq("casoId", args.casoId))
      .first();
    let historiaId = historia?._id;
    if (historiaId) {
      await ctx.db.patch(historiaId, aprobacion);
    } else {
      historiaId = await ctx.db.insert("historias", { casoId: args.casoId, ...aprobacion });
    }

    const campana = await ctx.db
      .query("campanas")
      .withIndex("por_caso", (q) => q.eq("casoId", args.casoId))
      .first();
    // Si ya había campaña se conserva lo recaudado; solo cambia la historia.
    if (campana) {
      await ctx.db.patch(campana._id, { historiaId, metaUsd: META_CASA, activa: true });
    } else {
      await ctx.db.insert("campanas", {
        casoId: args.casoId,
        historiaId,
        metaUsd: META_CASA,
        recaudadoUsd: 0,
        activa: true,
      });
    }

    // No se retrocede un caso que ya está financiado o entregado.
    if (caso.estado === "confirmado") {
      await ctx.db.patch(args.casoId, { estado: "en_campana" });
    }

    return { historiaId };
  },
});
