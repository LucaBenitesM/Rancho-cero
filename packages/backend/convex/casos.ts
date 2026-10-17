// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Casos (fichas) y ranking de urgencia
//
// - seed:    carga 8 familias de ejemplo (DATOS SIMULADOS) si la tabla
//            está vacía. Alias anónimos, sin nombres ni direcciones.
//            A, D, E y H tienen fotos y guion de audio en demo/GUIA-DEMO.md.
// - ranking: devuelve los casos confirmados con el puntaje y la explicación
//            calculados en código (urgencia.ts), ordenados por puntaje.
// - obtener: un caso con su desglose completo para la ficha.
// ─────────────────────────────────────────────────────────────

import { v } from "convex/values";

import { authComponent } from "./auth";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requerirCoordinador } from "./roles";
import { calcularUrgencia } from "./urgencia";
import {
  CLAVES_CAMPO,
  calcularPuntajeBase,
  calcularPuntajeFinal,
  calcularPuntajeTabla,
  faltanDatos,
  puntosEspera,
} from "./ficha";

const DIA = 1000 * 60 * 60 * 24;

// Un campo de la ficha: valor + evidencia + confianza. Los de ejemplo vienen
// con confianza alta y sin dudas (ya revisados por el voluntario).
function campo(valor: string, evidencia: string) {
  return { valor, evidencia, confianza: "alta" as const, dudoso: false, motivoDuda: "" };
}

interface SeedCaso {
  alias: string;
  barrio: string;
  diasAtras: number;
  transcripcion?: string; // guion del audio (demo/GUIA-DEMO.md)
  campos: Record<string, string>;
  evidencias?: Record<string, string>; // si falta, se usa EVIDENCIA
  ajuste?: {
    porcentaje: number;
    motivo: string;
    evidencia: string;
    estado: "sugerido" | "aceptado" | "rechazado";
  };
}

const SEED: SeedCaso[] = [
  {
    // Muy urgente. Fotos y guion del audio: demo/familia-a-muy-urgente/ (ver demo/GUIA-DEMO.md)
    alias: "Familia A",
    barrio: "Barrio Esperanza",
    diasAtras: 125,
    transcripcion:
      "Bueno, estamos acá en la casa... es todo de chapa y madera, el techo no tiene nada abajo, " +
      "en invierno es un freezer. El piso es de tierra. Baño no tienen, usan el de una vecina. " +
      "Viven la mamá con tres gurises, dos chiquitos de menos de cinco y uno de ocho, todo en un " +
      "solo ambiente, no habrá más de quince metros. Uno de los chiquitos tiene problemas para " +
      "respirar, ella dice que empeora con la humedad. Cuando llueve fuerte el agua entra por " +
      "abajo, y la casa está pegada a la cañada, eh, el año pasado se llevó un pedazo del " +
      "terreno. Conocemos a la familia hace como un año y medio. El dueño del terreno les dijo " +
      "que en unos meses tienen que irse.",
    campos: {
      pared: "precaria",
      techo: "liviano_sin_aislacion",
      piso: "tierra",
      bano: "no_tiene",
      m2PorPersona: "menos_de_5",
      ventanas: "insuficientes",
      separacionAmbientes: "sin_separacion",
      riesgoDerrumbe: "riesgo_derrumbe",
      inundable: "inundable",
      enfermedad: "media",
      menoresDe5: "dos_a_tres",
      menores5a12: "uno",
      menores12a18: "ninguno",
      monoparental: "solo_madre",
      vinculoOrganizacion: "de_1_a_2_anos",
      impresionPrimeraVisita: "alta",
      desalojo: "mediano_plazo",
      adicionales: "algunos",
    },
    evidencias: {
      pared: "foto 1: paredes de chapa y tablas de madera",
      techo: "foto 2: chapa sin cielorraso; audio: 'en invierno es un freezer'",
      piso: "foto 3: piso de tierra; audio: 'el piso es de tierra'",
      bano: "audio: 'baño no tienen, usan el de una vecina'",
      m2PorPersona: "audio: 'no habrá más de quince metros' para 4 personas",
      ventanas: "foto 1: una sola abertura chica tapada con nylon",
      separacionAmbientes: "audio: 'todo en un solo ambiente'",
      riesgoDerrumbe: "foto 2: chapas sueltas sin fijar, apoyadas con piedras",
      inundable: "audio: 'cuando llueve fuerte el agua entra por abajo'",
      enfermedad: "audio: 'tiene problemas para respirar, empeora con la humedad'",
      menoresDe5: "audio: 'dos chiquitos de menos de cinco'",
      menores5a12: "audio: 'uno de ocho'",
      menores12a18: "audio: solo menciona tres niños, todos menores de 12",
      monoparental: "audio: 'viven la mamá con tres gurises'",
      vinculoOrganizacion: "audio: 'conocemos a la familia hace como un año y medio'",
      impresionPrimeraVisita: "elegida por el voluntario",
      desalojo: "audio: 'en unos meses tienen que irse'",
      adicionales: "elegido por el coordinador",
    },
    ajuste: {
      porcentaje: 10,
      motivo: "La vivienda está al borde de una cañada que ya erosionó parte del terreno.",
      evidencia: "audio: 'la casa está pegada a la cañada, el año pasado se llevó un pedazo del terreno'",
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
    // Intermedia (lleva tiempo esperando). Fotos y guion del audio: demo/familia-d-intermedia-espera/ (ver demo/GUIA-DEMO.md)
    alias: "Familia D",
    barrio: "Barrio Esperanza",
    diasAtras: 215,
    transcripcion:
      "Es una casa de bloque, sin revocar. El techo es chapa sola, sin aislación. El piso es " +
      "contrapiso, nada encima. El baño está afuera, en el fondo. Son mamá, papá y cuatro hijos: " +
      "uno de tres años, dos en la escuela y una de catorce. Tienen dos piezas separadas con " +
      "cortina, en total serán unos cuarenta metros. Hay rajaduras en la pared del fondo. Dicen " +
      "que hay ratas, sobre todo en invierno. El papá tiene un problema en la espalda, pero " +
      "trabaja igual. Esta familia viene a la organización hace más de tres años. El terreno es " +
      "de ellos, así que por ese lado tranquilos. Ah, y el agua la sacan de una canilla del " +
      "vecino con una manguera.",
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
      menoresDe5: "uno",
      menores5a12: "dos_a_tres",
      menores12a18: "uno",
      monoparental: "padre_y_madre",
      vinculoOrganizacion: "mas_de_2_anos",
      impresionPrimeraVisita: "media",
      desalojo: "largo_plazo",
      adicionales: "ninguno",
    },
    evidencias: {
      pared: "foto 1: bloque a la vista",
      techo: "foto 2: chapa sin cielorraso",
      piso: "foto 3: contrapiso sin revestir",
      bano: "audio: 'el baño está afuera, en el fondo'; foto 5",
      m2PorPersona: "audio: 'serán unos cuarenta metros' para 6 personas",
      ventanas: "foto 4: una ventana por pieza, chica",
      separacionAmbientes: "audio: 'dos piezas separadas con cortina'",
      riesgoDerrumbe: "foto 4: rajadura diagonal en la pared del fondo",
      inundable: "audio: 'dicen que hay ratas'",
      enfermedad: "audio: 'tiene un problema en la espalda, pero trabaja igual'",
      menoresDe5: "audio: 'uno de tres años'",
      menores5a12: "audio: 'dos en la escuela'",
      menores12a18: "audio: 'una de catorce'",
      monoparental: "audio: 'son mamá, papá y cuatro hijos'",
      vinculoOrganizacion: "audio: 'viene a la organización hace más de tres años'",
      impresionPrimeraVisita: "elegida por el voluntario",
      desalojo: "audio: 'el terreno es de ellos, así que por ese lado tranquilos'",
      adicionales: "elegido por el coordinador",
    },
    ajuste: {
      porcentaje: 5,
      motivo: "No tienen agua potable propia: dependen de la canilla de un vecino.",
      evidencia: "audio: 'el agua la sacan de una canilla del vecino con una manguera'",
      estado: "sugerido",
    },
  },
  {
    // Intermedia (desalojo inmediato). Fotos y guion del audio: demo/familia-e-intermedia-desalojo/ (ver demo/GUIA-DEMO.md)
    alias: "Familia E",
    barrio: "Km 14",
    diasAtras: 35,
    transcripcion:
      "La casa es de madera, tiene un cielorraso de espuma que pusieron ellos. El piso es " +
      "contrapiso. El baño está adentro pero no tiene puerta, tiene una cortina. Serán unos " +
      "treinta y cinco metros en total. Vive un papá con dos hijos adolescentes, de trece y " +
      "dieciséis, y una nena de diez. Tienen ventanas bien, entra luz. Dicen que cuando sube el " +
      "arroyo el agua llega adentro, pasó dos veces este año. La abuela vive con ellos y tiene " +
      "una enfermedad que la tiene bastante limitada. Los conocimos hace poco, unos meses. Ojo " +
      "que tienen que dejar la casa ya, el mes que viene. La conexión de luz es medio colgada, " +
      "pero dicen que ya pidieron que se la regularicen.",
    campos: {
      pared: "precaria",
      techo: "liviano_con_aislacion",
      piso: "material_sin_terminacion",
      bano: "incompleto_o_exterior",
      m2PorPersona: "de_5_a_10",
      ventanas: "suficientes",
      separacionAmbientes: "cortinas",
      riesgoDerrumbe: "normal",
      inundable: "inundable",
      enfermedad: "media",
      menoresDe5: "ninguno",
      menores5a12: "uno",
      menores12a18: "dos",
      monoparental: "solo_padre",
      vinculoOrganizacion: "menos_de_1_ano",
      impresionPrimeraVisita: "media",
      desalojo: "inmediato",
      adicionales: "ninguno",
    },
    evidencias: {
      pared: "foto 1: paredes de tablas de madera",
      techo: "foto 2: chapa con cielorraso de espuma; audio: 'cielorraso que pusieron ellos'",
      piso: "foto 3: contrapiso",
      bano: "audio: 'está adentro pero no tiene puerta'",
      m2PorPersona: "audio: 'serán unos treinta y cinco metros' para 5 personas",
      ventanas: "foto 1: dos ventanas grandes; audio: 'entra luz'",
      separacionAmbientes: "foto 4: ambientes separados con cortinas",
      riesgoDerrumbe: "fotos 1 y 2: sin daños estructurales visibles",
      inundable: "audio: 'cuando sube el arroyo el agua llega adentro, pasó dos veces este año'",
      enfermedad: "audio: 'una enfermedad que la tiene bastante limitada'",
      menoresDe5: "audio: no hay niños menores de 5",
      menores5a12: "audio: 'una nena de diez'",
      menores12a18: "audio: 'dos hijos adolescentes, de trece y dieciséis'",
      monoparental: "audio: 'vive un papá con dos hijos adolescentes'",
      vinculoOrganizacion: "audio: 'los conocimos hace poco, unos meses'",
      impresionPrimeraVisita: "elegida por el voluntario",
      desalojo: "audio: 'tienen que dejar la casa ya, el mes que viene'",
      adicionales: "elegido por el coordinador",
    },
    ajuste: {
      porcentaje: 8,
      motivo: "Conexión eléctrica irregular cerca de la chapa.",
      evidencia: "audio: 'la conexión de luz es medio colgada'",
      estado: "rechazado",
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
    // Poco urgente. Fotos y guion del audio: demo/familia-h-poco-urgente/ (ver demo/GUIA-DEMO.md)
    alias: "Familia H",
    barrio: "Km 14",
    diasAtras: 65,
    transcripcion:
      "Esta casa está bastante bien, eh. Es de material, revocada, con techo de losa. El piso es " +
      "contrapiso, les falta revestir. Baño completo con puerta. Son una pareja con un hijo de " +
      "seis años. La casa es amplia, unos cincuenta metros, tiene dos dormitorios con puerta. " +
      "Nunca se les inundó y no tienen bichos. Nadie tiene problemas de salud. Los conocimos este " +
      "año. Me contaron que el año pasado agregaron un dormitorio con ayuda de la familia, y que " +
      "no tienen apuro.",
    campos: {
      pared: "material_con_revoque",
      techo: "material",
      piso: "material_sin_terminacion",
      bano: "completo_con_puerta",
      m2PorPersona: "mas_de_10",
      ventanas: "suficientes",
      separacionAmbientes: "puertas",
      riesgoDerrumbe: "normal",
      inundable: "normal",
      enfermedad: "nada",
      menoresDe5: "ninguno",
      menores5a12: "uno",
      menores12a18: "ninguno",
      monoparental: "padre_y_madre",
      vinculoOrganizacion: "menos_de_1_ano",
      impresionPrimeraVisita: "baja",
      desalojo: "largo_plazo",
      adicionales: "ninguno",
    },
    evidencias: {
      pared: "foto 1: bloque revocado y pintado",
      techo: "foto 2: losa de hormigón",
      piso: "foto 3: contrapiso sin revestir; audio: 'les falta revestir'",
      bano: "foto 5: baño completo con puerta",
      m2PorPersona: "audio: 'unos cincuenta metros' para 3 personas",
      ventanas: "fotos 1 y 4: ventanas en todos los ambientes",
      separacionAmbientes: "audio: 'dos dormitorios con puerta'",
      riesgoDerrumbe: "fotos 1 y 2: sin daños visibles",
      inundable: "audio: 'nunca se les inundó y no tienen bichos'",
      enfermedad: "audio: 'nadie tiene problemas de salud'",
      menoresDe5: "audio: un solo hijo, de seis años",
      menores5a12: "audio: 'un hijo de seis años'",
      menores12a18: "audio: un solo hijo, de seis años",
      monoparental: "audio: 'son una pareja con un hijo'",
      vinculoOrganizacion: "audio: 'los conocimos este año'",
      impresionPrimeraVisita: "elegida por el voluntario",
      desalojo: "audio: 'no tienen apuro'",
      adicionales: "elegido por el coordinador",
    },
    ajuste: {
      porcentaje: -10,
      motivo: "Hubo una ampliación reciente: el estado real es mejor de lo que reflejan los campos.",
      evidencia: "audio: 'el año pasado agregaron un dormitorio con ayuda de la familia'",
      estado: "aceptado",
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

function construirCampos(campos: Record<string, string>, evidencias?: Record<string, string>) {
  const out: Record<string, ReturnType<typeof campo>> = {};
  for (const [k, valor] of Object.entries(campos)) {
    out[k] = campo(valor, evidencias?.[k] ?? EVIDENCIA[k] ?? "—");
  }
  return out as never; // el schema valida la forma exacta
}

async function sembrar(ctx: MutationCtx) {
  const ahora = Date.now();
  let creados = 0;
  for (const s of SEED) {
    const relevadoEn = ahora - s.diasAtras * DIA;
    const resultado = calcularUrgencia(s.campos, relevadoEn, ahora, s.ajuste);
    const campos = construirCampos(s.campos, s.evidencias) as Record<string, ReturnType<typeof campo>>;

    await ctx.db.insert("casos", {
      estado: "confirmado",
      consentimiento: true,
      alias: s.alias,
      barrio: s.barrio,
      fotos: [],
      audioTranscripcion: s.transcripcion,
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

/** Borra todos los casos (y las campañas/historias/donaciones que dependen de
 *  ellos, para no dejar referencias huérfanas) y vuelve a sembrar. */
export const recargar = mutation({
  args: {},
  handler: async (ctx) => {
    // Primero lo que depende de los casos, para no dejar casoId colgando.
    for (const tabla of ["donaciones", "campanas", "historias"] as const) {
      const docs = await ctx.db.query(tabla).collect();
      for (const d of docs) await ctx.db.delete(d._id);
    }
    const todos = await ctx.db.query("casos").collect();
    for (const d of todos) await ctx.db.delete(d._id);
    const creados = await sembrar(ctx);
    return {
      borrados: todos.length,
      creados,
      mensaje: `Recargadas ${creados} familias. Volvé a correr campanas:seed.`,
    };
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
    await requerirCoordinador(ctx, "Solo los coordinadores pueden ver el ranking.");
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
    await requerirCoordinador(ctx, "Solo los coordinadores pueden ver la ficha de una familia.");
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

// ─────────────────────────────────────────────────────────────
// CARGA DE VISITA — subir archivos, crear caso y guardar ficha de la IA.
// (integra el trabajo de la rama Marti-ficha-ia). Datos sensibles: exige sesión.
// ─────────────────────────────────────────────────────────────

export async function requerirUsuario(ctx: QueryCtx | MutationCtx): Promise<string> {
  const usuario = await authComponent.safeGetAuthUser(ctx);
  if (!usuario) {
    throw new Error("Necesitás iniciar sesión.");
  }
  return usuario._id;
}

const campoValidator = v.object({
  valor: v.string(),
  evidencia: v.string(),
  confianza: v.union(v.literal("alta"), v.literal("media"), v.literal("baja")),
  dudoso: v.boolean(),
  motivoDuda: v.string(),
});

const camposValidator = v.object({
  pared: campoValidator,
  techo: campoValidator,
  piso: campoValidator,
  bano: campoValidator,
  m2PorPersona: campoValidator,
  ventanas: campoValidator,
  separacionAmbientes: campoValidator,
  riesgoDerrumbe: campoValidator,
  inundable: campoValidator,
  enfermedad: campoValidator,
  menoresDe5: campoValidator,
  menores5a12: campoValidator,
  menores12a18: campoValidator,
  monoparental: campoValidator,
  vinculoOrganizacion: campoValidator,
  impresionPrimeraVisita: campoValidator,
  desalojo: campoValidator,
  adicionales: campoValidator,
});

/** URL temporal para subir una foto o audio al storage de Convex. */
export const generarUrlDeSubida = mutation({
  args: {},
  handler: async (ctx) => {
    await requerirUsuario(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Crea un caso inicial (fotos + audio + consentimiento), estado "relevado". */
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
    if (args.fotos.length < 1 || args.fotos.length > 6) {
      throw new Error("Hay que subir entre 1 y 6 fotos.");
    }

    const campoVacio = {
      valor: "",
      evidencia: "",
      confianza: "baja" as const,
      dudoso: true,
      motivoDuda: "Todavía no lo completó la IA.",
    };
    const camposVacios = Object.fromEntries(
      CLAVES_CAMPO.map((clave) => [clave, campoVacio]),
    ) as Record<string, typeof campoVacio>;

    const casoId = await ctx.db.insert("casos", {
      estado: "relevado",
      consentimiento: args.consentimiento,
      fotos: args.fotos,
      audioStorageId: args.audioStorageId,
      ...camposVacios,
      relevadoEn: Date.now(),
      creadoPor: usuarioId,
    } as never);

    return casoId;
  },
});

/** Lee un caso por id (pantalla de corrección). Solo su autor. */
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

// Busca un caso y verifica que sea del voluntario que lo pide.
async function casoDelAutor(ctx: MutationCtx, casoId: Id<"casos">) {
  const usuarioId = await requerirUsuario(ctx);
  const caso = await ctx.db.get(casoId);
  if (!caso) throw new Error("El caso no existe.");
  if (caso.creadoPor && caso.creadoPor !== usuarioId) {
    throw new Error("No tenés permiso para editar este caso.");
  }
  return caso;
}

/** Une las transcripciones de todos los audios, en orden de grabación. */
function unirTranscripciones(textos: string[]): string {
  if (textos.length <= 1) return textos[0] ?? "";
  return textos.map((t, i) => `Audio ${i + 1}:\n${t}`).join("\n\n");
}

/**
 * Cuando faltan datos: el voluntario agrega un audio y/o cambia las fotos.
 * No se borra lo anterior: el audio nuevo se suma a los que ya había.
 */
export const agregarDatos = mutation({
  args: {
    casoId: v.id("casos"),
    fotos: v.array(v.id("_storage")), // lista completa de fotos (viejas + nuevas)
    audioStorageId: v.optional(v.id("_storage")), // audio nuevo, si grabó uno
  },
  handler: async (ctx, args) => {
    const caso = await casoDelAutor(ctx, args.casoId);
    if (caso.estado !== "relevado") {
      throw new Error("Este caso ya fue confirmado.");
    }
    if (args.fotos.length < 1 || args.fotos.length > 6) {
      throw new Error("Hay que subir entre 1 y 6 fotos.");
    }
    // Las fotos que el voluntario sacó se borran del storage.
    const quitadas = caso.fotos.filter((id) => !args.fotos.includes(id as Id<"_storage">));
    for (const id of quitadas) {
      await ctx.storage.delete(id as Id<"_storage">);
    }
    await ctx.db.patch(args.casoId, {
      fotos: args.fotos,
      audiosExtra: args.audioStorageId
        ? [...(caso.audiosExtra ?? []), args.audioStorageId]
        : caso.audiosExtra,
    });
  },
});

/** Guarda la transcripción de un audio del caso (se suma a las anteriores). */
export const guardarTranscripcion = mutation({
  args: { casoId: v.id("casos"), audioStorageId: v.string(), transcripcion: v.string() },
  handler: async (ctx, { casoId, audioStorageId, transcripcion }) => {
    const caso = await casoDelAutor(ctx, casoId);
    // Ordenadas como se grabaron los audios (el primero, después los extra).
    const orden = [caso.audioStorageId, ...(caso.audiosExtra ?? [])];
    const transcripciones = [
      ...(caso.transcripciones ?? []).filter((t) => t.audioStorageId !== audioStorageId),
      { audioStorageId, texto: transcripcion },
    ].sort((a, b) => orden.indexOf(a.audioStorageId) - orden.indexOf(b.audioStorageId));
    const audioTranscripcion = unirTranscripciones(transcripciones.map((t) => t.texto));
    await ctx.db.patch(casoId, { transcripciones, audioTranscripcion });
    return audioTranscripcion;
  },
});

/** Guarda la ficha completada por la IA + calcula puntajes (tabla, base y final). */
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
    const caso = await ctx.db.get(args.casoId);
    if (!caso) throw new Error("El caso no existe.");

    const puntajeTabla = calcularPuntajeTabla(args.campos as never);
    const puntajeBase = calcularPuntajeBase(args.campos as never);
    // El ajuste de la IA recién sugerido todavía no está aceptado: no entra al
    // puntaje final hasta que una persona lo acepte (PLAN.md).
    const espera = puntosEspera(caso.relevadoEn, Date.now());
    const puntajeFinal = calcularPuntajeFinal(puntajeBase, 0, espera);

    await ctx.db.patch(args.casoId, {
      ...args.campos,
      puntajeTabla,
      puntajeBase,
      puntajeFinal,
      ajustePorcentaje: args.ajustePorcentaje,
      ajusteMotivo: args.ajusteMotivo,
      ajusteEvidencia: args.ajusteEvidencia,
      ajusteEstado: args.ajustePorcentaje != null ? "sugerido" : undefined,
      explicacion: args.explicacion,
      faltanDatos: faltanDatos(args.campos as never),
    });
  },
});

/** Guarda la ficha revisada por el voluntario y confirma el caso (entra al ranking). */
export const guardarCorreccion = mutation({
  args: { casoId: v.id("casos"), campos: camposValidator },
  handler: async (ctx, { casoId, campos }) => {
    const usuarioId = await requerirUsuario(ctx);
    const caso = await ctx.db.get(casoId);
    if (!caso) throw new Error("El caso no existe.");
    if (caso.creadoPor && caso.creadoPor !== usuarioId) {
      throw new Error("No tenés permiso para editar este caso.");
    }
    // Con demasiados campos dudosos no se confirma: primero hay que completar datos.
    if (caso.faltanDatos) {
      throw new Error("Faltan datos: agregá un audio o fotos y volvé a procesar la visita.");
    }

    const puntajeTabla = calcularPuntajeTabla(campos as never);
    const puntajeBase = calcularPuntajeBase(campos as never);
    // Solo se aplica el ajuste si fue aceptado por una persona.
    const pct = caso.ajusteEstado === "aceptado" ? (caso.ajustePorcentaje ?? 0) : 0;
    const espera = puntosEspera(caso.relevadoEn, Date.now());
    const puntajeFinal = calcularPuntajeFinal(puntajeBase, pct, espera);

    await ctx.db.patch(casoId, {
      ...campos,
      puntajeTabla,
      puntajeBase,
      puntajeFinal,
      estado: "confirmado",
    });

    return { confirmado: true };
  },
});

/** Acepta o rechaza el ajuste sugerido por la IA y recalcula el puntaje.
 *  La IA propone, una persona decide: queda registrado quién y cuándo. */
export const decidirAjuste = mutation({
  args: {
    casoId: v.id("casos"),
    decision: v.union(v.literal("aceptado"), v.literal("rechazado")),
  },
  handler: async (ctx, { casoId, decision }) => {
    await requerirCoordinador(ctx, "Solo los coordinadores pueden aceptar o rechazar el ajuste.");
    const usuarioId = await requerirUsuario(ctx);
    const caso = await ctx.db.get(casoId);
    if (!caso) throw new Error("El caso no existe.");
    if (caso.estado === "relevado") {
      throw new Error("Primero hay que revisar y guardar la ficha del caso.");
    }
    const ajuste = extraerAjuste(caso);
    if (!ajuste) throw new Error("Este caso no tiene un ajuste sugerido.");
    if (ajuste.estado !== "sugerido") {
      throw new Error(`El ajuste ya fue ${ajuste.estado}.`);
    }

    const r = calcularUrgencia(extraerCampos(caso), caso.relevadoEn, Date.now(), {
      ...ajuste,
      estado: decision,
    });
    await ctx.db.patch(casoId, {
      ajusteEstado: decision,
      ajusteDecididoPor: usuarioId,
      ajusteDecididoEn: Date.now(),
      puntajeFinal: r.puntajeFinal,
    });

    return { estado: decision, puntajeFinal: r.puntajeFinal };
  },
});
