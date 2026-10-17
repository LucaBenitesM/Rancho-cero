import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Esquema de datos (ver FICHA.md y PLAN.md)
//
// Principio: la IA propone, las personas deciden.
// Cada campo que detecta la IA trae: valor + evidencia + confianza.
// La IA completa todo; lo dudoso queda señalado y el voluntario lo revisa.
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
  dudoso: v.optional(v.boolean()), // true = la IA tiene confianza baja
  motivoDuda: v.optional(v.string()), // por qué duda la IA
  aConfirmar: v.optional(v.boolean()), // legado: casos viejos, ya no se usa
});

// Estados de un caso (PLAN.md).
const estadoCaso = v.union(
  v.literal("relevado"), // recién generado por la IA
  v.literal("confirmado"), // revisado y guardado por el voluntario; entra al ranking
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
    audiosExtra: v.optional(v.array(v.string())), // audios agregados cuando faltaban datos
    // Transcripción de cada audio (así no se transcribe dos veces el mismo).
    transcripciones: v.optional(
      v.array(v.object({ audioStorageId: v.string(), texto: v.string() }))
    ),
    audioTranscripcion: v.optional(v.string()), // todas las transcripciones juntas
    // true = la IA dejó demasiados campos dudosos; no se puede confirmar todavía.
    faltanDatos: v.optional(v.boolean()),

    // Campos de la tabla de puntajes de Cireneos (docs/tabla_puntajes.xlsx).
    // Cada uno puntúa peso × puntuación (1..3, algunos 0..3). Máximo: 135.

    // --- 1. Materialidad ---
    pared: campo,
    techo: campo,
    piso: campo,
    bano: campo,

    // --- 2. Habitabilidad ---
    m2PorPersona: campo,
    ventanas: campo,
    separacionAmbientes: campo,

    // --- 3. Seguridad y salubridad ---
    riesgoDerrumbe: campo,
    inundable: campo,

    // --- 4. Salud y familia (solo del audio) ---
    enfermedad: campo, // enfermedad o discapacidad; nunca el diagnóstico
    menoresDe5: campo,
    menores5a12: campo,
    menores12a18: campo,
    monoparental: campo,

    // --- 5. Dimensión social ---
    vinculoOrganizacion: campo,
    impresionPrimeraVisita: campo, // la propone la IA, la revisa el voluntario
    desalojo: campo,
    adicionales: campo,

    // --- Urgencia ---
    puntajeTabla: v.optional(v.number()), // 0..135, igual al TOTAL de la planilla
    puntajeBase: v.optional(v.number()), // 0..100 = puntajeTabla / 135 × 100
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
    ajusteDecididoPor: v.optional(v.string()), // quién aceptó o rechazó el ajuste
    ajusteDecididoEn: v.optional(v.number()),
    puntajeFinal: v.optional(v.number()),
    explicacion: v.optional(v.string()), // texto en lenguaje simple

    // Metadatos
    relevadoEn: v.number(), // timestamp del relevamiento
    creadoPor: v.optional(v.string()), // id del voluntario (cuando haya auth)
  })
    .index("por_estado", ["estado"])
    .index("por_puntaje", ["puntajeFinal"]),

  // ─── HISTORIAS (anónimas; uso interno de Cireneos) ────────
  // Cada "Generar" guarda un borrador; "Aprobar historia" lo marca aprobado.
  // Una familia puede tener varias historias.
  historias: defineTable({
    casoId: v.id("casos"),
    textoOriginal: v.string(), // primera versión de la IA
    textoRevisado: v.optional(v.string()), // tras revisión de privacidad
    aprobada: v.boolean(), // false = borrador; true = el coordinador la aprobó
    imagenStorageId: v.optional(v.string()),
    // Alertas de la revisión de privacidad (las últimas que se vieron).
    alertasPrivacidad: v.optional(
      v.array(v.object({ texto: v.string(), motivo: v.string(), sugerencia: v.string() }))
    ),
    aprobadaPor: v.optional(v.string()), // id del coordinador que la aprobó
    aprobadaEn: v.optional(v.number()), // timestamp de aprobación
  }).index("por_caso", ["casoId"]),

  // ─── CAMPAÑAS — SIN USO ───────────────────────────────────
  // La campaña pública y las donaciones se sacaron: la app es solo para uso
  // interno de Cireneos (las historias se publican en la web de Cireneos, no
  // acá). Estas tablas quedan SIN USO. No se borran todavía porque tienen datos
  // guardados y Convex rechazaría el cambio; se eliminarán cuando se limpien.
  campanas: defineTable({
    casoId: v.id("casos"),
    historiaId: v.id("historias"),
    metaUsd: v.number(),
    recaudadoUsd: v.number(),
    activa: v.boolean(),
  }).index("por_caso", ["casoId"]),

  // ─── DONACIONES — SIN USO (ver nota en campanas) ──────────
  donaciones: defineTable({
    campanaId: v.id("campanas"),
    montoUsd: v.number(),
    creadoEn: v.number(),
  }).index("por_campana", ["campanaId"]),
});
