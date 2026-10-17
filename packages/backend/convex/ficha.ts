// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Catálogo de la ficha (fuente única, ver FICHA.md)
//
// Define para cada campo: su peso, la lista cerrada de valores con
// sus puntos y una descripción. Lo usan tanto el prompt de Claude
// (para que elija SOLO valores válidos) como la fórmula de urgencia.
// ─────────────────────────────────────────────────────────────

export type Confianza = "alta" | "media" | "baja";

export type CampoFicha = {
  valor: string;
  evidencia: string;
  confianza: Confianza;
  aConfirmar: boolean;
};

export type OpcionValor = {
  valor: string;
  puntos: number;
  descripcion: string;
};

export type DefinicionCampo = {
  clave: string; // nombre del campo en el schema
  etiqueta: string; // nombre legible
  grupo: "vivienda" | "familia";
  peso: number;
  fuente: string; // de dónde sale (foto / audio / ambos)
  opciones: OpcionValor[];
};

// ─── VIVIENDA (peso total 55) ──────────────────────────────────
const vivienda: DefinicionCampo[] = [
  {
    clave: "techo",
    etiqueta: "Techo",
    grupo: "vivienda",
    peso: 12,
    fuente: "foto (audio complementa)",
    opciones: [
      { valor: "material", puntos: 0, descripcion: "Losa / hormigón, sin filtraciones" },
      { valor: "chapa_buena", puntos: 3, descripcion: "Chapa entera, fijada, sin óxido" },
      { valor: "chapa_deteriorada", puntos: 7, descripcion: "Óxido, agujeros, parches, se llueve" },
      { valor: "madera_carton", puntos: 8, descripcion: "Tablas, cartón, fibrocemento roto" },
      { valor: "nylon_lona", puntos: 10, descripcion: "Nylon o lona como cubierta principal" },
    ],
  },
  {
    clave: "paredes",
    etiqueta: "Paredes",
    grupo: "vivienda",
    peso: 10,
    fuente: "foto",
    opciones: [
      { valor: "bloque_terminado", puntos: 0, descripcion: "Bloque o ladrillo revocado, sin grietas" },
      { valor: "bloque_sin_terminar", puntos: 3, descripcion: "Bloque sin revocar, aberturas sin cerrar" },
      { valor: "madera_chapa", puntos: 6, descripcion: "Tablas o chapa como paredes" },
      { valor: "mixto_precario", puntos: 8, descripcion: "Cartón, restos, materiales recuperados" },
      { valor: "nylon_incompletas", puntos: 10, descripcion: "Nylon, lona o paredes que no cierran" },
    ],
  },
  {
    clave: "piso",
    etiqueta: "Piso",
    grupo: "vivienda",
    peso: 6,
    fuente: "foto",
    opciones: [
      { valor: "ceramica_contrapiso", puntos: 0, descripcion: "Piso terminado" },
      { valor: "contrapiso_deteriorado", puntos: 3, descripcion: "Contrapiso roto o con desniveles" },
      { valor: "madera_sobre_tierra", puntos: 6, descripcion: "Tarimas o tablas apoyadas en tierra" },
      { valor: "tierra", puntos: 10, descripcion: "Piso de tierra" },
    ],
  },
  {
    clave: "humedad",
    etiqueta: "Humedad",
    grupo: "vivienda",
    peso: 7,
    fuente: "foto + audio",
    opciones: [
      { valor: "sin_signos", puntos: 0, descripcion: "Paredes y techo secos" },
      { valor: "leve", puntos: 3, descripcion: "Manchas puntuales" },
      { valor: "extendida", puntos: 7, descripcion: "Moho, manchas grandes, olor mencionado" },
      { valor: "filtracion_activa", puntos: 10, descripcion: "Goteras, agua entrando, se inunda" },
    ],
  },
  {
    clave: "riesgoElectrico",
    etiqueta: "Riesgo eléctrico",
    grupo: "vivienda",
    peso: 10,
    fuente: "foto + audio",
    opciones: [
      { valor: "instalacion_segura", puntos: 0, descripcion: "Tablero, cables embutidos o canalizados" },
      { valor: "sin_electricidad", puntos: 5, descripcion: "No hay luz eléctrica" },
      { valor: "cables_expuestos", puntos: 6, descripcion: "Empalmes visibles, cables sueltos dentro" },
      { valor: "conexion_irregular_peligrosa", puntos: 10, descripcion: "Conexión colgada, cables cerca de agua/chapa" },
    ],
  },
  {
    clave: "bano",
    etiqueta: "Baño",
    grupo: "vivienda",
    peso: 5,
    fuente: "foto + audio",
    opciones: [
      { valor: "interno_completo", puntos: 0, descripcion: "Baño dentro con descarga" },
      { valor: "interno_precario", puntos: 4, descripcion: "Dentro pero sin descarga o sin terminar" },
      { valor: "externo_letrina", puntos: 7, descripcion: "Letrina o baño afuera" },
      { valor: "sin_bano", puntos: 10, descripcion: "No tienen baño" },
    ],
  },
  {
    clave: "agua",
    etiqueta: "Agua",
    grupo: "vivienda",
    peso: 5,
    fuente: "audio (foto complementa)",
    opciones: [
      { valor: "red_dentro", puntos: 0, descripcion: "Canilla dentro de la vivienda" },
      { valor: "canilla_terreno", puntos: 4, descripcion: "Canilla en el terreno, afuera" },
      { valor: "compartida", puntos: 7, descripcion: "Canilla de un vecino o comunitaria" },
      { valor: "sin_acceso", puntos: 10, descripcion: "Acarrean agua desde lejos" },
    ],
  },
];

// ─── FAMILIA (peso total 45) · solo del audio ──────────────────
const familia: DefinicionCampo[] = [
  {
    clave: "integrantes",
    etiqueta: "Integrantes",
    grupo: "familia",
    peso: 8,
    fuente: "audio",
    opciones: [
      { valor: "1-2", puntos: 2, descripcion: "1 a 2 personas" },
      { valor: "3-4", puntos: 5, descripcion: "3 a 4 personas" },
      { valor: "5-6", puntos: 8, descripcion: "5 a 6 personas" },
      { valor: "7+", puntos: 10, descripcion: "7 o más personas" },
    ],
  },
  {
    clave: "menores",
    etiqueta: "Menores de 18",
    grupo: "familia",
    peso: 9,
    fuente: "audio",
    opciones: [
      { valor: "0", puntos: 0, descripcion: "Sin menores" },
      { valor: "1", puntos: 5, descripcion: "1 menor" },
      { valor: "2", puntos: 7, descripcion: "2 menores" },
      { valor: "3+", puntos: 10, descripcion: "3 o más menores" },
    ],
  },
  {
    clave: "mayores",
    etiqueta: "Mayores de 65",
    grupo: "familia",
    peso: 5,
    fuente: "audio",
    opciones: [
      { valor: "0", puntos: 0, descripcion: "Sin mayores de 65" },
      { valor: "1", puntos: 6, descripcion: "1 mayor de 65" },
      { valor: "2+", puntos: 10, descripcion: "2 o más mayores de 65" },
    ],
  },
  {
    clave: "discapacidad",
    etiqueta: "Discapacidad",
    grupo: "familia",
    peso: 8,
    fuente: "audio",
    opciones: [
      { valor: "no", puntos: 0, descripcion: "Sin discapacidad mencionada" },
      { valor: "si_sin_adaptacion", puntos: 6, descripcion: "Hay discapacidad, vivienda sin adaptar" },
      { valor: "si_requiere_accesibilidad", puntos: 10, descripcion: "Requiere accesibilidad" },
    ],
  },
  {
    clave: "enfermedadGrave",
    etiqueta: "Enfermedad grave",
    grupo: "familia",
    peso: 8,
    fuente: "audio",
    opciones: [
      { valor: "no", puntos: 0, descripcion: "Sin enfermedad grave mencionada" },
      { valor: "si_cronica", puntos: 5, descripcion: "Enfermedad crónica" },
      { valor: "si_agravada_por_vivienda", puntos: 10, descripcion: "Agravada por la vivienda" },
    ],
  },
  {
    clave: "embarazo",
    etiqueta: "Embarazo",
    grupo: "familia",
    peso: 7,
    fuente: "audio",
    opciones: [
      { valor: "no", puntos: 0, descripcion: "Sin embarazo mencionado" },
      { valor: "si", puntos: 10, descripcion: "Hay un embarazo" },
    ],
  },
];

export const CAMPOS_FICHA: DefinicionCampo[] = [...vivienda, ...familia];

// Claves de campo en el orden del schema, para iterar.
export const CLAVES_CAMPO = CAMPOS_FICHA.map((c) => c.clave);

// Busca la definición de un campo por su clave.
export function definicionDe(clave: string): DefinicionCampo | undefined {
  return CAMPOS_FICHA.find((c) => c.clave === clave);
}

// Puntos de un valor dentro de un campo (0 si no se encuentra).
export function puntosDe(clave: string, valor: string): number {
  const def = definicionDe(clave);
  if (!def) return 0;
  return def.opciones.find((o) => o.valor === valor)?.puntos ?? 0;
}

// ─── Fórmula de urgencia (FICHA.md) ────────────────────────────
// base   = Σ (peso × puntos / 10)                 → 0..100
// espera = +1 punto por mes desde el relevamiento, tope +12
// puntaje = base × (1 + ajuste%) + espera
export function calcularPuntajeBase(campos: Record<string, CampoFicha>): number {
  let base = 0;
  for (const def of CAMPOS_FICHA) {
    const campo = campos[def.clave];
    if (!campo) continue;
    base += (def.peso * puntosDe(def.clave, campo.valor)) / 10;
  }
  return Math.round(base * 10) / 10;
}

export function puntosEspera(relevadoEn: number, ahora: number): number {
  const meses = Math.floor((ahora - relevadoEn) / (1000 * 60 * 60 * 24 * 30));
  return Math.max(0, Math.min(12, meses));
}

export function calcularPuntajeFinal(
  base: number,
  ajustePorcentaje: number,
  puntosDeEspera: number
): number {
  const final = base * (1 + ajustePorcentaje / 100) + puntosDeEspera;
  return Math.round(final * 10) / 10;
}
