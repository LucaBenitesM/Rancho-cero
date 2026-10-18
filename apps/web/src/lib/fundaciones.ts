// relevAI — catálogo de fundaciones del portal.
//
// relevAI es la capa "madre": un portal donde viven los perfiles de las
// fundaciones. Cireneos es la única con app real (el programa Rancho Cero);
// las que agrega el usuario son de muestra y se guardan en localStorage para
// que persistan entre recargas durante la demo. No tocan Convex.

export interface Fundacion {
  id: string;
  nombre: string;
  descripcion: string;
  /** Localidad o país, para el subtítulo de la tarjeta. */
  lugar: string;
  /** Iniciales para el monograma de la tarjeta (ej. "CI"). */
  iniciales: string;
  /** Ruta interna si la fundación tiene app; undefined = "Próximamente". */
  ruta?: string;
  /** true solo para Cireneos (no se puede borrar ni editar). */
  fija?: boolean;
}

// Fundación base: siempre presente, abre la app actual (Rancho Cero).
export const CIRENEOS: Fundacion = {
  id: "cireneos",
  nombre: "Cireneos",
  descripcion:
    "Programa Rancho Cero: releva visitas con IA y prioriza familias por urgencia habitacional.",
  lugar: "Uruguay",
  iniciales: "CI",
  ruta: "/cireneos",
  fija: true,
};

const CLAVE_STORAGE = "relevai:fundaciones";

// Monograma a partir del nombre (dos primeras iniciales de palabras).
export function inicialesDe(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "?";
  if (palabras.length === 1) return palabras[0]!.slice(0, 2).toUpperCase();
  return (palabras[0]![0]! + palabras[1]![0]!).toUpperCase();
}

// Fundaciones agregadas por el usuario (solo navegador).
export function leerAgregadas(): Fundacion[] {
  if (typeof window === "undefined") return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE_STORAGE);
    if (!crudo) return [];
    const data = JSON.parse(crudo);
    return Array.isArray(data) ? (data as Fundacion[]) : [];
  } catch {
    return [];
  }
}

// Lista completa para el portal: Cireneos primero, luego las agregadas.
export function leerFundaciones(): Fundacion[] {
  return [CIRENEOS, ...leerAgregadas()];
}

// Agrega una fundación de muestra (sin app). Devuelve la lista agregada nueva.
export function agregarFundacion(datos: {
  nombre: string;
  descripcion: string;
  lugar: string;
}): Fundacion[] {
  const nueva: Fundacion = {
    id: `f-${Date.now()}`,
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion.trim(),
    lugar: datos.lugar.trim(),
    iniciales: inicialesDe(datos.nombre),
  };
  const agregadas = [...leerAgregadas(), nueva];
  window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(agregadas));
  return agregadas;
}
