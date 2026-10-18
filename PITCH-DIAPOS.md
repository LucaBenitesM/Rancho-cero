# Pitch diapo por diapo — Rancho Cero (3 minutos)

Estructura final del pitch del domingo a las 16:00. Reemplaza el orden de
[PITCH.md](PITCH.md), que queda como detalle de la demo (audios, valores
esperados de la ficha). Hecho con la app de `main` del sábado 17/10 a la noche:
**uso interno de Cireneos, con voluntario y coordinador. Sin campaña pública ni
donaciones.**

**Total: 180 segundos.** Problema (0:00–0:40) → Solución (0:40–0:55) → Demo en
vivo (0:55–2:35) → Por qué importa (2:35–2:50) → Cierre (2:50–3:00).

**Quién hace qué:**

- **Cami:** abre, da el dato, cuenta por qué importa y cierra.
- **Luca:** presenta la solución y narra la demo del voluntario. En la parte del
  coordinador maneja la compu.
- **Marti:** es la voluntaria de la demo, maneja el celular y graba los audios.
  Después narra la parte del coordinador y la historia.

Cuando alguien graba un audio en vivo, **nadie habla**: el micrófono del
celular lo levanta todo.

---

## Estilo visual (igual que la app)

| Uso | Color | Código |
|---|---|---|
| Fondo de diapos de texto | Verde oliva | `#545637` |
| Texto sobre oliva | Blanco | `#FFFFFF` |
| Número grande o palabra destacada | Amarillo manteca | `#F5DE8A` |
| Fondos suaves, líneas, etiquetas | Salvia | `#8E9460` |
| Fondo claro (si hace falta) | Crema, con texto tinta | `#FAF8F2` / `#1F1F1A` |

- **Tipografía:** Montserrat ExtraBold (800) para frases y números, y Montserrat
  SemiBold (600) para textos chicos. Nada de párrafos: como mucho una frase o un
  número por diapo.
- **Fotos:** a pantalla completa, sin marco. Si llevan texto, va abajo a la
  izquierda en blanco, sobre una franja oliva al 80%.
- **Logo:** `logo-cireneos.png`, chico, en la esquina inferior derecha, solo en
  la diapo 2 y en la última.
- **Demo:** celular espejado a pantalla completa con un borde oliva de 16 px y,
  arriba a la izquierda, una etiqueta en manteca que dice **VOLUNTARIA** o
  **COORDINADOR** según quién esté usando la app.

---

## Antes del pitch

- [ ] [CONFIRMAR] Permiso de Cireneos para nombrar a Cireneos y a Rancho Cero.
      Si no llega: "una organización uruguaya de vivienda".
- [ ] [CONFIRMAR] Permiso para mostrar `familia-1.jpg` (aparecen caras de una
      familia real). Si no llega, en la diapo 13 va `barrio.jpg`.
- [ ] Las fotos de `apps/web/public/imagenes/` muestran casas ya entregadas,
      **ninguna es un rancho**. Para abrir se usa
      `demo/familia-a-muy-urgente/foto-1.jpg`, el rancho de chapa oxidada al
      lado de la cañada, que es la misma casa que se sube en la demo.
- [ ] Cuentas creadas: una de voluntaria (Marti) y una de coordinador (Luca),
      con `COORDINADORES` cargado en Convex de producción. Las contraseñas,
      guardadas en el navegador de cada aparato, así el login es un toque.
- [ ] En el celular: las 5 fotos del rancho y los dos audios pregrabados (el
      cortado y el completo), por si falla el micrófono.
- [ ] Ranking cargado con las 8 familias (`npx convex run casos:recargar`).
- [ ] Video grabado de toda la demo, abierto en la compu y listo para darle play
      (ver [Plan B](#plan-b-si-falla-la-demo-en-vivo)).
- [ ] [CONFIRMAR] Cronometrar cuánto tarda cada procesamiento con la red del
      lugar. El guion supone unos 10 segundos por procesamiento.

---

# 1. Problema (0:00–0:40)

## Diapo 1 — La casa · 15 s (0:00–0:15)

**Pantalla:** `demo/familia-a-muy-urgente/foto-1.jpg` a pantalla completa, sin
texto.

**Cami:**

> Esta es una casa de chapa al lado de una cañada. Ahí vive una mamá con cuatro
> gurises. Cuando llueve, se moja todo adentro: el colchón, la ropa, los
> cuadernos de la escuela. Y la luz llega por un cable colgado arriba de la chapa
> mojada.

## Diapo 2 — El número · 15 s (0:15–0:30)

**Pantalla:** fondo oliva. En el centro, en manteca y bien grande: **+380.000**.
Abajo, en blanco y chico: *niños, niñas y adolescentes · UNICEF Uruguay 2025*.
Logo de Cireneos en la esquina.

**Cami:**

> Y no es un caso aislado. Según UNICEF, en Uruguay hay más de trescientos
> ochenta mil niños, niñas y adolescentes que viven en condiciones
> habitacionales que afectan su desarrollo. Cireneos, con Rancho Cero, cambia
> ranchos como este por casas de verdad.

## Diapo 3 — El cuello de botella · 10 s (0:30–0:40)

**Pantalla:** `familia-3.jpg` (la casa container con el logo de Rancho Cero).
Franja oliva abajo: **"Antes de construir, hay que relevar."**

**Luca:**

> Pero antes de construir hay que relevar cada casa: ir, sacar fotos, tomar
> notas, pasarlo a planillas y comparar casos. Hoy todo eso se hace a mano.
> [CONFIRMAR: que hoy el relevamiento se hace a mano y con planillas]

# 2. Solución (0:40–0:55)

## Diapo 4 — Fotos y audio, nada más · 15 s (0:40–0:55)

**Pantalla:** fondo oliva. Una sola línea en blanco con los pasos separados por
flechas manteca: **Fotos + audio → ficha → ranking**. Debajo, en manteca:
**La IA propone. Las personas deciden.**

**Luca:**

> Por eso hicimos esta app para el equipo de Cireneos. La voluntaria saca fotos
> y graba un audio, nada más. La IA arma la ficha con la tabla de puntajes de
> Cireneos y propone la urgencia. Pero la IA propone y las personas deciden. Les
> mostramos.

# 3. Demo en vivo (0:55–2:35)

Todo lo que sigue es **demo en vivo**: el celular de Marti espejado en la
pantalla y después la compu de Luca. Los tiempos incluyen la espera de la IA.
**Si un procesamiento pasa los 10 segundos, se pasa al video** (ver Plan B).

## Diapo 5 — Entra la voluntaria · 10 s (0:55–1:05)

**Pantalla:** demo en vivo, celular. Etiqueta **VOLUNTARIA**.

**Marti hace:** en la pantalla de sesión toca "Iniciar sesión" (la contraseña ya
está guardada). Abre **Nueva visita**, marca "La familia dio su
consentimiento", toca **Agregar fotos** y elige las 5 fotos del rancho.

**Luca:**

> Todo lo que van a ver es ficticio. Marti entra como voluntaria. Primero, el
> consentimiento: sin eso no se carga nada. Y las fotos son de la casa, nunca de
> las personas.

## Diapo 6 — El audio apurado · 20 s (1:05–1:25)

**Pantalla:** demo en vivo, celular.

**Marti hace:** toca **Grabar** y dice el **audio 1, cortado a propósito**
(unos 8 segundos):

> "Es una mamá sola con cuatro hijos. Cuando llueve se inunda. Y la luz es un
> cable colgado que pasa arriba de la chapa."

Corta, toca **Procesar visita con IA** y espera.

**Luca** (solo después de que Marti termine de grabar):

> Ahora la IA transcribe el audio y lo cruza con las fotos.

## Diapo 7 — La IA pide más datos · 10 s (1:25–1:35)

**Pantalla:** demo en vivo, celular. Aparece **"Necesitamos un poco más de
información"**, con la lista de lo que falta y **"Qué conviene agregar"**.
Marti lo señala con el dedo.

**Luca:**

> Marti se apuró, a propósito. Y la IA, en vez de inventar, frena: no sabe las
> edades de los gurises, ni cuántos metros tiene la casa, ni si alguien está
> enfermo. Le dice qué falta.

## Diapo 8 — Segundo audio · 22 s (1:35–1:57)

**Pantalla:** demo en vivo, celular.

**Marti hace:** graba el **audio 2** (unos 12 segundos):

> "El más chico tiene tres años, los otros seis y nueve, y el más grande
> diecisiete o dieciocho, no sé. La casa tiene unos veinte metros. Nadie
> enfermo. Los conocemos hace un año y medio, no tienen desalojo."

Toca **Volver a procesar con todo junto** y espera.

**Luca** (después de la grabación):

> No se pierde nada: la IA junta los dos audios y las fotos.

## Diapo 9 — La ficha · 13 s (1:57–2:10)

**Pantalla:** demo en vivo, celular. Aparece la ficha completa con los 18
campos.

**Marti hace:** pausa de 2 segundos. Toca **Techo** para mostrar la evidencia.
Después va al campo señalado como **Campo dudoso** ("Menores de 12 a 18"),
elige **"uno"** y toca **Guardar ficha**.

**Luca:**

> Los dieciocho campos de la tabla de Cireneos, y nadie escribió nada. Cada uno
> dice de qué foto o de qué frase sale. Lo dudoso, la IA lo marca, y lo decide
> la voluntaria.

## Diapo 10 — Entra el coordinador · 15 s (2:10–2:25)

**Pantalla:** demo en vivo, **compu de Luca**. Etiqueta **COORDINADOR**.

**Luca hace:** toca "Iniciar sesión" (contraseña guardada). Abre **Ranking de
urgencia**: la familia nueva aparece en el puesto 2 o 3. La toca y abre la
**Ficha de la familia**: desglose por bloque, espera, ajuste de +10% por el
cable con su motivo y la **Explicación**. Toca **Aceptar** en el ajuste.

**Marti:**

> Ahora entra Luca como coordinador, que es el único que ve el ranking. La
> familia entra entre las primeras y se ve por qué: cada bloque de la tabla, y un diez por
> ciento más por el cable. Ese ajuste no suma hasta que una persona lo acepta.

## Diapo 11 — La historia · 10 s (2:25–2:35)

**Pantalla:** demo en vivo, compu. Desde la ficha, **Escribir y aprobar
historia** → **Generar historia**. Aparece el texto con las alertas de
privacidad marcadas, o "Sin alertas de privacidad".

**Marti:**

> Y la IA escribe la historia de la familia, sin nombres ni barrio. Una segunda
> revisión marca cualquier cosa que la identifique, y el coordinador la aprueba.

*Si "Generar historia" tarda más de 5 segundos, Luca abre **Historias** y muestra
una que ya está aprobada.*

# 4. Por qué importa (2:35–2:50)

## Diapo 12 — Relevamiento sí, decisión no · 15 s (2:35–2:50)

**Pantalla:** `barrio.jpg` a pantalla completa. Franja oliva abajo, en manteca:
**"Automatizamos el relevamiento, no la decisión."**

**Cami:**

> Una visita que hoy son horas de notas y planillas queda lista en minutos.
> [CONFIRMAR: cuánto tarda hoy un relevamiento completo] Así, cada voluntario
> releva más familias. Automatizamos el relevamiento, no la decisión: la última
> palabra siempre la tiene una persona de Cireneos.

# 5. Cierre (2:50–3:00)

## Diapo 13 — Volver a la casa · 10 s (2:50–3:00)

**Pantalla:** vuelve `demo/familia-a-muy-urgente/foto-1.jpg`, igual que en la
diapo 1. A los 6 segundos pasa a `familia-1.jpg` [CONFIRMAR permiso] con el logo
de Cireneos y **Rancho Cero** en blanco.

**Cami:**

> La mamá y los cuatro gurises de esta casa ya tienen su ficha y su lugar en el
> ranking. Lo que queremos es que la próxima lluvia la pasen así. Gracias.

---

## Resumen de tiempos

| # | Diapo | Quién habla | Dura | Termina |
|---|---|---|---|---|
| 1 | La casa | Cami | 15 s | 0:15 |
| 2 | El número | Cami | 15 s | 0:30 |
| 3 | El cuello de botella | Luca | 10 s | 0:40 |
| 4 | Fotos y audio, nada más | Luca | 15 s | 0:55 |
| 5 | Entra la voluntaria | Luca (Marti opera) | 10 s | 1:05 |
| 6 | El audio apurado | Marti graba / Luca | 20 s | 1:25 |
| 7 | La IA pide más datos | Luca | 10 s | 1:35 |
| 8 | Segundo audio | Marti graba / Luca | 22 s | 1:57 |
| 9 | La ficha | Luca (Marti opera) | 13 s | 2:10 |
| 10 | Entra el coordinador | Marti (Luca opera) | 15 s | 2:25 |
| 11 | La historia | Marti | 10 s | 2:35 |
| 12 | Relevamiento sí, decisión no | Cami | 15 s | 2:50 |
| 13 | Volver a la casa | Cami | 10 s | 3:00 |

No queda margen: si la demo se atrasa, se recorta la diapo 11 (se dice la frase
sin generar la historia) y después la 3.

---

## Plan B (si falla la demo en vivo)

Tener abierto en la compu el **video grabado de toda la demo** (diapos 5 a 11),
con marcas de tiempo anotadas para cada diapo.

- **Un procesamiento tarda más de 10 segundos o da error:** Luca dice "les
  mostramos cómo sigue" y se pone el video desde esa diapo. Se sigue narrando
  igual, sin explicar el problema.
- **Con el audio 1 la IA no pide más datos:** aparece la ficha directo. Se
  saltean las diapos 7 y 8, Luca dice "y lo que no sabe, lo marca" y se sigue
  desde la 9. Sobran unos 30 segundos: se dicen con calma la 10 y la 11.
- **Falla el micrófono:** Marti sube el audio pregrabado con "Subir archivo de
  audio" (el cortado y después el completo).
- **Se cae la red o la app:** se pasa al video desde la diapo en la que se
  cayó.
- **Falla el espejado del celular:** Marti hace la demo en la compu (el
  navegador también graba audio) y se sigue igual.

---

## 3 preguntas que nos puede hacer el jurado

**1. "¿Y si la IA se equivoca?"**

> La IA no decide a quién le toca una casa. Completa la ficha y marca lo que
> duda; si le faltan muchos datos, no la muestra y pide más. El puntaje sale de
> la tabla de Cireneos, no de la IA, y el ajuste de la IA es de como máximo 15%,
> con motivo y evidencia, y no cuenta hasta que un coordinador lo acepta. Si se
> equivoca, el error se ve y lo corrige una persona.

**2. "¿Y la privacidad de las familias?"**

> Nada se carga sin el consentimiento de la familia. Las fotos son de la casa,
> nunca de las personas. La app es solo para el equipo de Cireneos, con login, y
> el ranking solo lo ve el coordinador. Para escribir la historia, a la IA le
> llegan solo los valores de la ficha, nunca el nombre, el barrio ni el audio, y
> una segunda revisión marca lo que pueda identificar a la familia antes de que
> se apruebe.

**3. "¿Por qué no un formulario común?"**

> Porque la visita no es una oficina: la voluntaria está en el barro, con la
> familia. Hablar y sacar fotos es lo natural; llenar dieciocho campos en el
> celular, no. Además, un formulario no mira las fotos: la IA ve el techo, el
> piso, el cable, y deja la evidencia de cada campo para que cualquiera la
> pueda revisar.
