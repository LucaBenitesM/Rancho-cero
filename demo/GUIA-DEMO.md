# Guía de la demo — fotos y audios de las 4 familias

Material para 4 de las 8 familias sembradas en la demo (A, D, E y H). **Todas
las familias son ficticias.** Los valores de cada campo, la evidencia, la
transcripción y el puntaje esperado están en el `SEED` de
[`packages/backend/convex/casos.ts`](../packages/backend/convex/casos.ts). Si
cambiás un guion, cambiá también ese archivo (y al revés).

| Carpeta | Nivel | Puntaje esperado | Puesto |
|---|---|---|---|
| [`familia-a-muy-urgente/`](familia-a-muy-urgente/) | Muy urgente | **95,3** | 1 |
| [`familia-d-intermedia-espera/`](familia-d-intermedia-espera/) | Intermedia (lleva 7 meses esperando) | **67,7** | 4 |
| [`familia-e-intermedia-desalojo/`](familia-e-intermedia-desalojo/) | Intermedia (recién relevada, desalojo inmediato) | **59,5** | 6 |
| [`familia-h-poco-urgente/`](familia-h-poco-urgente/) | Poco urgente | **29,3** | 8 |

Ranking completo con las 8 familias (B, C, F y G no tienen material propio):

| Puesto | Familia | Puntaje |
|---|---|---|
| 1 | A | 95,3 |
| 2 | B | 77,8 |
| 3 | C | 73,9 |
| 4 | D | 67,7 |
| 5 | G | 62,2 |
| 6 | E | 59,5 |
| 7 | F | 44,4 |
| 8 | H | 29,3 |

Para que el caso en vivo entre **2.º** tiene que sacar entre 77,8 y 95,3; para
entrar **3.º**, entre 73,9 y 77,8.

Para recargar las 8 familias: `npx convex run casos:recargar` (desde
`packages/backend`). **Borra todos los casos**, incluido el caso en vivo.

---

## Reglas para todo el material

**Fotos**

- Nombres: `foto-1.jpg` … `foto-6.jpg`. El número tiene que coincidir con la
  tabla de cada familia, porque la evidencia cita "foto N".
- **Nunca** personas, caras, manos, mascotas reconocibles, números de puerta,
  carteles, matrículas, ni paisajes que permitan ubicar el lugar.
- No fotografiar viviendas de familias reales. Sirven casas propias o de
  conocidos (con permiso, escenificando lo que haga falta), galpones, obradores
  o **imágenes generadas**. Si una foto es generada, que diga `-generada` en el
  nombre (`foto-2-generada.jpg`).
- Horizontal, con buena luz, que se vea el material sin dudas. Si la IA no ve
  claro el material, el campo sale señalado como dudoso.

**Audio**

- Archivo: `audio.m4a` (o `.mp3`). **Máximo 2 minutos**; los guiones duran entre
  60 y 80 segundos leídos con calma.
- Habla **el voluntario**, en tercera persona, como si estuviera en la visita.
  Nunca nombres, apellidos, direcciones, barrios ni diagnósticos.
- No hace falta leer palabra por palabra: lo importante son las **frases en
  negrita**, que son las que deciden cada campo. Si se cambia la forma de
  decirlo, que el dato siga siendo el mismo.
- Al menos uno (sugerido: **Familia A**) grabado con voz humana real, con ruido
  de fondo, pausas y muletillas.

**Lo que NO va en el audio**

- **Impresión de la 1ª visita:** la elige el voluntario en la app, nunca la IA.
- **Adicionales:** lo elige el coordinador.

El valor de esos dos campos está indicado en cada familia para que quien
complete la ficha elija el que corresponde.

---

## Familia A — Muy urgente · 95,3

Mamá sola con tres niños en una casa de chapa y madera, al lado de una cañada.
Tabla 112/135 → base 83,0 · ajuste **+10% aceptado** · espera +4 meses.

### Fotos

| Foto | Qué tiene que verse | Campo que define |
|---|---|---|
| 1 | Fachada o pared exterior de **chapa y tablas de madera**, con una sola abertura chica tapada con nylon | Pared `precaria` · Ventanas `insuficientes` |
| 2 | Techo de **chapa sin cielorraso** visto desde adentro, o desde afuera con **chapas sueltas sujetas con piedras** | Techo `liviano_sin_aislacion` · Riesgo `riesgo_derrumbe` |
| 3 | **Piso de tierra** dentro de la vivienda | Piso `tierra` |
| 4 | Interior: **un solo ambiente** donde se ve cama, cocina y ropa juntas, sin divisiones | (refuerza separación de ambientes) |
| 5 | Terreno con **barranca o borde erosionado** de una cañada, sin referencias del lugar | (evidencia del ajuste) |
| 6 | Marca de agua o barro en la parte baja de la pared | (refuerza inundable) |

### Guion del audio (≈ 75 s)

> Bueno, estamos acá en la casa... **es todo de chapa y madera**, **el techo no
> tiene nada abajo**, en invierno es un freezer. **El piso es de tierra.**
> **Baño no tienen, usan el de una vecina.** **Viven la mamá con tres gurises,
> dos chiquitos de menos de cinco y uno de ocho**, **todo en un solo ambiente,
> no habrá más de quince metros.** Uno de los chiquitos **tiene problemas para
> respirar**, ella dice que **empeora con la humedad**. **Cuando llueve fuerte
> el agua entra por abajo**, y **la casa está pegada a la cañada**, eh, **el año
> pasado se llevó un pedazo del terreno.** **Conocemos a la familia hace como un
> año y medio.** **El dueño del terreno les dijo que en unos meses tienen que
> irse.**

### Qué decide cada frase

| Frase | Campo | Valor |
|---|---|---|
| "es todo de chapa y madera" | Pared | `precaria` |
| "el techo no tiene nada abajo" | Techo | `liviano_sin_aislacion` |
| "el piso es de tierra" | Piso | `tierra` |
| "baño no tienen" | Baño | `no_tiene` |
| "no habrá más de quince metros" (4 personas) | m² por persona | `menos_de_5` |
| "todo en un solo ambiente" | Separación | `sin_separacion` |
| "cuando llueve fuerte el agua entra" | Inundable | `inundable` |
| "problemas para respirar, empeora con la humedad" | Enfermedad | `media` |
| "dos chiquitos de menos de cinco" | Menores de 5 | `dos_a_tres` |
| "uno de ocho" | Menores 5 a 12 | `uno` |
| (no hay adolescentes) | Menores 12 a 18 | `ninguno` |
| "viven la mamá con tres gurises" | Monoparental | `solo_madre` |
| "hace como un año y medio" | Vínculo | `de_1_a_2_anos` |
| "en unos meses tienen que irse" | Desalojo | `mediano_plazo` |
| **"pegada a la cañada… se llevó un pedazo del terreno"** | **Ajuste +10%** | El coordinador lo **acepta** |

En la app: Impresión 1ª visita = **alta** · Adicionales = **algunos**.

---

## Familia D — Intermedia (espera) · 67,7

Pareja con cuatro hijos en una casa de bloque sin revocar. Relevada hace 7 meses.
Tabla 82/135 → base 60,7 · ajuste **+5% sugerido, sin decidir** (no se aplica) ·
espera +7.

Sirve para mostrar que **la espera pesa**: su base (60,7) es menor que la de la
Familia G (62,2), pero queda arriba (67,7 contra 62,2) por llevar 7 meses
esperando.

### Fotos

| Foto | Qué tiene que verse | Campo que define |
|---|---|---|
| 1 | Pared exterior de **bloque a la vista, sin revoque** | Pared `material_sin_revoque` |
| 2 | Techo de **chapa sin cielorraso** desde adentro | Techo `liviano_sin_aislacion` |
| 3 | Piso de **contrapiso gris, sin revestir** | Piso `material_sin_terminacion` |
| 4 | Pared interior con **una ventana chica** y una **rajadura diagonal** visible | Ventanas `insuficientes` · Riesgo `rajaduras` |
| 5 | **Baño en el fondo del terreno**, separado de la casa | Baño `incompleto_o_exterior` |
| 6 | Cortina de tela separando dos ambientes | (refuerza separación) |

### Guion del audio (≈ 70 s)

> **Es una casa de bloque, sin revocar.** **El techo es chapa sola, sin
> aislación.** **El piso es contrapiso, nada encima.** **El baño está afuera, en
> el fondo.** **Son mamá, papá y cuatro hijos: uno de tres años, dos en la
> escuela y una de catorce.** **Tienen dos piezas separadas con cortina**, **en
> total serán unos cuarenta metros.** **Hay rajaduras en la pared del fondo.**
> **Dicen que hay ratas**, sobre todo en invierno. **El papá tiene un problema
> en la espalda, pero trabaja igual.** **Esta familia viene a la organización
> hace más de tres años.** **El terreno es de ellos, así que por ese lado
> tranquilos.** Ah, y **el agua la sacan de una canilla del vecino con una
> manguera.**

### Qué decide cada frase

| Frase | Campo | Valor |
|---|---|---|
| "bloque, sin revocar" | Pared | `material_sin_revoque` |
| "chapa sola, sin aislación" | Techo | `liviano_sin_aislacion` |
| "contrapiso, nada encima" | Piso | `material_sin_terminacion` |
| "el baño está afuera" | Baño | `incompleto_o_exterior` |
| "unos cuarenta metros" (6 personas) | m² por persona | `de_5_a_10` |
| "separadas con cortina" | Separación | `cortinas` |
| "rajaduras en la pared" | Riesgo de derrumbe | `rajaduras` |
| "hay ratas" | Inundable | `plagas` |
| "problema en la espalda, pero trabaja igual" | Enfermedad | `leve` |
| "uno de tres años" | Menores de 5 | `uno` |
| "dos en la escuela" | Menores 5 a 12 | `dos_a_tres` |
| "una de catorce" | Menores 12 a 18 | `uno` |
| "mamá, papá y cuatro hijos" | Monoparental | `padre_y_madre` |
| "hace más de tres años" | Vínculo | `mas_de_2_anos` |
| "el terreno es de ellos" | Desalojo | `largo_plazo` |
| **"canilla del vecino con una manguera"** | **Ajuste +5%** | Queda **sugerido** (nadie lo decidió todavía) |

En la app: Impresión 1ª visita = **media** · Adicionales = **ninguno**.

---

## Familia E — Intermedia (desalojo) · 59,5

Papá solo con tres hijos y la abuela, en una casa de madera que se inunda.
Relevada hace 1 mes. Tabla 79/135 → base 58,5 · ajuste **+8% rechazado** ·
espera +1.

Sirve para mostrar que **el coordinador puede rechazar el ajuste**: la IA
detecta la conexión eléctrica colgada, pero la familia ya pidió regularizarla y
el coordinador decide no sumarlo.

### Fotos

| Foto | Qué tiene que verse | Campo que define |
|---|---|---|
| 1 | Pared de **tablas de madera** con **dos ventanas grandes** | Pared `precaria` · Ventanas `suficientes` |
| 2 | Techo de chapa con **cielorraso de planchas de espuma** | Techo `liviano_con_aislacion` · Riesgo `normal` |
| 3 | Piso de **contrapiso sin revestir** | Piso `material_sin_terminacion` |
| 4 | **Cortinas** separando ambientes | Separación `cortinas` |
| 5 | Baño interior con **cortina en vez de puerta** | (refuerza baño) |
| 6 | Cable de luz colgando hacia la casa, sin que se vea poste ni número | (evidencia del ajuste) |

### Guion del audio (≈ 80 s)

> **La casa es de madera**, **tiene un cielorraso de espuma que pusieron
> ellos.** **El piso es contrapiso.** **El baño está adentro pero no tiene
> puerta**, tiene una cortina. **Serán unos treinta y cinco metros en total.**
> **Vive un papá con dos hijos adolescentes, de trece y dieciséis, y una nena de
> diez.** **Tienen ventanas bien, entra luz.** **Dicen que cuando sube el arroyo
> el agua llega adentro, pasó dos veces este año.** **La abuela vive con ellos y
> tiene una enfermedad que la tiene bastante limitada.** **Los conocimos hace
> poco, unos meses.** Ojo que **tienen que dejar la casa ya, el mes que viene.**
> **La conexión de luz es medio colgada**, pero dicen que ya pidieron que se la
> regularicen.

### Qué decide cada frase

| Frase | Campo | Valor |
|---|---|---|
| "la casa es de madera" | Pared | `precaria` |
| "cielorraso de espuma" | Techo | `liviano_con_aislacion` |
| "el piso es contrapiso" | Piso | `material_sin_terminacion` |
| "adentro pero no tiene puerta" | Baño | `incompleto_o_exterior` |
| "unos treinta y cinco metros" (5 personas) | m² por persona | `de_5_a_10` |
| "tienen ventanas bien, entra luz" | Ventanas | `suficientes` |
| (foto 4: cortinas) | Separación | `cortinas` |
| (foto 1 y 2: sin daños) | Riesgo de derrumbe | `normal` |
| "cuando sube el arroyo el agua llega adentro" | Inundable | `inundable` |
| "una enfermedad que la tiene bastante limitada" | Enfermedad | `media` |
| (no hay menores de 5) | Menores de 5 | `ninguno` |
| "una nena de diez" | Menores 5 a 12 | `uno` |
| "de trece y dieciséis" | Menores 12 a 18 | `dos` |
| "un papá con…" | Monoparental | `solo_padre` |
| "los conocimos hace poco" | Vínculo | `menos_de_1_ano` |
| "dejar la casa ya, el mes que viene" | Desalojo | `inmediato` |
| **"la conexión de luz es medio colgada"** | **Ajuste +8%** | El coordinador lo **rechaza**: ya está en trámite |

En la app: Impresión 1ª visita = **media** · Adicionales = **ninguno**.

---

## Familia H — Poco urgente · 29,3

Pareja con un hijo en una casa de material en buen estado, que amplió hace poco.
Tabla 41/135 → base 30,4 · ajuste **−10% aceptado** · espera +2.

Sirve para mostrar que **el ajuste también puede bajar** el puntaje.

### Fotos

| Foto | Qué tiene que verse | Campo que define |
|---|---|---|
| 1 | Pared exterior de **bloque revocado y pintado**, con ventanas | Pared `material_con_revoque` · Ventanas `suficientes` |
| 2 | **Techo de losa de hormigón** | Techo `material` · Riesgo `normal` |
| 3 | Piso de **contrapiso sin revestir** | Piso `material_sin_terminacion` |
| 4 | Dormitorio con **ventana** y **puerta** | Ventanas `suficientes` |
| 5 | **Baño completo con puerta** (inodoro, lavatorio, ducha) | Baño `completo_con_puerta` |
| 6 | Ampliación nueva: pared de bloque más reciente pegada a la casa | (evidencia del ajuste) |

### Guion del audio (≈ 60 s)

> Esta casa está bastante bien, eh. **Es de material, revocada, con techo de
> losa.** **El piso es contrapiso, les falta revestir.** **Baño completo con
> puerta.** **Son una pareja con un hijo de seis años.** **La casa es amplia,
> unos cincuenta metros, tiene dos dormitorios con puerta.** **Nunca se les
> inundó y no tienen bichos.** **Nadie tiene problemas de salud.** **Los
> conocimos este año.** Me contaron que **el año pasado agregaron un dormitorio
> con ayuda de la familia**, y que **no tienen apuro.**

### Qué decide cada frase

| Frase | Campo | Valor |
|---|---|---|
| "de material, revocada" | Pared | `material_con_revoque` |
| "techo de losa" | Techo | `material` |
| "les falta revestir" | Piso | `material_sin_terminacion` |
| "baño completo con puerta" | Baño | `completo_con_puerta` |
| "unos cincuenta metros" (3 personas) | m² por persona | `mas_de_10` |
| "dos dormitorios con puerta" | Separación | `puertas` |
| (fotos 1 y 4) | Ventanas | `suficientes` |
| (fotos 1 y 2: sin daños) | Riesgo de derrumbe | `normal` |
| "nunca se les inundó y no tienen bichos" | Inundable | `normal` |
| "nadie tiene problemas de salud" | Enfermedad | `nada` |
| "un hijo de seis años" | Menores 5 a 12 | `uno` (resto `ninguno`) |
| "una pareja con un hijo" | Monoparental | `padre_y_madre` |
| "los conocimos este año" | Vínculo | `menos_de_1_ano` |
| "no tienen apuro" | Desalojo | `largo_plazo` |
| **"el año pasado agregaron un dormitorio"** | **Ajuste −10%** | El coordinador lo **acepta** |

En la app: Impresión 1ª visita = **baja** · Adicionales = **ninguno**.

---

## Checklist antes de la demo

- [ ] Cada carpeta tiene sus fotos (de 1 a 6) y su `audio.m4a`.
- [ ] Revisé foto por foto: ninguna muestra personas, números ni lugares reconocibles.
- [ ] Al menos un audio grabado con voz humana real.
- [ ] Ningún audio dice nombres, direcciones ni diagnósticos.
- [ ] Procesé cada caso en la app y los campos coinciden con las tablas de arriba
      (si la IA señala algo como dudoso, ajustar la foto o la frase).
- [ ] El ranking sale en el orden y con los puntajes de la tabla de arriba.
