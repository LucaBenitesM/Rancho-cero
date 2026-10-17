// Textos para pedirle más datos al voluntario cuando la IA deja demasiados
// campos dudosos (ver MAX_DUDOSOS_PARA_MOSTRAR_FICHA en convex/ficha.ts).
//
// Cada campo dice qué no se pudo saber (en palabras simples) y si conviene
// una foto (lo que se ve de la vivienda) o un audio (lo que cuenta la familia).

export type TipoPedido = "foto" | "audio";

type Pedido = {
  tipo: TipoPedido;
  falta: string; // completa la frase "No pudimos saber ..."
  sugerencia: string;
};

const NINOS: Pedido = {
  tipo: "audio",
  falta: "cuántos niños viven y de qué edades",
  sugerencia: "Grabá un audio contando cuántos niños y adolescentes viven y qué edad tiene cada uno.",
};

const PEDIDOS: Record<string, Pedido> = {
  // Vivienda: se ve en las fotos.
  pared: {
    tipo: "foto",
    falta: "de qué son las paredes",
    sugerencia: "Sacá una foto más clara de las paredes, de cerca.",
  },
  techo: {
    tipo: "foto",
    falta: "cómo es el techo",
    sugerencia: "Sacá una foto más clara del techo, desde adentro.",
  },
  piso: {
    tipo: "foto",
    falta: "de qué es el piso",
    sugerencia: "Sacá una foto más clara del piso.",
  },
  bano: {
    tipo: "foto",
    falta: "si hay baño adentro y si está completo",
    sugerencia: "Sacá una foto más clara del baño.",
  },
  ventanas: {
    tipo: "foto",
    falta: "si hay ventanas suficientes",
    sugerencia: "Sacá una foto más clara de las ventanas de los ambientes.",
  },
  separacionAmbientes: {
    tipo: "foto",
    falta: "si los ambientes están separados",
    sugerencia: "Sacá una foto más clara de adentro, donde se vea cómo se separan los ambientes.",
  },
  riesgoDerrumbe: {
    tipo: "foto",
    falta: "si hay rajaduras o riesgo de derrumbe",
    sugerencia: "Sacá una foto más clara de las rajaduras o de las partes dañadas.",
  },
  inundable: {
    tipo: "foto",
    falta: "si la casa se inunda o tiene humedad o plagas",
    sugerencia: "Sacá una foto más clara de la humedad o de las marcas de agua.",
  },

  // Familia: sale de lo que se cuenta en el audio.
  m2PorPersona: {
    tipo: "audio",
    falta: "cuántas personas viven y qué tan grande es la casa",
    sugerencia: "Grabá un audio contando cuántas personas viven y cuántas piezas hay.",
  },
  enfermedad: {
    tipo: "audio",
    falta: "si alguien tiene una enfermedad o discapacidad",
    sugerencia: "Grabá un audio contando si alguien tiene una enfermedad o discapacidad.",
  },
  // Las tres franjas de edad se piden juntas (una sola frase en el mensaje).
  menoresDe5: NINOS,
  menores5a12: NINOS,
  menores12a18: NINOS,
  monoparental: {
    tipo: "audio",
    falta: "quiénes están a cargo de la familia",
    sugerencia: "Grabá un audio contando si viven el padre y la madre, o solo uno de los dos.",
  },
  vinculoOrganizacion: {
    tipo: "audio",
    falta: "hace cuánto conocen a la organización",
    sugerencia: "Grabá un audio contando hace cuánto la familia conoce a la organización.",
  },
  impresionPrimeraVisita: {
    tipo: "audio",
    falta: "qué tan urgente te pareció la situación",
    sugerencia: "Grabá un audio contando qué tan urgente te pareció la situación y por qué.",
  },
  desalojo: {
    tipo: "audio",
    falta: "si corren riesgo de desalojo",
    sugerencia: "Grabá un audio contando si la familia corre riesgo de desalojo y cuándo.",
  },
  adicionales: {
    tipo: "audio",
    falta: "si la familia tiene otros problemas (trabajo, agua, embarazo, violencia)",
    sugerencia:
      "Grabá un audio contando si hay otros problemas: falta de trabajo o de agua, embarazo, violencia.",
  },
};

export type FaltaDato = Pedido & { clave: string };

// Lo que falta, en el orden de la ficha. Ignora claves sin texto y no repite
// pedidos compartidos (las edades de los niños van en uno solo).
export function datosQueFaltan(claves: string[]): FaltaDato[] {
  const vistos = new Set<Pedido>();
  return claves.flatMap((clave) => {
    const pedido = PEDIDOS[clave];
    if (!pedido || vistos.has(pedido)) return [];
    vistos.add(pedido);
    return [{ clave, ...pedido }];
  });
}

// "No pudimos saber cuántos niños viven, si hay baño adentro ni de qué es el piso."
export function mensajeFaltante(faltan: FaltaDato[]): string {
  const partes = faltan.map((f) => f.falta);
  if (partes.length === 0) return "";
  if (partes.length === 1) return `No pudimos saber ${partes[0]}.`;
  return `No pudimos saber ${partes.slice(0, -1).join(", ")} ni ${partes[partes.length - 1]}.`;
}

// Recomendación general según qué falte más: audio, fotos o las dos cosas.
export function recomendacionGeneral(faltan: FaltaDato[]): string {
  const audios = faltan.filter((f) => f.tipo === "audio").length;
  const fotos = faltan.length - audios;
  if (fotos === 0) return "Te conviene grabar un audio nuevo.";
  if (audios === 0) return "Te conviene subir fotos nuevas.";
  if (audios >= fotos * 2) return "Te conviene grabar un audio nuevo y, si podés, subir alguna foto más.";
  if (fotos >= audios * 2) return "Te conviene subir fotos nuevas y, si podés, grabar un audio corto.";
  return "Te conviene hacer las dos cosas: grabar un audio nuevo y subir fotos nuevas.";
}
