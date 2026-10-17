// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Casos (fichas) y ranking de urgencia
//
// - seed:    carga 8 familias de ejemplo (DATOS SIMULADOS) si la tabla
//            está vacía. Alias anónimos, sin nombres ni direcciones.
// - ranking: devuelve los casos confirmados con el puntaje y la explicación
//            calculados en código (urgencia.ts), ordenados por puntaje.
// - obtener: un caso con su desglose completo para la ficha.
// ─────────────────────────────────────────────────────────────

import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { calcularUrgencia } from "./urgencia";

const DIA = 1000 * 60 * 60 * 24;

// Un campo de la ficha: valor + evidencia + confianza. Los de ejemplo vienen
// con confianza alta y sin "a confirmar" (ya corregidos por el voluntario).
function campo(valor: string, evidencia: string) {
  return { valor, evidencia, confianza: "alta" as const, aConfirmar: false };
}

interface SeedCaso {
  alias: string;
  barrio: string;
  diasAtras: number;
  campos: Record<string, string>;
  ajuste?: {
    porcentaje: number;
    motivo: string;
    evidencia: string;
    estado: "sugerido" | "aceptado" | "rechazado";
  };
}

const SEED: SeedCaso[] = [
  {
    alias: "Familia A",
    barrio: "Barrio Esperanza",
    diasAtras: 190,
    campos: {
      techo: "nylon_lona",
      paredes: "nylon_incompletas",
      piso: "tierra",
      humedad: "filtracion_activa",
      riesgoElectrico: "conexion_irregular_peligrosa",
      bano: "sin_bano",
      agua: "sin_acceso",
      integrantes: "7+",
      menores: "3+",
      mayores: "1",
      discapacidad: "si_requiere_accesibilidad",
      enfermedadGrave: "si_agravada_por_vivienda",
      embarazo: "no",
    },
    ajuste: {
      porcentaje: 12,
      motivo: "La vivienda está al borde de una cañada que se desborda.",
      evidencia: "audio: 'el año pasado el agua llegó hasta la puerta'",
      estado: "aceptado",
    },
  },
  {
    alias: "Familia B",
    barrio: "Las Piedras",
    diasAtras: 120,
    campos: {
      techo: "chapa_deteriorada",
      paredes: "madera_chapa",
      piso: "madera_sobre_tierra",
      humedad: "extendida",
      riesgoElectrico: "cables_expuestos",
      bano: "externo_letrina",
      agua: "compartida",
      integrantes: "5-6",
      menores: "2",
      mayores: "0",
      discapacidad: "no",
      enfermedadGrave: "si_cronica",
      embarazo: "si",
    },
    ajuste: {
      porcentaje: 10,
      motivo: "Desalojo inminente notificado por el propietario del terreno.",
      evidencia: "audio: 'nos dieron hasta fin de mes para irnos'",
      estado: "sugerido",
    },
  },
  {
    alias: "Familia C",
    barrio: "Nuevo Amanecer",
    diasAtras: 75,
    campos: {
      techo: "madera_carton",
      paredes: "mixto_precario",
      piso: "tierra",
      humedad: "extendida",
      riesgoElectrico: "cables_expuestos",
      bano: "externo_letrina",
      agua: "canilla_terreno",
      integrantes: "3-4",
      menores: "1",
      mayores: "2+",
      discapacidad: "si_sin_adaptacion",
      enfermedadGrave: "no",
      embarazo: "no",
    },
  },
  {
    alias: "Familia D",
    barrio: "Barrio Esperanza",
    diasAtras: 60,
    campos: {
      techo: "chapa_deteriorada",
      paredes: "bloque_sin_terminar",
      piso: "contrapiso_deteriorado",
      humedad: "extendida",
      riesgoElectrico: "sin_electricidad",
      bano: "interno_precario",
      agua: "canilla_terreno",
      integrantes: "5-6",
      menores: "3+",
      mayores: "0",
      discapacidad: "no",
      enfermedadGrave: "no",
      embarazo: "si",
    },
  },
  {
    alias: "Familia E",
    barrio: "Km 14",
    diasAtras: 45,
    campos: {
      techo: "chapa_deteriorada",
      paredes: "madera_chapa",
      piso: "madera_sobre_tierra",
      humedad: "leve",
      riesgoElectrico: "cables_expuestos",
      bano: "externo_letrina",
      agua: "compartida",
      integrantes: "3-4",
      menores: "2",
      mayores: "1",
      discapacidad: "no",
      enfermedadGrave: "si_cronica",
      embarazo: "no",
    },
  },
  {
    alias: "Familia F",
    barrio: "Las Piedras",
    diasAtras: 30,
    campos: {
      techo: "chapa_buena",
      paredes: "madera_chapa",
      piso: "contrapiso_deteriorado",
      humedad: "leve",
      riesgoElectrico: "cables_expuestos",
      bano: "interno_precario",
      agua: "canilla_terreno",
      integrantes: "3-4",
      menores: "1",
      mayores: "0",
      discapacidad: "no",
      enfermedadGrave: "no",
      embarazo: "no",
    },
  },
  {
    alias: "Familia G",
    barrio: "Nuevo Amanecer",
    diasAtras: 20,
    campos: {
      techo: "madera_carton",
      paredes: "mixto_precario",
      piso: "madera_sobre_tierra",
      humedad: "extendida",
      riesgoElectrico: "conexion_irregular_peligrosa",
      bano: "sin_bano",
      agua: "compartida",
      integrantes: "5-6",
      menores: "2",
      mayores: "1",
      discapacidad: "no",
      enfermedadGrave: "no",
      embarazo: "no",
    },
  },
  {
    alias: "Familia H",
    barrio: "Km 14",
    diasAtras: 10,
    campos: {
      techo: "chapa_buena",
      paredes: "bloque_sin_terminar",
      piso: "ceramica_contrapiso",
      humedad: "sin_signos",
      riesgoElectrico: "instalacion_segura",
      bano: "interno_completo",
      agua: "red_dentro",
      integrantes: "1-2",
      menores: "0",
      mayores: "1",
      discapacidad: "no",
      enfermedadGrave: "no",
      embarazo: "no",
    },
  },
];

// Evidencias de ejemplo por campo (para que la ficha muestre la trazabilidad).
const EVIDENCIA: Record<string, string> = {
  techo: "foto 1: cubierta de la vivienda",
  paredes: "foto 2: paredes del ambiente principal",
  piso: "foto 3: piso del ambiente principal",
  humedad: "foto 4 + audio: signos de humedad",
  riesgoElectrico: "foto 5: instalación eléctrica",
  bano: "foto 6 + audio: estado del baño",
  agua: "audio: acceso al agua",
  integrantes: "audio: cantidad de personas",
  menores: "audio: menores de 18",
  mayores: "audio: mayores de 65",
  discapacidad: "audio: situación de discapacidad",
  enfermedadGrave: "audio: enfermedad en el hogar",
  embarazo: "audio: embarazo en el hogar",
};

function construirCampos(campos: Record<string, string>) {
  const out: Record<string, ReturnType<typeof campo>> = {};
  for (const [k, valor] of Object.entries(campos)) {
    out[k] = campo(valor, EVIDENCIA[k] ?? "—");
  }
  return out as never; // el schema valida la forma exacta
}

/** Carga las familias de ejemplo si la tabla está vacía. Idempotente. */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existentes = await ctx.db.query("casos").take(1);
    if (existentes.length > 0) {
      return { creados: 0, mensaje: "Ya había casos cargados." };
    }

    const ahora = Date.now();
    let creados = 0;
    for (const s of SEED) {
      const relevadoEn = ahora - s.diasAtras * DIA;
      const resultado = calcularUrgencia(s.campos, relevadoEn, ahora, s.ajuste);
      const campos = construirCampos(s.campos) as Record<string, ReturnType<typeof campo>>;

      await ctx.db.insert("casos", {
        estado: "confirmado",
        consentimiento: true,
        alias: s.alias,
        barrio: s.barrio,
        fotos: [],
        ...campos,
        puntajeBase: resultado.base,
        ajustePorcentaje: s.ajuste?.porcentaje,
        ajusteMotivo: s.ajuste?.motivo,
        ajusteEvidencia: s.ajuste?.evidencia,
        ajusteEstado: s.ajuste?.estado,
        puntajeFinal: resultado.puntajeFinal,
        explicacion: resultado.explicacion,
        relevadoEn,
      } as never);
      creados++;
    }

    return { creados, mensaje: `Se cargaron ${creados} familias de ejemplo.` };
  },
});

function aliasDe(doc: Doc<"casos">, i: number) {
  return {
    alias: doc.alias ?? `Familia ${String.fromCharCode(65 + i)}`,
    barrio: doc.barrio ?? "—",
  };
}

/** Ranking: casos ya confirmados (incluye en campaña / financiados),
 *  ordenados por puntaje recalculado en código. */
export const ranking = query({
  args: {},
  handler: async (ctx) => {
    const ahora = Date.now();
    // Todos los casos que superaron la confirmación siguen en el ranking.
    const confirmables = ["confirmado", "en_campana", "financiado"] as const;
    const grupos = await Promise.all(
      confirmables.map((estado) =>
        ctx.db
          .query("casos")
          .withIndex("por_estado", (q) => q.eq("estado", estado))
          .collect(),
      ),
    );
    const casos = grupos.flat();

    const filas = casos.map((doc, i) => {
      const campos = extraerCampos(doc);
      const ajuste = extraerAjuste(doc);
      const r = calcularUrgencia(campos, doc.relevadoEn, ahora, ajuste);
      const meta = aliasDe(doc, i);
      return {
        id: doc._id,
        alias: meta.alias,
        barrio: meta.barrio,
        puntajeFinal: r.puntajeFinal,
        base: r.base,
        espera: r.espera,
        ajusteAplicado: r.ajusteAplicado,
        explicacion: r.explicacion,
      };
    });

    filas.sort((a, b) => b.puntajeFinal - a.puntajeFinal);
    return filas;
  },
});

/** Un caso con su desglose completo, para la ficha. */
export const obtener = query({
  args: { id: v.id("casos") },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (!doc) return null;

    const ahora = Date.now();
    const campos = extraerCampos(doc);
    const ajuste = extraerAjuste(doc);
    const r = calcularUrgencia(campos, doc.relevadoEn, ahora, ajuste);

    return {
      id: doc._id,
      alias: doc.alias ?? "Familia",
      barrio: doc.barrio ?? "—",
      estado: doc.estado,
      relevadoEn: doc.relevadoEn,
      resultado: r,
      ajuste,
    };
  },
});

const CAMPOS_URGENCIA = [
  "techo",
  "paredes",
  "piso",
  "humedad",
  "riesgoElectrico",
  "bano",
  "agua",
  "integrantes",
  "menores",
  "mayores",
  "discapacidad",
  "enfermedadGrave",
  "embarazo",
] as const;

function extraerCampos(doc: Doc<"casos">): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of CAMPOS_URGENCIA) {
    const campoDoc = (doc as unknown as Record<string, { valor: string }>)[c];
    out[c] = campoDoc?.valor ?? "";
  }
  return out;
}

function extraerAjuste(doc: Doc<"casos">) {
  if (doc.ajustePorcentaje === undefined || doc.ajusteEstado === undefined) return undefined;
  return {
    porcentaje: doc.ajustePorcentaje,
    motivo: doc.ajusteMotivo ?? "",
    evidencia: doc.ajusteEvidencia ?? "",
    estado: doc.ajusteEstado,
  };
}
