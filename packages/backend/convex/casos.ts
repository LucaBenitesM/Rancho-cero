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
import type { MutationCtx } from "./_generated/server";
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
      pared: "precaria",
      techo: "liviano_sin_aislacion",
      piso: "tierra",
      bano: "no_tiene",
      m2PorPersona: "menos_de_5",
      ventanas: "sin_ventanas",
      separacionAmbientes: "sin_separacion",
      riesgoDerrumbe: "riesgo_derrumbe",
      inundable: "inundable",
      enfermedad: "grave",
      menoresDe5: "dos_a_tres",
      menores5a12: "dos_a_tres",
      menores12a18: "uno",
      monoparental: "solo_madre",
      vinculoOrganizacion: "mas_de_2_anos",
      impresionPrimeraVisita: "alta",
      desalojo: "inmediato",
      adicionales: "graves",
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
      pared: "precaria",
      techo: "liviano_sin_aislacion",
      piso: "material_sin_terminacion",
      bano: "incompleto_o_exterior",
      m2PorPersona: "de_5_a_10",
      ventanas: "insuficientes",
      separacionAmbientes: "cortinas",
      riesgoDerrumbe: "rajaduras",
      inundable: "inundable",
      enfermedad: "media",
      menoresDe5: "uno",
      menores5a12: "dos_a_tres",
      menores12a18: "ninguno",
      monoparental: "solo_madre",
      vinculoOrganizacion: "de_1_a_2_anos",
      impresionPrimeraVisita: "alta",
      desalojo: "inmediato",
      adicionales: "algunos",
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
      pared: "precaria",
      techo: "liviano_sin_aislacion",
      piso: "tierra",
      bano: "incompleto_o_exterior",
      m2PorPersona: "de_5_a_10",
      ventanas: "insuficientes",
      separacionAmbientes: "cortinas",
      riesgoDerrumbe: "rajaduras",
      inundable: "plagas",
      enfermedad: "media",
      menoresDe5: "uno",
      menores5a12: "uno",
      menores12a18: "dos",
      monoparental: "solo_padre",
      vinculoOrganizacion: "mas_de_2_anos",
      impresionPrimeraVisita: "media",
      desalojo: "mediano_plazo",
      adicionales: "algunos",
    },
  },
  {
    alias: "Familia D",
    barrio: "Barrio Esperanza",
    diasAtras: 60,
    campos: {
      pared: "material_sin_revoque",
      techo: "liviano_sin_aislacion",
      piso: "material_sin_terminacion",
      bano: "incompleto_o_exterior",
      m2PorPersona: "de_5_a_10",
      ventanas: "insuficientes",
      separacionAmbientes: "cortinas",
      riesgoDerrumbe: "rajaduras",
      inundable: "plagas",
      enfermedad: "leve",
      menoresDe5: "dos_a_tres",
      menores5a12: "uno",
      menores12a18: "uno",
      monoparental: "solo_madre",
      vinculoOrganizacion: "de_1_a_2_anos",
      impresionPrimeraVisita: "media",
      desalojo: "mediano_plazo",
      adicionales: "algunos",
    },
  },
  {
    alias: "Familia E",
    barrio: "Km 14",
    diasAtras: 45,
    campos: {
      pared: "material_sin_revoque",
      techo: "liviano_con_aislacion",
      piso: "material_sin_terminacion",
      bano: "incompleto_o_exterior",
      m2PorPersona: "de_5_a_10",
      ventanas: "insuficientes",
      separacionAmbientes: "puertas",
      riesgoDerrumbe: "rajaduras",
      inundable: "normal",
      enfermedad: "media",
      menoresDe5: "uno",
      menores5a12: "uno",
      menores12a18: "uno",
      monoparental: "padre_y_madre",
      vinculoOrganizacion: "de_1_a_2_anos",
      impresionPrimeraVisita: "media",
      desalojo: "largo_plazo",
      adicionales: "algunos",
    },
  },
  {
    alias: "Familia F",
    barrio: "Las Piedras",
    diasAtras: 30,
    campos: {
      pared: "material_sin_revoque",
      techo: "liviano_con_aislacion",
      piso: "material_sin_terminacion",
      bano: "incompleto_o_exterior",
      m2PorPersona: "de_5_a_10",
      ventanas: "suficientes",
      separacionAmbientes: "puertas",
      riesgoDerrumbe: "normal",
      inundable: "normal",
      enfermedad: "leve",
      menoresDe5: "uno",
      menores5a12: "ninguno",
      menores12a18: "uno",
      monoparental: "padre_y_madre",
      vinculoOrganizacion: "menos_de_1_ano",
      impresionPrimeraVisita: "media",
      desalojo: "largo_plazo",
      adicionales: "ninguno",
    },
  },
  {
    alias: "Familia G",
    barrio: "Nuevo Amanecer",
    diasAtras: 20,
    campos: {
      pared: "precaria",
      techo: "liviano_sin_aislacion",
      piso: "material_sin_terminacion",
      bano: "no_tiene",
      m2PorPersona: "de_5_a_10",
      ventanas: "insuficientes",
      separacionAmbientes: "cortinas",
      riesgoDerrumbe: "riesgo_derrumbe",
      inundable: "plagas",
      enfermedad: "nada",
      menoresDe5: "uno",
      menores5a12: "uno",
      menores12a18: "ninguno",
      monoparental: "padre_y_madre",
      vinculoOrganizacion: "menos_de_1_ano",
      impresionPrimeraVisita: "media",
      desalojo: "mediano_plazo",
      adicionales: "algunos",
    },
  },
  {
    alias: "Familia H",
    barrio: "Km 14",
    diasAtras: 10,
    campos: {
      pared: "material_con_revoque",
      techo: "material",
      piso: "material_revestido",
      bano: "completo_con_puerta",
      m2PorPersona: "mas_de_10",
      ventanas: "suficientes",
      separacionAmbientes: "puertas",
      riesgoDerrumbe: "normal",
      inundable: "normal",
      enfermedad: "nada",
      menoresDe5: "ninguno",
      menores5a12: "ninguno",
      menores12a18: "uno",
      monoparental: "padre_y_madre",
      vinculoOrganizacion: "menos_de_1_ano",
      impresionPrimeraVisita: "baja",
      desalojo: "largo_plazo",
      adicionales: "ninguno",
    },
  },
];

// Evidencias de ejemplo por campo (para que la ficha muestre la trazabilidad).
const EVIDENCIA: Record<string, string> = {
  pared: "foto 2: paredes del ambiente principal",
  techo: "foto 1: cubierta de la vivienda",
  piso: "foto 3: piso del ambiente principal",
  bano: "foto 6 + audio: estado del baño",
  m2PorPersona: "audio: superficie e integrantes",
  ventanas: "foto 4: aberturas",
  separacionAmbientes: "foto 5 + audio: distribución",
  riesgoDerrumbe: "foto 1 + audio: estado estructural",
  inundable: "audio: inundación o plagas",
  enfermedad: "audio: situación de salud del hogar",
  menoresDe5: "audio: menores de 5 años",
  menores5a12: "audio: menores de 5 a 12",
  menores12a18: "audio: menores de 12 a 18",
  monoparental: "audio: composición familiar",
  vinculoOrganizacion: "audio: tiempo de vínculo con Cireneos",
  impresionPrimeraVisita: "elección del voluntario en la visita",
  desalojo: "audio: riesgo de desalojo",
  adicionales: "elección del coordinador",
};

function construirCampos(campos: Record<string, string>) {
  const out: Record<string, ReturnType<typeof campo>> = {};
  for (const [k, valor] of Object.entries(campos)) {
    out[k] = campo(valor, EVIDENCIA[k] ?? "—");
  }
  return out as never; // el schema valida la forma exacta
}

async function sembrar(ctx: MutationCtx) {
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
      puntajeTabla: resultado.total,
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
  return creados;
}

/** Carga las familias de ejemplo si la tabla está vacía. Idempotente. */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existentes = await ctx.db.query("casos").take(1);
    if (existentes.length > 0) {
      return { creados: 0, mensaje: "Ya había casos cargados." };
    }
    const creados = await sembrar(ctx);
    return { creados, mensaje: `Se cargaron ${creados} familias de ejemplo.` };
  },
});

/** Borra todos los casos y los vuelve a sembrar. Útil cuando cambia la tabla. */
export const recargar = mutation({
  args: {},
  handler: async (ctx) => {
    const todos = await ctx.db.query("casos").collect();
    for (const d of todos) await ctx.db.delete(d._id);
    const creados = await sembrar(ctx);
    return { borrados: todos.length, creados, mensaje: `Recargadas ${creados} familias.` };
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
        total: r.total,
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
  "pared",
  "techo",
  "piso",
  "bano",
  "m2PorPersona",
  "ventanas",
  "separacionAmbientes",
  "riesgoDerrumbe",
  "inundable",
  "enfermedad",
  "menoresDe5",
  "menores5a12",
  "menores12a18",
  "monoparental",
  "vinculoOrganizacion",
  "impresionPrimeraVisita",
  "desalojo",
  "adicionales",
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
