// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Carga y procesamiento de visitas
//
// Flujo (PLAN.md, pasos 1-6):
//   1. consentimiento  2. subir fotos + audio  3. transcripción (ElevenLabs)
//   4. ficha por IA (Claude)  5. corrección de "a confirmar"  6. urgencia.
//
// Estado actual: pasos 3 y 4 usan un MOCK determinístico para que la demo
// funcione end-to-end SIN llaves de API. El enganche real (ElevenLabs +
// Claude) está marcado con TODO: se reemplaza `analizarMock` por las llamadas
// cuando estén las keys, sin tocar el resto del flujo.
// ─────────────────────────────────────────────────────────────

import { v } from "convex/values";

import { action, internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { calcularUrgencia } from "./urgencia";

// ── Subida de archivos a Convex storage ───────────────────────
/** URL temporal para subir una foto o un audio desde el cliente. */
export const generarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ── Tipo de ficha que produce la IA (o el mock) ───────────────
interface CampoIA {
  valor: string;
  evidencia: string;
  confianza: "alta" | "media" | "baja";
  aConfirmar: boolean;
}
interface FichaIA {
  campos: Record<string, CampoIA>;
  ajuste?: {
    porcentaje: number;
    motivo: string;
    evidencia: string;
    estado: "sugerido";
  };
}

const CAMPOS = [
  "pared", "techo", "piso", "bano",
  "m2PorPersona", "ventanas", "separacionAmbientes",
  "riesgoDerrumbe", "inundable",
  "enfermedad", "menoresDe5", "menores5a12", "menores12a18", "monoparental",
  "vinculoOrganizacion", "impresionPrimeraVisita", "desalojo", "adicionales",
] as const;

/**
 * MOCK de la llamada a Claude. Devuelve una ficha plausible con un par de
 * campos "a confirmar" (como pide la demo). Determinístico.
 *
 * TODO(IA): reemplazar por:
 *   1. ElevenLabs: audioStorageId -> transcripción.
 *   2. Claude Sonnet: fotos + transcripción -> FichaIA (JSON validado).
 * La firma de salida (FichaIA) debe mantenerse igual para no tocar el flujo.
 */
function analizarMock(): FichaIA {
  const alta = (valor: string, evidencia: string): CampoIA => ({
    valor,
    evidencia,
    confianza: "alta",
    aConfirmar: false,
  });
  // Dos campos quedan "a confirmar" a propósito (el voluntario los resuelve).
  const dudoso = (valor: string, evidencia: string): CampoIA => ({
    valor,
    evidencia,
    confianza: "baja",
    aConfirmar: true,
  });

  return {
    campos: {
      pared: alta("precaria", "foto 2: chapa y madera"),
      techo: alta("liviano_sin_aislacion", "foto 1: chapa sin cielorraso"),
      piso: alta("tierra", "foto 3: piso de tierra"),
      bano: alta("incompleto_o_exterior", "foto 6: baño sin terminar"),
      m2PorPersona: dudoso("de_5_a_10", "audio: no se menciona la superficie exacta"),
      ventanas: alta("insuficientes", "foto 4: una sola ventana"),
      separacionAmbientes: alta("cortinas", "foto 5: separación con cortina"),
      riesgoDerrumbe: alta("rajaduras", "foto 1: pared rajada"),
      inundable: alta("inundable", "audio: 'cuando llueve entra el agua'"),
      enfermedad: dudoso("leve", "audio: se menciona una tos, sin precisar"),
      menoresDe5: alta("uno", "audio: un bebé"),
      menores5a12: alta("dos_a_tres", "audio: dos niños en edad escolar"),
      menores12a18: alta("ninguno", "audio: no se mencionan"),
      monoparental: alta("solo_madre", "audio: 'la madre con los chicos'"),
      vinculoOrganizacion: alta("de_1_a_2_anos", "audio: 'los conocemos hace un año'"),
      impresionPrimeraVisita: dudoso("media", "la elige el voluntario, no la IA"),
      desalojo: alta("mediano_plazo", "audio: 'el dueño les pidió el terreno'"),
      adicionales: alta("algunos", "elección del coordinador"),
    },
    ajuste: {
      porcentaje: 10,
      motivo: "La vivienda está al borde de una cañada que se inunda.",
      evidencia: "audio: 'cuando llueve fuerte el agua llega hasta la puerta'",
      estado: "sugerido",
    },
  };
}

// ── Crear el caso en la base (desde la action) ────────────────
export const crearDesdeFicha = internalMutation({
  args: {
    alias: v.string(),
    barrio: v.string(),
    consentimiento: v.boolean(),
    fotos: v.array(v.string()),
    audioStorageId: v.optional(v.string()),
    audioTranscripcion: v.optional(v.string()),
    ficha: v.any(),
  },
  handler: async (ctx, a) => {
    const ficha = a.ficha as FichaIA;
    const ahora = Date.now();

    // Construir los 18 campos con la forma exacta del schema.
    const campos: Record<string, CampoIA> = {};
    for (const c of CAMPOS) {
      const f = ficha.campos[c];
      campos[c] = f ?? {
        valor: "",
        evidencia: "sin dato",
        confianza: "baja",
        aConfirmar: true,
      };
    }

    const hayDudas = Object.values(campos).some((c) => c.aConfirmar);

    // Puntaje: solo si no quedan dudas tiene sentido; igual lo precalculamos.
    const valores = Object.fromEntries(
      Object.entries(campos).map(([k, c]) => [k, c.valor]),
    );
    const r = calcularUrgencia(valores, ahora, ahora, ficha.ajuste);

    const id = await ctx.db.insert("casos", {
      estado: hayDudas ? "relevado" : "confirmado",
      consentimiento: a.consentimiento,
      alias: a.alias,
      barrio: a.barrio,
      fotos: a.fotos,
      audioStorageId: a.audioStorageId,
      audioTranscripcion: a.audioTranscripcion,
      ...campos,
      puntajeTabla: r.total,
      puntajeBase: r.base,
      ajustePorcentaje: ficha.ajuste?.porcentaje,
      ajusteMotivo: ficha.ajuste?.motivo,
      ajusteEvidencia: ficha.ajuste?.evidencia,
      ajusteEstado: ficha.ajuste?.estado,
      puntajeFinal: r.puntajeFinal,
      explicacion: r.explicacion,
      relevadoEn: ahora,
    } as never);

    return id as Id<"casos">;
  },
});

/**
 * Procesa una visita: (transcripción + IA → ficha) y crea el caso.
 * Hoy usa el mock; el caso queda en "relevado" si hay campos a confirmar.
 */
export const procesarVisita = action({
  args: {
    alias: v.string(),
    barrio: v.string(),
    consentimiento: v.boolean(),
    fotos: v.array(v.string()),
    audioStorageId: v.optional(v.string()),
  },
  handler: async (ctx, a): Promise<{ casoId: Id<"casos"> }> => {
    if (!a.consentimiento) {
      throw new Error("Falta el consentimiento de la familia.");
    }
    if (a.fotos.length === 0) {
      throw new Error("Subí al menos una foto.");
    }

    // TODO(IA) paso 3: transcripción real con ElevenLabs a partir del audio.
    const audioTranscripcion = a.audioStorageId
      ? "[transcripción simulada del audio de la visita]"
      : undefined;

    // TODO(IA) paso 4: Claude Sonnet con fotos + transcripción. Hoy: mock.
    const ficha = analizarMock();

    const casoId: Id<"casos"> = await ctx.runMutation(internal.visitas.crearDesdeFicha, {
      alias: a.alias,
      barrio: a.barrio,
      consentimiento: a.consentimiento,
      fotos: a.fotos,
      audioStorageId: a.audioStorageId,
      audioTranscripcion,
      ficha,
    });

    return { casoId };
  },
});

// ── Corrección de campos "a confirmar" (paso 5) ───────────────
/**
 * Resuelve un campo "a confirmar" con el valor elegido por el voluntario.
 * Si tras esto no quedan dudas, el caso pasa a "confirmado" y recalcula urgencia.
 */
export const confirmarCampo = mutation({
  args: {
    casoId: v.id("casos"),
    campo: v.string(),
    valor: v.string(),
  },
  handler: async (ctx, { casoId, campo, valor }) => {
    if (!CAMPOS.includes(campo as (typeof CAMPOS)[number])) {
      throw new Error(`Campo desconocido: ${campo}`);
    }
    const doc = await ctx.db.get(casoId);
    if (!doc) throw new Error("Caso no encontrado.");

    const actual = (doc as unknown as Record<string, CampoIA>)[campo];
    await ctx.db.patch(casoId, {
      [campo]: {
        valor,
        evidencia: actual?.evidencia ?? "resuelto por el voluntario",
        confianza: "alta",
        aConfirmar: false,
      },
    } as never);

    // ¿Quedan dudas?
    const actualizado = await ctx.db.get(casoId);
    const campos = Object.fromEntries(
      CAMPOS.map((c) => {
        const f = (actualizado as unknown as Record<string, CampoIA>)[c];
        return [c, f];
      }),
    );
    const hayDudas = Object.values(campos).some((c) => c?.aConfirmar);

    if (!hayDudas && actualizado) {
      const valores = Object.fromEntries(
        CAMPOS.map((c) => [c, campos[c]?.valor ?? ""]),
      );
      const ajuste =
        actualizado.ajustePorcentaje !== undefined && actualizado.ajusteEstado
          ? {
              porcentaje: actualizado.ajustePorcentaje,
              motivo: actualizado.ajusteMotivo ?? "",
              evidencia: actualizado.ajusteEvidencia ?? "",
              estado: actualizado.ajusteEstado,
            }
          : undefined;
      const r = calcularUrgencia(valores, actualizado.relevadoEn, Date.now(), ajuste);
      await ctx.db.patch(casoId, {
        estado: "confirmado",
        puntajeTabla: r.total,
        puntajeBase: r.base,
        puntajeFinal: r.puntajeFinal,
        explicacion: r.explicacion,
      });
    }

    return { hayDudas };
  },
});
