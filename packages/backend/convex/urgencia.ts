// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Fórmula de urgencia (EN CÓDIGO, NO con IA)
//
// Replica exacta de la tabla de puntajes real de Cireneos
// (docs/tabla_puntajes.xlsx, ver FICHA.md). Vive en el backend para que el
// ranking se calcule del lado servidor de forma determinística.
//
//   total   = Σ (peso_campo × puntuacion_valor)        → 0 a 135
//   base    = total / 135 × 100                         → 0 a 100
//   ajuste  = sugerido por la IA, entre -15% y +15%     → solo si se acepta
//   espera  = +1 punto por mes desde el relevamiento, tope +12
//
//   puntaje = base × (1 + ajuste) + espera
// ─────────────────────────────────────────────────────────────

export const ETIQUETAS_CAMPO: Record<string, string> = {
  pared: "Pared",
  techo: "Techo",
  piso: "Piso",
  bano: "Baño",
  m2PorPersona: "m² por persona",
  ventanas: "Ventanas",
  separacionAmbientes: "Separación de ambientes",
  riesgoDerrumbe: "Riesgo de derrumbe",
  inundable: "Inundable / plagas",
  enfermedad: "Enfermedad o discapacidad",
  menoresDe5: "Menores de 5 años",
  menores5a12: "Menores de 5 a 12",
  menores12a18: "Menores de 12 a 18",
  monoparental: "Familia monoparental",
  vinculoOrganizacion: "Vínculo con la organización",
  impresionPrimeraVisita: "Impresión de la 1ª visita",
  desalojo: "Desalojo / reinserción",
  adicionales: "Adicionales",
};

// Bloques de la tabla (para agrupar en la ficha).
export const BLOQUES: { titulo: string; campos: CampoUrgencia[] }[] = [
  { titulo: "1. Materialidad", campos: ["pared", "techo", "piso", "bano"] },
  { titulo: "2. Habitabilidad", campos: ["m2PorPersona", "ventanas", "separacionAmbientes"] },
  { titulo: "3. Seguridad y salubridad", campos: ["riesgoDerrumbe", "inundable"] },
  {
    titulo: "4. Salud y familia",
    campos: ["enfermedad", "menoresDe5", "menores5a12", "menores12a18", "monoparental"],
  },
  {
    titulo: "5. Dimensión social",
    campos: ["vinculoOrganizacion", "impresionPrimeraVisita", "desalojo", "adicionales"],
  },
];

// Peso de cada campo (1..3). Suma de pesos = 45 → máximo 45 × 3 = 135 (FICHA.md).
export const PESOS = {
  // 1. Materialidad (12)
  pared: 3,
  techo: 3,
  piso: 3,
  bano: 3,
  // 2. Habitabilidad (5)
  m2PorPersona: 2,
  ventanas: 2,
  separacionAmbientes: 1,
  // 3. Seguridad y salubridad (6)
  riesgoDerrumbe: 3,
  inundable: 3,
  // 4. Salud y familia (11)
  enfermedad: 3,
  menoresDe5: 3,
  menores5a12: 2,
  menores12a18: 1,
  monoparental: 2,
  // 5. Dimensión social (11)
  vinculoOrganizacion: 3,
  impresionPrimeraVisita: 3,
  desalojo: 2,
  adicionales: 3,
} as const;

export type CampoUrgencia = keyof typeof PESOS;

export const PESO_TOTAL = 45;
export const PUNTAJE_TABLA_MAX = 135;

// Puntuación de cada valor posible (0..3), por campo. Copiado de FICHA.md.
export const PUNTOS: Record<CampoUrgencia, Record<string, number>> = {
  pared: { material_con_revoque: 1, material_sin_revoque: 2, precaria: 3 },
  techo: { material: 1, liviano_con_aislacion: 2, liviano_sin_aislacion: 3 },
  piso: { material_revestido: 1, material_sin_terminacion: 2, tierra: 3 },
  bano: { completo_con_puerta: 1, incompleto_o_exterior: 2, no_tiene: 3 },
  m2PorPersona: { mas_de_10: 1, de_5_a_10: 2, menos_de_5: 3 },
  ventanas: { suficientes: 1, insuficientes: 2, sin_ventanas: 3 },
  separacionAmbientes: { puertas: 1, cortinas: 2, sin_separacion: 3 },
  riesgoDerrumbe: { normal: 1, rajaduras: 2, riesgo_derrumbe: 3 },
  inundable: { normal: 1, plagas: 2, inundable: 3 },
  enfermedad: { nada: 0, leve: 1, media: 2, grave: 3 },
  menoresDe5: { ninguno: 0, uno: 1, dos_a_tres: 2, cuatro_o_mas: 3 },
  menores5a12: { ninguno: 0, uno: 1, dos_a_tres: 2, cinco_o_mas: 3 },
  menores12a18: { ninguno: 0, uno: 1, dos: 2, tres_o_mas: 3 },
  monoparental: { padre_y_madre: 1, solo_padre: 2, solo_madre: 3 },
  vinculoOrganizacion: { menos_de_1_ano: 1, de_1_a_2_anos: 2, mas_de_2_anos: 3 },
  impresionPrimeraVisita: { baja: 1, media: 2, alta: 3 },
  desalojo: { largo_plazo: 1, mediano_plazo: 2, inmediato: 3 },
  adicionales: { ninguno: 1, algunos: 2, graves: 3 },
};

// Texto legible de cada valor, para la ficha y la explicación.
export const TEXTO_VALOR: Record<string, string> = {
  // pared
  material_con_revoque: "material con revoque",
  material_sin_revoque: "material sin revoque",
  precaria: "precaria (chapa/madera/nylon)",
  // techo
  material: "material (losa / hormigón)",
  liviano_con_aislacion: "liviano con aislación",
  liviano_sin_aislacion: "liviano sin aislación",
  // piso
  material_revestido: "material revestido",
  material_sin_terminacion: "contrapiso sin terminar",
  tierra: "piso de tierra",
  // baño
  completo_con_puerta: "completo, con puerta",
  incompleto_o_exterior: "incompleto o exterior",
  no_tiene: "no tiene baño",
  // m2
  mas_de_10: "más de 10 m²",
  de_5_a_10: "de 5 a 10 m²",
  menos_de_5: "menos de 5 m²",
  // ventanas
  suficientes: "suficientes",
  insuficientes: "insuficientes",
  sin_ventanas: "sin ventanas",
  // separación
  puertas: "con puertas",
  cortinas: "con cortinas",
  sin_separacion: "sin separación",
  // riesgo derrumbe
  normal: "normal",
  rajaduras: "rajaduras",
  riesgo_derrumbe: "riesgo de derrumbe",
  // inundable
  plagas: "plagas",
  inundable: "inundable",
  // enfermedad
  nada: "sin enfermedad",
  leve: "leve",
  media: "media",
  grave: "grave",
  // menores
  ninguno: "ninguno",
  uno: "uno",
  dos_a_tres: "dos a tres",
  cuatro_o_mas: "cuatro o más",
  cinco_o_mas: "cinco o más",
  dos: "dos",
  tres_o_mas: "tres o más",
  // monoparental
  padre_y_madre: "padre y madre",
  solo_padre: "solo el padre",
  solo_madre: "solo la madre",
  // vínculo
  menos_de_1_ano: "menos de 1 año",
  de_1_a_2_anos: "de 1 a 2 años",
  mas_de_2_anos: "más de 2 años",
  // impresión
  baja: "baja",
  // desalojo
  largo_plazo: "largo plazo",
  mediano_plazo: "mediano plazo",
  inmediato: "inmediato",
  // adicionales
  algunos: "algunos",
  graves: "graves",
};

export interface AporteCampo {
  campo: CampoUrgencia;
  etiqueta: string;
  valor: string;
  textoValor: string;
  peso: number;
  puntos: number; // puntuación del valor (0..3)
  aporte: number; // peso × puntuación
}

export interface AjusteCaso {
  porcentaje: number;
  motivo: string;
  evidencia: string;
  estado: "sugerido" | "aceptado" | "rechazado";
}

export interface ResultadoUrgencia {
  total: number; // 0..135 (TOTAL de la planilla)
  base: number; // 0..100
  espera: number;
  mesesEspera: number;
  ajusteAplicado: number;
  puntajeFinal: number;
  aportes: AporteCampo[];
  explicacion: string;
}

const MESES_MS = 1000 * 60 * 60 * 24 * 30.4375;

export function mesesDeEspera(relevadoEn: number, ahora: number): number {
  return Math.max(0, Math.floor((ahora - relevadoEn) / MESES_MS));
}

export function puntosEspera(meses: number): number {
  return Math.min(12, Math.max(0, meses));
}

function redondear(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Calcula el puntaje de urgencia de forma determinística a partir de los
 * valores de cada campo, el ajuste (opcional) y la fecha de relevamiento.
 */
export function calcularUrgencia(
  campos: Record<string, string>,
  relevadoEn: number,
  ahora: number,
  ajuste?: AjusteCaso,
): ResultadoUrgencia {
  const aportes: AporteCampo[] = (Object.keys(PESOS) as CampoUrgencia[]).map((campo) => {
    const valor = campos[campo];
    const peso = PESOS[campo];
    const puntos = PUNTOS[campo]?.[valor] ?? 0;
    return {
      campo,
      etiqueta: ETIQUETAS_CAMPO[campo] ?? campo,
      valor,
      textoValor: TEXTO_VALOR[valor] ?? valor,
      peso,
      puntos,
      aporte: peso * puntos,
    };
  });

  const total = aportes.reduce((acc, a) => acc + a.aporte, 0);
  const base = (total / PUNTAJE_TABLA_MAX) * 100;
  const meses = mesesDeEspera(relevadoEn, ahora);
  const espera = puntosEspera(meses);
  const ajusteAplicado = ajuste && ajuste.estado === "aceptado" ? ajuste.porcentaje / 100 : 0;
  const puntajeFinal = base * (1 + ajusteAplicado) + espera;
  const aportesOrdenados = [...aportes].sort((a, b) => b.aporte - a.aporte);

  return {
    total,
    base: redondear(base),
    espera,
    mesesEspera: meses,
    ajusteAplicado,
    puntajeFinal: redondear(puntajeFinal),
    aportes: aportesOrdenados,
    explicacion: explicar(aportesOrdenados, { espera, meses, ajusteAplicado }, ajuste),
  };
}

/** Explicación en lenguaje simple (lo que escribiría Claude en el flujo real). */
function explicar(
  aportes: AporteCampo[],
  r: { espera: number; meses: number; ajusteAplicado: number },
  ajuste?: AjusteCaso,
): string {
  const top = aportes.filter((a) => a.aporte > 0).slice(0, 3);

  let texto: string;
  if (top.length === 0) {
    texto = "La vivienda no presenta carencias relevantes según la ficha.";
  } else {
    const frases = top.map((a) => `${a.etiqueta.toLowerCase()} (${a.textoValor})`);
    const lista =
      frases.length === 1
        ? frases[0]
        : `${frases.slice(0, -1).join(", ")} y ${frases[frases.length - 1]}`;
    texto = `Lo que más pesa es ${lista}.`;
  }

  if (r.espera > 0) {
    texto += ` Suma ${r.espera} ${r.espera === 1 ? "punto" : "puntos"} por ${r.meses} ${
      r.meses === 1 ? "mes" : "meses"
    } de espera desde el relevamiento.`;
  }

  if (r.ajusteAplicado !== 0 && ajuste) {
    const signo = r.ajusteAplicado > 0 ? "sube" : "baja";
    texto += ` Un ajuste aceptado ${signo} el puntaje ${Math.abs(ajuste.porcentaje)}%: ${ajuste.motivo}`;
  } else if (ajuste && ajuste.estado === "sugerido") {
    texto += ` Hay un ajuste sugerido (${ajuste.porcentaje > 0 ? "+" : ""}${ajuste.porcentaje}%) pendiente de que el coordinador lo acepte.`;
  }

  return texto;
}

export const META_CASA_USD = 15000;
