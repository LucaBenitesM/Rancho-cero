// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Fórmula de urgencia (EN CÓDIGO, NO con IA)
//
// Deriva TODO de ficha.ts (fuente única: tabla real de Cireneos). No duplica
// pesos ni puntuaciones. Se usa para calcular el ranking del lado servidor.
//
//   total   = Σ (peso_campo × puntuacion_valor)        → 0 a 135
//   base    = total / 135 × 100                         → 0 a 100
//   ajuste  = sugerido por la IA, entre -15% y +15%     → solo si se acepta
//   espera  = +1 punto por mes desde el relevamiento, tope +12
//
//   puntaje = base × (1 + ajuste) + espera
// ─────────────────────────────────────────────────────────────

import {
  CAMPOS_FICHA,
  PUNTAJE_MAXIMO,
  calcularPuntajeFinal,
  puntosDe,
  puntosEspera as puntosEsperaFicha,
} from "./ficha";

export type CampoUrgencia = string;

// Bloques de la tabla (para agrupar en la ficha del front).
export const BLOQUES: { titulo: string; campos: string[] }[] = [
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

export const PUNTAJE_TABLA_MAX = PUNTAJE_MAXIMO;
export const META_CASA_USD = 15000;

export interface AporteCampo {
  campo: string;
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
  ajusteAplicado: number; // fracción: 0, 0.1, -0.05...
  puntajeFinal: number;
  aportes: AporteCampo[];
  explicacion: string;
}

const MESES_MS = 1000 * 60 * 60 * 24 * 30;

export function mesesDeEspera(relevadoEn: number, ahora: number): number {
  return Math.max(0, Math.floor((ahora - relevadoEn) / MESES_MS));
}

// Texto legible de un valor: sale de la descripción del catálogo (ficha.ts).
function textoValorDe(clave: string, valor: string): string {
  const def = CAMPOS_FICHA.find((c) => c.clave === clave);
  return def?.opciones.find((o) => o.valor === valor)?.descripcion ?? valor;
}

/**
 * Calcula el puntaje de urgencia de forma determinística a partir de los
 * valores de cada campo, el ajuste (opcional) y la fecha de relevamiento.
 * Usa exclusivamente los pesos/puntos de ficha.ts.
 */
export function calcularUrgencia(
  campos: Record<string, string>,
  relevadoEn: number,
  ahora: number,
  ajuste?: AjusteCaso,
): ResultadoUrgencia {
  const aportes: AporteCampo[] = CAMPOS_FICHA.map((def) => {
    const valor = campos[def.clave] ?? "";
    const puntos = puntosDe(def.clave, valor);
    return {
      campo: def.clave,
      etiqueta: def.etiqueta,
      valor,
      textoValor: textoValorDe(def.clave, valor),
      peso: def.peso,
      puntos,
      aporte: def.peso * puntos,
    };
  });

  const total = aportes.reduce((acc, a) => acc + a.aporte, 0);
  const base = Math.round((total / PUNTAJE_MAXIMO) * 100 * 10) / 10;
  const meses = mesesDeEspera(relevadoEn, ahora);
  const espera = puntosEsperaFicha(relevadoEn, ahora);
  const aplicaAjuste = ajuste && ajuste.estado === "aceptado";
  const pct = aplicaAjuste ? ajuste.porcentaje : 0;
  const ajusteAplicado = pct / 100;
  const puntajeFinal = calcularPuntajeFinal(base, pct, espera);
  const aportesOrdenados = [...aportes].sort((a, b) => b.aporte - a.aporte);

  return {
    total,
    base,
    espera,
    mesesEspera: meses,
    ajusteAplicado,
    puntajeFinal,
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
    const frases = top.map((a) => `${a.etiqueta.toLowerCase()} (${a.textoValor.toLowerCase()})`);
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
