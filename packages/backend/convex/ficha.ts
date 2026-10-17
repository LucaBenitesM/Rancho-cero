// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Catálogo de la ficha (fuente única, ver FICHA.md)
//
// Reproduce la TABLA DE PUNTAJES REAL DE CIRENEOS (docs/tabla_puntajes.xlsx).
// 5 bloques, 18 campos. Cada campo puntúa: peso × puntuación.
// Suma de pesos = 45 → máximo = 45 × 3 = 135.
//   total = Σ (peso × puntuación)        → 0..135
//   base  = total / 135 × 100            → 0..100
//
// Lo usan tanto el prompt de Claude (para que elija SOLO valores válidos)
// como la fórmula de urgencia. No duplicar la fórmula en otro lado.
// ─────────────────────────────────────────────────────────────

export type Confianza = "alta" | "media" | "baja";

// La IA completa todos los campos. Si duda, lo señala (dudoso + motivo) para
// que el voluntario lo revise; si el voluntario lo edita, deja de ser dudoso.
export type CampoFicha = {
  valor: string;
  evidencia: string;
  confianza: Confianza;
  dudoso: boolean;
  motivoDuda: string; // frase corta: por qué duda la IA ("" si no duda)
};

export type OpcionValor = {
  valor: string;
  puntos: number; // puntuación de la tabla (0..3)
  descripcion: string;
};

export type GrupoFicha =
  | "materialidad"
  | "habitabilidad"
  | "seguridad"
  | "salud_familia"
  | "dimension_social";

export type DefinicionCampo = {
  clave: string; // nombre del campo en el schema
  etiqueta: string; // nombre legible
  grupo: GrupoFicha;
  peso: number; // 1..3
  fuente: string; // de dónde sale (foto / audio / ambos)
  criterio?: string; // cómo elegir el valor cuando la tabla no lo define
  opciones: OpcionValor[];
};

export const ETIQUETA_GRUPO: Record<GrupoFicha, string> = {
  materialidad: "1. Materialidad",
  habitabilidad: "2. Habitabilidad",
  seguridad: "3. Seguridad y salubridad",
  salud_familia: "4. Salud y familia",
  dimension_social: "5. Dimensión social",
};

export const ORDEN_GRUPOS: GrupoFicha[] = [
  "materialidad",
  "habitabilidad",
  "seguridad",
  "salud_familia",
  "dimension_social",
];

// Puntaje máximo de la planilla (suma de pesos × 3).
export const PUNTAJE_MAXIMO = 135;

// Si la IA deja esta cantidad de campos dudosos (o más), la ficha no se
// muestra: se le pide al voluntario más audio o fotos y se vuelve a procesar.
export const MAX_DUDOSOS_PARA_MOSTRAR_FICHA = 5;

// ─── 1. MATERIALIDAD (peso 12) · foto (audio complementa) ──────
const materialidad: DefinicionCampo[] = [
  {
    clave: "pared",
    etiqueta: "Pared",
    grupo: "materialidad",
    peso: 3,
    fuente: "foto",
    opciones: [
      { valor: "material_con_revoque", puntos: 1, descripcion: "Bloque o ladrillo revocado" },
      { valor: "material_sin_revoque", puntos: 2, descripcion: "Bloque o ladrillo a la vista" },
      { valor: "precaria", puntos: 3, descripcion: "Chapa, madera, nylon, caña o cartón" },
    ],
  },
  {
    clave: "techo",
    etiqueta: "Techo",
    grupo: "materialidad",
    peso: 3,
    fuente: "foto (audio complementa)",
    opciones: [
      { valor: "material", puntos: 1, descripcion: "Losa / hormigón" },
      { valor: "liviano_con_aislacion", puntos: 2, descripcion: "Chapa o madera con aislación" },
      { valor: "liviano_sin_aislacion", puntos: 3, descripcion: "Chapa o madera sin cielorraso ni aislación" },
    ],
  },
  {
    clave: "piso",
    etiqueta: "Piso",
    grupo: "materialidad",
    peso: 3,
    fuente: "foto",
    opciones: [
      { valor: "material_revestido", puntos: 1, descripcion: "Cerámica, baldosa u otro revestimiento" },
      { valor: "material_sin_terminacion", puntos: 2, descripcion: "Contrapiso sin terminar" },
      { valor: "tierra", puntos: 3, descripcion: "Piso de tierra" },
    ],
  },
  {
    clave: "bano",
    etiqueta: "Baño",
    grupo: "materialidad",
    peso: 3,
    fuente: "foto + audio",
    opciones: [
      { valor: "completo_con_puerta", puntos: 1, descripcion: "Baño completo, con puerta" },
      { valor: "incompleto_o_exterior", puntos: 2, descripcion: "Incompleto, sin puerta o afuera" },
      { valor: "no_tiene", puntos: 3, descripcion: "No tienen baño" },
    ],
  },
];

// ─── 2. HABITABILIDAD (peso 5) ─────────────────────────────────
const habitabilidad: DefinicionCampo[] = [
  {
    clave: "m2PorPersona",
    etiqueta: "m² por persona",
    grupo: "habitabilidad",
    peso: 2,
    fuente: "audio (foto complementa)",
    opciones: [
      { valor: "mas_de_10", puntos: 1, descripcion: "Más de 10 m² por persona" },
      { valor: "de_5_a_10", puntos: 2, descripcion: "De 5 a 10 m² por persona" },
      { valor: "menos_de_5", puntos: 3, descripcion: "Menos de 5 m² por persona" },
    ],
  },
  {
    clave: "ventanas",
    etiqueta: "Ventanas",
    grupo: "habitabilidad",
    peso: 2,
    fuente: "foto",
    opciones: [
      { valor: "suficientes", puntos: 1, descripcion: "Ventanas suficientes" },
      { valor: "insuficientes", puntos: 2, descripcion: "Ventanas insuficientes" },
      { valor: "sin_ventanas", puntos: 3, descripcion: "Sin ventanas" },
    ],
  },
  {
    clave: "separacionAmbientes",
    etiqueta: "Separación de ambientes",
    grupo: "habitabilidad",
    peso: 1,
    fuente: "foto + audio",
    opciones: [
      { valor: "puertas", puntos: 1, descripcion: "Ambientes separados con puertas" },
      { valor: "cortinas", puntos: 2, descripcion: "Separados con cortinas" },
      { valor: "sin_separacion", puntos: 3, descripcion: "Sin separación de ambientes" },
    ],
  },
];

// ─── 3. SEGURIDAD Y SALUBRIDAD (peso 6) ────────────────────────
const seguridad: DefinicionCampo[] = [
  {
    clave: "riesgoDerrumbe",
    etiqueta: "Riesgo de derrumbe",
    grupo: "seguridad",
    peso: 3,
    fuente: "foto + audio",
    opciones: [
      { valor: "normal", puntos: 1, descripcion: "Paredes y techo sin daños visibles" },
      { valor: "rajaduras", puntos: 2, descripcion: "Paredes o techos muy rajados" },
      { valor: "riesgo_derrumbe", puntos: 3, descripcion: "Riesgo de derrumbe o de que vuele el techo" },
    ],
  },
  {
    clave: "inundable",
    etiqueta: "Inundable / plagas",
    grupo: "seguridad",
    peso: 3,
    fuente: "audio (foto complementa)",
    opciones: [
      { valor: "normal", puntos: 1, descripcion: "Sin inundaciones ni plagas" },
      { valor: "plagas", puntos: 2, descripcion: "Presencia de plagas" },
      { valor: "inundable", puntos: 3, descripcion: "Se inunda cuando llueve, marcas de agua" },
    ],
  },
];

// ─── 4. SALUD Y FAMILIA (peso 11) · solo audio ─────────────────
const saludFamilia: DefinicionCampo[] = [
  {
    clave: "enfermedad",
    etiqueta: "Enfermedad o discapacidad",
    grupo: "salud_familia",
    peso: 3,
    fuente: "audio",
    opciones: [
      { valor: "nada", puntos: 0, descripcion: "Sin enfermedad ni discapacidad mencionada" },
      { valor: "leve", puntos: 1, descripcion: "Leve" },
      { valor: "media", puntos: 2, descripcion: "Media" },
      { valor: "grave", puntos: 3, descripcion: "Grave" },
    ],
  },
  {
    clave: "menoresDe5",
    etiqueta: "Menores de 5 años",
    grupo: "salud_familia",
    peso: 3,
    fuente: "audio",
    opciones: [
      { valor: "ninguno", puntos: 0, descripcion: "Ninguno" },
      { valor: "uno", puntos: 1, descripcion: "Uno" },
      { valor: "dos_a_tres", puntos: 2, descripcion: "Dos a tres" },
      { valor: "cuatro_o_mas", puntos: 3, descripcion: "Cuatro o más" },
    ],
  },
  {
    clave: "menores5a12",
    etiqueta: "Menores de 5 a 12 años",
    grupo: "salud_familia",
    peso: 2,
    fuente: "audio",
    opciones: [
      { valor: "ninguno", puntos: 0, descripcion: "Ninguno" },
      { valor: "uno", puntos: 1, descripcion: "Uno" },
      { valor: "dos_a_tres", puntos: 2, descripcion: "Dos a tres" },
      { valor: "cinco_o_mas", puntos: 3, descripcion: "Cinco o más" },
    ],
  },
  {
    clave: "menores12a18",
    etiqueta: "Menores de 12 a 18 años",
    grupo: "salud_familia",
    peso: 1,
    fuente: "audio",
    opciones: [
      { valor: "ninguno", puntos: 0, descripcion: "Ninguno" },
      { valor: "uno", puntos: 1, descripcion: "Uno" },
      { valor: "dos", puntos: 2, descripcion: "Dos" },
      { valor: "tres_o_mas", puntos: 3, descripcion: "Tres o más" },
    ],
  },
  {
    clave: "monoparental",
    etiqueta: "Familia monoparental",
    grupo: "salud_familia",
    peso: 2,
    fuente: "audio",
    opciones: [
      { valor: "padre_y_madre", puntos: 1, descripcion: "Padre y madre" },
      { valor: "solo_padre", puntos: 2, descripcion: "Solo padre" },
      { valor: "solo_madre", puntos: 3, descripcion: "Solo madre" },
    ],
  },
];

// ─── 5. DIMENSIÓN SOCIAL (peso 11) · audio ─────────────────────
const dimensionSocial: DefinicionCampo[] = [
  {
    clave: "vinculoOrganizacion",
    etiqueta: "Vínculo con la organización",
    grupo: "dimension_social",
    peso: 3,
    fuente: "audio",
    opciones: [
      { valor: "menos_de_1_ano", puntos: 1, descripcion: "Menos de 1 año" },
      { valor: "de_1_a_2_anos", puntos: 2, descripcion: "De 1 a 2 años" },
      { valor: "mas_de_2_anos", puntos: 3, descripcion: "Más de 2 años" },
    ],
  },
  {
    clave: "impresionPrimeraVisita",
    etiqueta: "Impresión de la 1ª visita",
    grupo: "dimension_social",
    peso: 3,
    fuente: "fotos + audio (impresión de conjunto)",
    criterio:
      "urgencia percibida mirando TODO junto (estado de la vivienda, familia, salud, riesgos)",
    opciones: [
      { valor: "baja", puntos: 1, descripcion: "Baja urgencia percibida" },
      { valor: "media", puntos: 2, descripcion: "Media urgencia percibida" },
      { valor: "alta", puntos: 3, descripcion: "Alta urgencia percibida" },
    ],
  },
  {
    clave: "desalojo",
    etiqueta: "Desalojo / reinserción familiar",
    grupo: "dimension_social",
    peso: 2,
    fuente: "audio",
    opciones: [
      { valor: "largo_plazo", puntos: 1, descripcion: "Largo plazo o sin riesgo" },
      { valor: "mediano_plazo", puntos: 2, descripcion: "Mediano plazo" },
      { valor: "inmediato", puntos: 3, descripcion: "Inmediato" },
    ],
  },
  {
    clave: "adicionales",
    etiqueta: "Adicionales",
    grupo: "dimension_social",
    peso: 3,
    fuente: "audio",
    criterio:
      "otras vulnerabilidades de la familia que no entran en los demás campos (ej. sin trabajo, sin agua potable, violencia, embarazo, persona postrada)",
    opciones: [
      { valor: "ninguno", puntos: 1, descripcion: "Ninguno" },
      { valor: "algunos", puntos: 2, descripcion: "Algunos" },
      { valor: "graves", puntos: 3, descripcion: "Graves" },
    ],
  },
];

export const CAMPOS_FICHA: DefinicionCampo[] = [
  ...materialidad,
  ...habitabilidad,
  ...seguridad,
  ...saludFamilia,
  ...dimensionSocial,
];

// Claves de campo en el orden del schema, para iterar.
export const CLAVES_CAMPO = CAMPOS_FICHA.map((c) => c.clave);

// Busca la definición de un campo por su clave.
export function definicionDe(clave: string): DefinicionCampo | undefined {
  return CAMPOS_FICHA.find((c) => c.clave === clave);
}

// Claves de los campos que la IA dejó dudosos, en el orden de la ficha.
export function clavesDudosas(campos: Record<string, CampoFicha>): string[] {
  return CLAVES_CAMPO.filter((clave) => campos[clave]?.dudoso);
}

// true = faltan datos: la ficha no se muestra hasta completar audio o fotos.
export function faltanDatos(campos: Record<string, CampoFicha>): boolean {
  return clavesDudosas(campos).length >= MAX_DUDOSOS_PARA_MOSTRAR_FICHA;
}

// Puntuación de un valor dentro de un campo (0 si no se encuentra).
export function puntosDe(clave: string, valor: string): number {
  const def = definicionDe(clave);
  if (!def) return 0;
  return def.opciones.find((o) => o.valor === valor)?.puntos ?? 0;
}

// ─── Fórmula de urgencia (FICHA.md, tabla de Cireneos) ─────────
// total = Σ (peso × puntuación)        → 0..135
export function calcularPuntajeTabla(campos: Record<string, CampoFicha>): number {
  let total = 0;
  for (const def of CAMPOS_FICHA) {
    const campo = campos[def.clave];
    if (!campo) continue;
    total += def.peso * puntosDe(def.clave, campo.valor);
  }
  return total;
}

// base = total / 135 × 100             → 0..100
export function calcularPuntajeBase(campos: Record<string, CampoFicha>): number {
  const total = calcularPuntajeTabla(campos);
  return Math.round((total / PUNTAJE_MAXIMO) * 100 * 10) / 10;
}

// espera = +1 punto por mes desde el relevamiento, tope +12
export function puntosEspera(relevadoEn: number, ahora: number): number {
  const meses = Math.floor((ahora - relevadoEn) / (1000 * 60 * 60 * 24 * 30));
  return Math.max(0, Math.min(12, meses));
}

// puntaje = base × (1 + ajuste%) + espera
export function calcularPuntajeFinal(
  base: number,
  ajustePorcentaje: number,
  puntosDeEspera: number
): number {
  const final = base * (1 + ajustePorcentaje / 100) + puntosDeEspera;
  return Math.round(final * 10) / 10;
}
