// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Historias anónimas (PLAN.md, llamadas 2 y 3)
//
//   ficha del caso  --Claude-->  historia anónima (3 a 5 frases)
//   historia        --Claude-->  alertas de privacidad (texto + sugerencia)
//
// La IA propone, el coordinador decide: cada historia generada queda como
// borrador hasta que un coordinador la aprueba ("Aprobar historia").
// Las historias son de uso interno: Cireneos decide si las publica en su
// propia web (las copia o las descarga desde /historias).
//
// A Claude solo le llegan los VALORES de la ficha (categorías cerradas),
// nunca el alias, el barrio ni la transcripción del audio.
//
// Variables de entorno de Convex: ANTHROPIC_API_KEY y, opcional, ANTHROPIC_MODEL
// (si falta, se usa MODELO_POR_DEFECTO).
// ─────────────────────────────────────────────────────────────

import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { authComponent } from "./auth";
import { extraerAjuste, extraerCampos, requerirUsuario } from "./casos";
import { requerirCoordinador } from "./roles";
import { CLAVES_CAMPO, definicionDe } from "./ficha";
import { calcularUrgencia } from "./urgencia";

export type AlertaPrivacidad = { texto: string; motivo: string; sugerencia: string };

const alertaValidator = v.object({
  texto: v.string(),
  motivo: v.string(),
  sugerencia: v.string(),
});

const MAX_LARGO_HISTORIA = 2000;

const MODELO_POR_DEFECTO = "claude-sonnet-5-5";

// Solo coordinadores generan, editan y aprueban historias; los voluntarios
// solo las ven y las copian. La verificación de rol vive en ./roles
// (requerirCoordinador), que se importa arriba.

// ─── Llamada a Claude ────────────────────────────────────────

// Llama a la API de Claude y devuelve el JSON de la respuesta. Timeout de 60s.
async function pedirJsonAClaude(sistema: string, usuario: string): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno ANTHROPIC_API_KEY en Convex.");
  }
  const modelo = process.env.ANTHROPIC_MODEL?.trim() || MODELO_POR_DEFECTO;

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

const PROMPT_HISTORIA = `Escribís historias anónimas para Rancho Cero, el programa de vivienda de Cireneos (Uruguay). Cireneos puede publicar estas historias en su propia web para contar, con respeto, la realidad de las familias que acompaña.

A partir de la ficha de relevamiento de una familia, escribí una historia anónima y digna:
- Entre 3 y 5 frases, en español rioplatense neutro.
- Con respeto: sin dramatizar, sin dar lástima, sin adjetivos exagerados. Hablá de la familia como protagonista, no como víctima.
- Contá cómo vive hoy la familia y qué necesita, con hechos concretos de la ficha (techo, piso, baño, espacio, riesgos, desalojo).
- Podés cerrar con una frase sobre lo que cambia tener una casa firme.
- No pidas dinero ni donaciones, no menciones montos ni costos.

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

const PROMPT_PRIVACIDAD = `Revisás la privacidad de historias anónimas que Cireneos, una ONG de vivienda de Uruguay, puede publicar en su web. La historia NO puede permitir identificar a la familia.

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

/** Guarda una historia recién generada como borrador (uso interno de `generar`). */
export const guardarBorrador = internalMutation({
  args: { casoId: v.id("casos"), texto: v.string(), alertas: v.array(alertaValidator) },
  handler: async (ctx, { casoId, texto, alertas }): Promise<Id<"historias">> => {
    await requerirCoordinador(ctx);
    return await ctx.db.insert("historias", {
      casoId,
      textoOriginal: texto,
      aprobada: false,
      alertasPrivacidad: alertas,
    });
  },
});

/** Genera una historia nueva a partir de la ficha, la revisa y la guarda como borrador. */
export const generar = action({
  args: { casoId: v.id("casos") },
  handler: async (
    ctx,
    { casoId }
  ): Promise<{ historiaId: Id<"historias">; texto: string; alertas: AlertaPrivacidad[] }> => {
    await requerirCoordinador(ctx, "Solo los coordinadores pueden generar historias.");

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
    const historiaId = await ctx.runMutation(internal.historias.guardarBorrador, {
      casoId,
      texto,
      alertas,
    });
    return { historiaId, texto, alertas };
  },
});

/** Revisa la privacidad de una historia (por ejemplo, después de editarla). */
export const revisarPrivacidad = action({
  args: { texto: v.string() },
  handler: async (ctx, { texto }): Promise<{ alertas: AlertaPrivacidad[] }> => {
    await requerirCoordinador(ctx, "Solo los coordinadores pueden editar historias.");
    const limpio = texto.trim();
    if (!limpio) throw new Error("La historia está vacía.");
    if (limpio.length > MAX_LARGO_HISTORIA) throw new Error("La historia es demasiado larga.");
    return { alertas: await revisarTexto(limpio) };
  },
});

/** Datos de la pantalla "Aprobar historia": el caso, la última aprobada y el
 *  borrador pendiente (si hay uno más nuevo que la aprobada). */
export const obtenerParaAprobar = query({
  args: { casoId: v.id("casos") },
  handler: async (ctx, { casoId }) => {
    await requerirCoordinador(ctx, "Solo los coordinadores pueden aprobar historias.");
    const caso = await ctx.db.get(casoId);
    if (!caso) return null;

    // De la más nueva a la más vieja.
    const historias = await ctx.db
      .query("historias")
      .withIndex("por_caso", (q) => q.eq("casoId", casoId))
      .order("desc")
      .collect();
    const aprobada = historias.find((h) => h.aprobada);
    const borrador = historias[0] && !historias[0].aprobada ? historias[0] : undefined;

    return {
      alias: caso.alias ?? "Familia",
      barrio: caso.barrio ?? "—",
      estado: caso.estado,
      aprobada: aprobada
        ? {
            texto: aprobada.textoRevisado ?? aprobada.textoOriginal,
            aprobadaEn: aprobada.aprobadaEn,
          }
        : null,
      borrador: borrador
        ? {
            historiaId: borrador._id,
            texto: borrador.textoOriginal,
            alertas: borrador.alertasPrivacidad ?? [],
          }
        : null,
    };
  },
});

/** Aprueba un borrador: guarda la versión final, quién la aprobó y cuándo.
 *  No publica nada ni toca campañas: Cireneos decide si la usa en su web. */
export const aprobar = mutation({
  args: {
    historiaId: v.id("historias"),
    texto: v.string(), // la versión final aprobada por el coordinador
    alertas: v.array(alertaValidator), // alertas vistas al aprobar
  },
  handler: async (ctx, args) => {
    await requerirCoordinador(ctx, "Solo los coordinadores pueden aprobar historias.");
    const usuarioId = await requerirUsuario(ctx);
    const historia = await ctx.db.get(args.historiaId);
    if (!historia) throw new Error("La historia no existe.");
    const caso = await ctx.db.get(historia.casoId);
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

    await ctx.db.patch(args.historiaId, {
      textoRevisado: texto, // textoOriginal queda como lo escribió la IA
      aprobada: true,
      alertasPrivacidad: args.alertas,
      aprobadaPor: usuarioId,
      aprobadaEn: Date.now(),
    });
    return { historiaId: args.historiaId };
  },
});

/** Pantalla /historias: todas las historias agrupadas por familia, de la
 *  familia más urgente a la menos urgente. Voluntarios y coordinadores. */
export const listar = query({
  args: {},
  handler: async (ctx) => {
    await requerirUsuario(ctx);
    // De la más nueva a la más vieja.
    const historias = await ctx.db.query("historias").order("desc").collect();

    const porCaso = new Map<Id<"casos">, typeof historias>();
    for (const h of historias) {
      const lista = porCaso.get(h.casoId) ?? [];
      lista.push(h);
      porCaso.set(h.casoId, lista);
    }

    // Nombre de quien aprobó (se busca una sola vez por usuario).
    const nombres = new Map<string, string>();
    async function nombreDe(usuarioId: string): Promise<string> {
      const guardado = nombres.get(usuarioId);
      if (guardado) return guardado;
      let nombre = "Equipo";
      try {
        const usuario = await authComponent.getAnyUserById(ctx, usuarioId);
        nombre = usuario?.name || usuario?.email || nombre;
      } catch {
        // Usuario borrado o id viejo: queda "Equipo".
      }
      nombres.set(usuarioId, nombre);
      return nombre;
    }

    const ahora = Date.now();
    const familias = [];
    for (const [casoId, lista] of porCaso) {
      const caso = await ctx.db.get(casoId);
      if (!caso) continue;
      const r = calcularUrgencia(extraerCampos(caso), caso.relevadoEn, ahora, extraerAjuste(caso));
      const filas = [];
      for (const h of lista) {
        filas.push({
          id: h._id,
          texto: h.aprobada ? (h.textoRevisado ?? h.textoOriginal) : h.textoOriginal,
          aprobada: h.aprobada,
          // Aprobada: fecha de aprobación. Borrador: cuándo se generó.
          fecha: h.aprobada && h.aprobadaEn ? h.aprobadaEn : h._creationTime,
          aprobadaPor: h.aprobada && h.aprobadaPor ? await nombreDe(h.aprobadaPor) : null,
        });
      }
      familias.push({
        casoId,
        alias: caso.alias ?? "Familia",
        puntajeFinal: r.puntajeFinal,
        historias: filas,
      });
    }

    familias.sort((a, b) => b.puntajeFinal - a.puntajeFinal);
    return familias;
  },
});
