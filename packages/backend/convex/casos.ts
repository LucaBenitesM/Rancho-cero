import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { CAMPOS_FICHA, calcularPuntajeBase } from "./ficha";

// ─────────────────────────────────────────────────────────────
// CASOS — carga de archivos, creación y actualización de fichas.
// ─────────────────────────────────────────────────────────────

// Validador reutilizable de un campo de la ficha.
const campoValidator = v.object({
  valor: v.string(),
  evidencia: v.string(),
  confianza: v.union(v.literal("alta"), v.literal("media"), v.literal("baja")),
  aConfirmar: v.boolean(),
});

// Objeto con los 13 campos de la ficha (vivienda + familia).
const camposValidator = v.object({
  techo: campoValidator,
  paredes: campoValidator,
  piso: campoValidator,
  humedad: campoValidator,
  riesgoElectrico: campoValidator,
  bano: campoValidator,
  agua: campoValidator,
  integrantes: campoValidator,
  menores: campoValidator,
  mayores: campoValidator,
  discapacidad: campoValidator,
  enfermedadGrave: campoValidator,
  embarazo: campoValidator,
});

// 1) URL temporal para subir un archivo (foto o audio) al storage de Convex.
export const generarUrlDeSubida = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// 2) Resuelve storage IDs a URLs servibles (para previsualizar fotos/audio).
export const urlsDeArchivos = query({
  args: { storageIds: v.array(v.string()) },
  handler: async (ctx, { storageIds }) => {
    const urls = await Promise.all(
      storageIds.map(async (id) => ({
        storageId: id,
        url: await ctx.storage.getUrl(id as any),
      }))
    );
    return urls;
  },
});

// 3) Crea un caso inicial con las fotos, el audio y el consentimiento.
//    Queda en estado "relevado" a la espera del procesamiento de la IA.
export const crearCaso = mutation({
  args: {
    consentimiento: v.boolean(),
    fotos: v.array(v.string()),
    audioStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.consentimiento) {
      throw new Error("No se puede crear un caso sin el consentimiento de la familia.");
    }
    if (args.fotos.length < 1) {
      throw new Error("Hay que subir al menos una foto.");
    }

    const campoVacio = {
      valor: "",
      evidencia: "",
      confianza: "baja" as const,
      aConfirmar: true,
    };

    const casoId = await ctx.db.insert("casos", {
      estado: "relevado",
      consentimiento: args.consentimiento,
      fotos: args.fotos,
      audioStorageId: args.audioStorageId,
      techo: campoVacio,
      paredes: campoVacio,
      piso: campoVacio,
      humedad: campoVacio,
      riesgoElectrico: campoVacio,
      bano: campoVacio,
      agua: campoVacio,
      integrantes: campoVacio,
      menores: campoVacio,
      mayores: campoVacio,
      discapacidad: campoVacio,
      enfermedadGrave: campoVacio,
      embarazo: campoVacio,
      relevadoEn: Date.now(),
    });

    return casoId;
  },
});

// 4) Lee un caso por id (para la pantalla de corrección).
export const obtenerCaso = query({
  args: { casoId: v.id("casos") },
  handler: async (ctx, { casoId }) => {
    return await ctx.db.get(casoId);
  },
});

// 5) Guarda la transcripción del audio en el caso.
export const guardarTranscripcion = mutation({
  args: { casoId: v.id("casos"), transcripcion: v.string() },
  handler: async (ctx, { casoId, transcripcion }) => {
    await ctx.db.patch(casoId, { audioTranscripcion: transcripcion });
  },
});

// 6) Guarda la ficha completada por la IA (campos + ajuste + explicación)
//    y calcula el puntaje base. La ejecuta la action tras llamar a Claude.
export const guardarFichaIA = mutation({
  args: {
    casoId: v.id("casos"),
    campos: camposValidator,
    ajustePorcentaje: v.optional(v.number()),
    ajusteMotivo: v.optional(v.string()),
    ajusteEvidencia: v.optional(v.string()),
    explicacion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const puntajeBase = calcularPuntajeBase(args.campos as any);

    await ctx.db.patch(args.casoId, {
      ...args.campos,
      puntajeBase,
      ajustePorcentaje: args.ajustePorcentaje,
      ajusteMotivo: args.ajusteMotivo,
      ajusteEvidencia: args.ajusteEvidencia,
      ajusteEstado: args.ajustePorcentaje != null ? "sugerido" : undefined,
      explicacion: args.explicacion,
    });
  },
});

// 7) Guarda las correcciones del voluntario. Si ya no queda ningún campo
//    "a confirmar", el caso pasa a "confirmado" y recalcula el puntaje base.
export const guardarCorreccion = mutation({
  args: {
    casoId: v.id("casos"),
    campos: camposValidator,
  },
  handler: async (ctx, { casoId, campos }) => {
    const quedaAlgoAConfirmar = CAMPOS_FICHA.some(
      (def) => (campos as any)[def.clave]?.aConfirmar === true
    );

    const puntajeBase = calcularPuntajeBase(campos as any);

    await ctx.db.patch(casoId, {
      ...campos,
      puntajeBase,
      estado: quedaAlgoAConfirmar ? "relevado" : "confirmado",
    });

    return { confirmado: !quedaAlgoAConfirmar };
  },
});
