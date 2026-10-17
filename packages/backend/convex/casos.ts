import { v } from "convex/values";

import { authComponent } from "./auth";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  CAMPOS_FICHA,
  CLAVES_CAMPO,
  calcularPuntajeBase,
  calcularPuntajeTabla,
} from "./ficha";

// ─────────────────────────────────────────────────────────────
// CASOS — carga de archivos, creación y actualización de fichas.
// Los datos son sensibles (salud, menores): todo exige sesión.
// ─────────────────────────────────────────────────────────────

// Exige una sesión y devuelve el id del usuario autenticado.
async function requerirUsuario(ctx: QueryCtx | MutationCtx): Promise<string> {
  const usuario = await authComponent.safeGetAuthUser(ctx);
  if (!usuario) {
    throw new Error("Necesitás iniciar sesión.");
  }
  return usuario._id;
}

// Validador reutilizable de un campo de la ficha.
const campoValidator = v.object({
  valor: v.string(),
  evidencia: v.string(),
  confianza: v.union(v.literal("alta"), v.literal("media"), v.literal("baja")),
  aConfirmar: v.boolean(),
});

// Objeto con los 18 campos de la ficha (tabla de Cireneos).
const camposValidator = v.object({
  // 1. Materialidad
  pared: campoValidator,
  techo: campoValidator,
  piso: campoValidator,
  bano: campoValidator,
  // 2. Habitabilidad
  m2PorPersona: campoValidator,
  ventanas: campoValidator,
  separacionAmbientes: campoValidator,
  // 3. Seguridad y salubridad
  riesgoDerrumbe: campoValidator,
  inundable: campoValidator,
  // 4. Salud y familia
  enfermedad: campoValidator,
  menoresDe5: campoValidator,
  menores5a12: campoValidator,
  menores12a18: campoValidator,
  monoparental: campoValidator,
  // 5. Dimensión social
  vinculoOrganizacion: campoValidator,
  impresionPrimeraVisita: campoValidator,
  desalojo: campoValidator,
  adicionales: campoValidator,
});

// 1) URL temporal para subir un archivo (foto o audio) al storage de Convex.
export const generarUrlDeSubida = mutation({
  args: {},
  handler: async (ctx) => {
    await requerirUsuario(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// 2) Crea un caso inicial con las fotos, el audio y el consentimiento.
//    Queda en estado "relevado" a la espera del procesamiento de la IA.
export const crearCaso = mutation({
  args: {
    consentimiento: v.boolean(),
    fotos: v.array(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const usuarioId = await requerirUsuario(ctx);

    if (!args.consentimiento) {
      throw new Error("No se puede crear un caso sin el consentimiento de la familia.");
    }
    if (args.fotos.length < 5 || args.fotos.length > 6) {
      throw new Error("Hay que subir entre 5 y 6 fotos.");
    }

    const campoVacio = {
      valor: "",
      evidencia: "",
      confianza: "baja" as const,
      aConfirmar: true,
    };

    // Inicializa los 18 campos de la ficha vacíos (a confirmar).
    const camposVacios = Object.fromEntries(
      CLAVES_CAMPO.map((clave) => [clave, campoVacio])
    ) as Record<string, typeof campoVacio>;

    const casoId = await ctx.db.insert("casos", {
      estado: "relevado",
      consentimiento: args.consentimiento,
      fotos: args.fotos,
      audioStorageId: args.audioStorageId,
      ...(camposVacios as any),
      relevadoEn: Date.now(),
      creadoPor: usuarioId,
    });

    return casoId;
  },
});

// 3) Lee un caso por id (para la pantalla de corrección). Solo su autor.
export const obtenerCaso = query({
  args: { casoId: v.id("casos") },
  handler: async (ctx, { casoId }) => {
    const usuarioId = await requerirUsuario(ctx);
    const caso = await ctx.db.get(casoId);
    if (!caso) return null;
    if (caso.creadoPor && caso.creadoPor !== usuarioId) {
      throw new Error("No tenés permiso para ver este caso.");
    }
    return caso;
  },
});

// 4) Guarda la transcripción del audio en el caso.
export const guardarTranscripcion = mutation({
  args: { casoId: v.id("casos"), transcripcion: v.string() },
  handler: async (ctx, { casoId, transcripcion }) => {
    await requerirUsuario(ctx);
    await ctx.db.patch(casoId, { audioTranscripcion: transcripcion });
  },
});

// 5) Guarda la ficha completada por la IA (campos + ajuste + explicación)
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
    await requerirUsuario(ctx);

    const puntajeTabla = calcularPuntajeTabla(args.campos as any);
    const puntajeBase = calcularPuntajeBase(args.campos as any);

    await ctx.db.patch(args.casoId, {
      ...args.campos,
      puntajeTabla,
      puntajeBase,
      ajustePorcentaje: args.ajustePorcentaje,
      ajusteMotivo: args.ajusteMotivo,
      ajusteEvidencia: args.ajusteEvidencia,
      ajusteEstado: args.ajustePorcentaje != null ? "sugerido" : undefined,
      explicacion: args.explicacion,
    });
  },
});

// 6) Guarda las correcciones del voluntario. Si ya no queda ningún campo
//    "a confirmar", el caso pasa a "confirmado" y recalcula el puntaje base.
export const guardarCorreccion = mutation({
  args: {
    casoId: v.id("casos"),
    campos: camposValidator,
  },
  handler: async (ctx, { casoId, campos }) => {
    const usuarioId = await requerirUsuario(ctx);

    const caso = await ctx.db.get(casoId);
    if (!caso) throw new Error("El caso no existe.");
    if (caso.creadoPor && caso.creadoPor !== usuarioId) {
      throw new Error("No tenés permiso para editar este caso.");
    }

    const quedaAlgoAConfirmar = CAMPOS_FICHA.some(
      (def) => (campos as any)[def.clave]?.aConfirmar === true
    );

    const puntajeTabla = calcularPuntajeTabla(campos as any);
    const puntajeBase = calcularPuntajeBase(campos as any);

    await ctx.db.patch(casoId, {
      ...campos,
      puntajeTabla,
      puntajeBase,
      estado: quedaAlgoAConfirmar ? "relevado" : "confirmado",
    });

    return { confirmado: !quedaAlgoAConfirmar };
  },
});
