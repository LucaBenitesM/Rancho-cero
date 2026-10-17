import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Esquema de datos (ver FICHA.md y PLAN.md)
//
// Principio: la IA propone, las personas deciden.
// Cada campo que detecta la IA trae: valor + evidencia + confianza.
// Lo dudoso queda "a_confirmar" y lo resuelve una persona.
// ─────────────────────────────────────────────────────────────

// Confianza de cada campo (señal de revisión, NO probabilidad).
const confianza = v.union(
  v.literal("alta"),
  v.literal("media"),
  v.literal("baja")
);

// Un campo detectado por la IA: valor + de dónde lo sacó + cuánto confiar.
const campo = v.object({
  valor: v.string(), // uno de la lista cerrada de FICHA.md
  evidencia: v.string(), // "foto 2: ..." o cita del audio
  confianza,
  aConfirmar: v.boolean(), // true = una persona debe resolverlo
});

// Estados de un caso (PLAN.md).
const estadoCaso = v.union(
  v.literal("relevado"), // recién generado por la IA
  v.literal("confirmado"), // sin campos a_confirmar; entra al ranking
  v.literal("en_campana"), // tiene campaña publicada
  v.literal("financiado"), // llegó a US$ 15.000
  v.literal("casa_entregada") // marcado a mano
);

export default defineSchema({
  // ─── CASOS (fichas de relevamiento) ───────────────────────
  casos: defineTable({
    estado: estadoCaso,
    consentimiento: v.boolean(), // obligatorio antes de cargar

    // Identidad anónima (sin nombres ni direcciones reales; ver PLAN.md)
    alias: v.optional(v.string()), // ej. "Familia A"
    barrio: v.optional(v.string()),

    // Entradas originales
    fotos: v.array(v.string()), // storage IDs de Convex
    audioStorageId: v.optional(v.string()),
    audioTranscripcion: v.optional(v.string()),

    // --- Vivienda (FICHA.md) ---
    techo: campo,
    paredes: campo,
    piso: campo,
    humedad: campo,
    riesgoElectrico: campo,
    bano: campo,
    agua: campo,

    // --- Familia (solo del audio) ---
    integrantes: campo,
    menores: campo,
    mayores: campo,
    discapacidad: campo,
    enfermedadGrave: campo,
    embarazo: campo,

    // --- Urgencia ---
    puntajeBase: v.optional(v.number()), // 0..100
    ajustePorcentaje: v.optional(v.number()), // -15..+15 (sugerido por IA)
    ajusteMotivo: v.optional(v.string()),
    ajusteEvidencia: v.optional(v.string()),
    ajusteEstado: v.optional(
      v.union(
        v.literal("sugerido"), // la IA lo propuso, falta decisión humana
        v.literal("aceptado"),
        v.literal("rechazado")
      )
    ),
    puntajeFinal: v.optional(v.number()),
    explicacion: v.optional(v.string()), // texto en lenguaje simple

    // Metadatos
    relevadoEn: v.number(), // timestamp del relevamiento
    creadoPor: v.optional(v.string()), // id del voluntario (cuando haya auth)
  })
    .index("por_estado", ["estado"])
    .index("por_puntaje", ["puntajeFinal"]),

  // ─── HISTORIAS (para donantes, anónimas) ──────────────────
  historias: defineTable({
    casoId: v.id("casos"),
    textoOriginal: v.string(), // primera versión de la IA
    textoRevisado: v.optional(v.string()), // tras revisión de privacidad
    aprobada: v.boolean(), // el coordinador la aprobó
    imagenStorageId: v.optional(v.string()),
  }).index("por_caso", ["casoId"]),

  // ─── CAMPAÑAS (meta US$ 15.000, pagos simulados) ──────────
  campanas: defineTable({
    casoId: v.id("casos"),
    historiaId: v.id("historias"),
    metaUsd: v.number(), // 15000
    recaudadoUsd: v.number(), // suma de donaciones simuladas
    activa: v.boolean(),
  }).index("por_caso", ["casoId"]),

  // ─── DONACIONES (simuladas) ───────────────────────────────
  donaciones: defineTable({
    campanaId: v.id("campanas"),
    montoUsd: v.number(),
    creadoEn: v.number(),
  }).index("por_campana", ["campanaId"]),
});
