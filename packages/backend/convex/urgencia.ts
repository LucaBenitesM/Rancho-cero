// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Fórmula de urgencia (EN CÓDIGO, NO con IA)
//
// Replica exacta de la tabla de puntajes de FICHA.md. Vive en el backend
// para que el ranking se calcule del lado servidor de forma determinística.
//
//   base    = Σ (peso_campo × puntos_valor / 10)        → 0 a 100
//   ajuste  = sugerido por la IA, entre -15% y +15%     → solo si se acepta
//   espera  = +1 punto por mes desde el relevamiento, tope +12
//
//   puntaje = base × (1 + ajuste) + espera
// ─────────────────────────────────────────────────────────────

export const ETIQUETAS_CAMPO: Record<string, string> = {
  techo: "Techo",
  paredes: "Paredes",
  piso: "Piso",
  humedad: "Humedad",
  riesgoElectrico: "Riesgo eléctrico",
  bano: "Baño",
  agua: "Agua",
  integrantes: "Integrantes",
  menores: "Menores de 18",
  mayores: "Mayores de 65",
  discapacidad: "Discapacidad",
  enfermedadGrave: "Enfermedad grave",
  embarazo: "Embarazo",
};

// Pesos por campo (FICHA.md). Vivienda = 55, Familia = 45. Total = 100.
export const PESOS = {
  techo: 12,
  paredes: 10,
  piso: 6,
  humedad: 7,
  riesgoElectrico: 10,
  bano: 5,
  agua: 5,
  integrantes: 8,
  menores: 9,
  mayores: 5,
  discapacidad: 8,
  enfermedadGrave: 8,
  embarazo: 7,
} as const;

export type CampoUrgencia = keyof typeof PESOS;

export const PUNTOS: Record<CampoUrgencia, Record<string, number>> = {
  techo: { material: 0, chapa_buena: 3, chapa_deteriorada: 7, madera_carton: 8, nylon_lona: 10 },
  paredes: {
    bloque_terminado: 0,
    bloque_sin_terminar: 3,
    madera_chapa: 6,
    mixto_precario: 8,
    nylon_incompletas: 10,
  },
  piso: { ceramica_contrapiso: 0, contrapiso_deteriorado: 3, madera_sobre_tierra: 6, tierra: 10 },
  humedad: { sin_signos: 0, leve: 3, extendida: 7, filtracion_activa: 10 },
  riesgoElectrico: {
    instalacion_segura: 0,
    sin_electricidad: 5,
    cables_expuestos: 6,
    conexion_irregular_peligrosa: 10,
  },
  bano: { interno_completo: 0, interno_precario: 4, externo_letrina: 7, sin_bano: 10 },
  agua: { red_dentro: 0, canilla_terreno: 4, compartida: 7, sin_acceso: 10 },
  integrantes: { "1-2": 2, "3-4": 5, "5-6": 8, "7+": 10 },
  menores: { "0": 0, "1": 5, "2": 7, "3+": 10 },
  mayores: { "0": 0, "1": 6, "2+": 10 },
  discapacidad: { no: 0, si_sin_adaptacion: 6, si_requiere_accesibilidad: 10 },
  enfermedadGrave: { no: 0, si_cronica: 5, si_agravada_por_vivienda: 10 },
  embarazo: { no: 0, si: 10 },
};

export const TEXTO_VALOR: Record<string, string> = {
  material: "losa / hormigón",
  chapa_buena: "chapa buena",
  chapa_deteriorada: "chapa deteriorada",
  madera_carton: "madera / cartón",
  nylon_lona: "nylon / lona",
  bloque_terminado: "bloque terminado",
  bloque_sin_terminar: "bloque sin terminar",
  madera_chapa: "madera / chapa",
  mixto_precario: "mixto precario",
  nylon_incompletas: "nylon / incompletas",
  ceramica_contrapiso: "cerámica / contrapiso",
  contrapiso_deteriorado: "contrapiso deteriorado",
  madera_sobre_tierra: "madera sobre tierra",
  tierra: "piso de tierra",
  sin_signos: "sin signos",
  leve: "leve",
  extendida: "extendida",
  filtracion_activa: "filtración activa",
  instalacion_segura: "instalación segura",
  sin_electricidad: "sin electricidad",
  cables_expuestos: "cables expuestos",
  conexion_irregular_peligrosa: "conexión irregular peligrosa",
  interno_completo: "interno completo",
  interno_precario: "interno precario",
  externo_letrina: "externo / letrina",
  sin_bano: "sin baño",
  red_dentro: "red dentro",
  canilla_terreno: "canilla en el terreno",
  compartida: "compartida",
  sin_acceso: "sin acceso",
  "1-2": "1 a 2 personas",
  "3-4": "3 a 4 personas",
  "5-6": "5 a 6 personas",
  "7+": "7 o más personas",
  "0": "ninguno",
  "1": "1",
  "2": "2",
  "3+": "3 o más",
  "2+": "2 o más",
  no: "no",
  si: "sí",
  si_sin_adaptacion: "sí, sin adaptación",
  si_requiere_accesibilidad: "sí, requiere accesibilidad",
  si_cronica: "sí, crónica",
  si_agravada_por_vivienda: "sí, agravada por la vivienda",
};

export interface AporteCampo {
  campo: CampoUrgencia;
  etiqueta: string;
  valor: string;
  textoValor: string;
  peso: number;
  puntos: number;
  aporte: number;
}

export interface AjusteCaso {
  porcentaje: number;
  motivo: string;
  evidencia: string;
  estado: "sugerido" | "aceptado" | "rechazado";
}

export interface ResultadoUrgencia {
  base: number;
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
      aporte: (peso * puntos) / 10,
    };
  });

  const base = aportes.reduce((acc, a) => acc + a.aporte, 0);
  const meses = mesesDeEspera(relevadoEn, ahora);
  const espera = puntosEspera(meses);
  const ajusteAplicado = ajuste && ajuste.estado === "aceptado" ? ajuste.porcentaje / 100 : 0;
  const puntajeFinal = base * (1 + ajusteAplicado) + espera;
  const aportesOrdenados = [...aportes].sort((a, b) => b.aporte - a.aporte);

  return {
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
