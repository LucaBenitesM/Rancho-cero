# Plan — Rancho Cero (hackathon de IA)

Decisiones tomadas el sábado 17/10 antes de empezar a programar, con el estado
de la app **actualizado el sábado 17/10 a la noche** (todo lo de abajo está en
`main`; no hay PRs abiertos). Cada parte lleva su estado:
✅ **hecho** · 🔜 **en camino** (PR abierto) · ⏳ **pendiente**.

La ficha de relevamiento y la fórmula de urgencia están en [FICHA.md](FICHA.md),
basadas en la tabla de puntajes real de Cireneos ([docs/tabla_puntajes.xlsx](docs/tabla_puntajes.xlsx)):
18 campos en 5 bloques, `peso × puntuación`, máximo 135. La fórmula vive en un
solo lugar del código (`packages/backend/convex/ficha.ts`).

> La tabla de [FICHA.md](FICHA.md) dice "20 campos" en la fila del total, pero
> la tabla lista 18 (4 + 3 + 2 + 5 + 4), y la app usa esos 18.

---

## La idea en una frase

El voluntario de Cireneos saca fotos de la vivienda y graba un audio; la IA lo
convierte en un caso completo, priorizado y listo para buscar financiamiento,
**sin que nadie escriba nada**.

**Contexto:** Rancho Cero (Cireneos, Uruguay) reemplaza viviendas precarias por
casas container de **US$ 15.000**. Meta: **100 hogares**.

**Por qué la IA es el núcleo:** sin IA, una visita desordenada (fotos + audio) no
se convierte en una ficha estructurada con evidencia. Esa es la función principal.

---

## Principios

- **La IA propone, las personas deciden.**
- La versión pública nunca muestra nombres, direcciones, caras, fotos
  identificables ni diagnósticos exactos.
- Nada se carga sin consentimiento de la familia.

---

## Flujo

1. ✅ **Consentimiento.** Casilla obligatoria: "la familia dio su consentimiento".
   Sin ella no se puede procesar, y el servidor tampoco crea el caso ni publica
   una historia de un caso sin consentimiento.
2. **Carga.** El voluntario sube de 1 a 6 fotos, en cualquier orden, y un audio de **máximo 2 minutos**.
   - ✅ **Fotos:** de 1 a 6, en cualquier orden y sin categorías, con vista previa
     y botón para quitar cada una. Antes de subirlas, el celular las **achica y
     comprime** (JPEG, lado mayor de 1600 px), así no pasan el límite de Claude.
     Las fotos ya subidas no se vuelven a subir.
   - ✅ **Galería o cámara del sistema:** "Agregar fotos" abre el selector del
     celular, que deja elegir de la galería o sacar la foto en el momento.
   - ✅ **Audio:** grabador en el navegador, como una nota de voz: hasta 2
     minutos (se corta solo), se puede escuchar y volver a grabar antes de
     enviar. Funciona en compu, Android y iPhone. Si no hay micrófono, no hay
     permiso o la página no está en https, se puede **subir un archivo de audio**
     (máximo 15 MB).
3. ✅ **Transcripción.** ElevenLabs transcribe el audio. Cada audio se transcribe
   una sola vez, aunque el caso se vuelva a procesar.
4. ✅ **Ficha.** Claude analiza fotos + transcripción y completa la ficha con valor,
   evidencia y confianza por campo. Completa todos los campos. Lo dudoso queda señalado con el motivo de la duda.
   (Antes existía "a confirmar" para lo que la IA no sabía; se sacó: ahora la IA
   propone siempre un valor y señala la duda.)
5. ✅ **Pedido de más datos** (nuevo). Si la IA deja **5 campos dudosos o más**, la
   ficha **no se muestra**. La app le dice al voluntario, en palabras simples, qué
   no se pudo saber ("No pudimos saber cuántos niños viven, si hay baño adentro
   ni de qué es el piso") y qué le conviene: **grabar un audio nuevo**, **sacar
   fotos más claras** o las dos cosas, con un consejo por campo.
   - No hay botón para saltear y no hay límite de intentos.
   - Lo que ya se cargó **se guarda**: los audios anteriores quedan en el caso y
     las fotos siguen ahí (se pueden sumar más o quitar alguna para cambiarla por
     una más clara). Para volver a procesar hay que agregar un audio nuevo o
     cambiar las fotos.
   - "Volver a procesar con todo junto": la IA usa **todas** las fotos y **todas**
     las transcripciones juntas.
6. ✅ **Revisión.** El voluntario revisa la ficha, corrige lo que haga falta (primero los campos señalados) y la guarda.
   Si el valor propuesto está bien, toca "Está bien así". Al editar un campo,
   deja de estar señalado. Al guardar, el caso pasa a **confirmado**.
7. **Urgencia.** Puntaje base de la tabla de Cireneos (total / 135, en %) +
   ajuste de la IA (±15%, con motivo y evidencia, puede subir o bajar) + puntos
   por espera. El coordinador acepta o rechaza el
   ajuste. La IA explica el resultado.
   - ✅ Puntaje base, puntos por espera (+1 por mes, tope +12) y explicación.
     El puntaje final se guarda en el caso.
   - ✅ La IA sugiere el ajuste con motivo y evidencia, y queda como **"sugerido"**.
   - ✅ **Aceptar o rechazar el ajuste:** en la ficha de la familia (desde el
     ranking) hay botones "Aceptar" y "Rechazar" mientras el ajuste está
     "sugerido" y el caso ya fue confirmado. Al decidir, se recalcula el puntaje
     y queda registrado quién decidió y cuándo. Hace falta sesión. Mientras nadie
     decide, el ajuste se ve pero **no suma**.
8. ✅ **Ranking.** Solo casos confirmados, ordenados por puntaje.
   Con filtro de orden y scroll. Al tocar una familia se abre su ficha: puntaje
   por bloque de la tabla, espera, ajuste con su estado y explicación.
9. **Historia.** La IA escribe una historia anónima y digna; una segunda llamada
   revisa la privacidad y **reescribe sola** lo identificable. El coordinador ve
   la versión reescrita y la aprueba.
   - ✅ Hecho, con un cambio: la revisión de privacidad **no reescribe sola**,
     sino que marca cada frase riesgosa con el motivo y una sugerencia. El
     coordinador aplica la sugerencia o edita el texto. Si lo edita, tiene que
     volver a revisarlo antes de aprobar. "Aprobar y publicar" guarda quién
     aprobó y cuándo. A Claude solo le llegan los valores de la ficha, nunca el
     alias, el barrio ni el audio.
   - ⏳ La pantalla "Aprobar historia" (`/historia/[id]`) se abre por dirección;
     todavía no hay un enlace desde el ranking.
10. ⏳ **Imagen.** La IA elige una foto y propone un recorte sin rasgos
   identificables; el coordinador lo aprueba. Si no, ilustración genérica.
   Sin empezar.
11. ✅ **Campaña.** Meta de US$ 15.000, barra de progreso y botón "Donar" (simulado).
   Hoy la meta y los montos están en **pesos uruguayos** ($ 600.000, unos
   US$ 15.000). Al elegir un monto se abre un formulario de pago de demo
   (valida la tarjeta, no la guarda ni cobra). Al llegar a la meta, el caso pasa
   a **financiado**. Muestra la campaña activa sembrada para la demo.

**Si algo falla** (transcripción o análisis): botón "reintentar", sin perder las
fotos ni el audio ya subidos. No hay campo de texto alternativo.
✅ Si falla, la app vuelve a la carga con un mensaje claro, las fotos y el
audio siguen ahí y se reintenta con el mismo botón. Si falla solo la
transcripción, la ficha se completa con las fotos y avisa que revise familia y
salud. Si falla al volver a procesar, se queda en la pantalla de "faltan datos".

---

## Pantallas (hoy)

| Pantalla | Ruta | Qué hace | Estado |
|---|---|---|---|
| Portada | `/` | Foto de un rancho de fondo, cifras del problema y tres botones: "Soy coordinador", "Soy voluntario", "Quiero donar" | ✅ |
| Sesión | `/dashboard` | Iniciar sesión y accesos a "Nueva visita" y "Ranking" | ✅ |
| Nueva visita | `/nueva-visita` | Consentimiento → fotos → audio → procesar → (faltan datos) → ficha para revisar y guardar | ✅ |
| Ranking | `/ranking` | Familias confirmadas por puntaje, con la ficha y el desglose de cada una; en la ficha se acepta o rechaza el ajuste | ✅ |
| Aprobar historia | `/historia/[id]` | Generar historia, revisar privacidad, editar, aprobar y publicar | ✅ (sin enlace desde el ranking) |
| Campaña | `/campana` | Historia aprobada, barra hacia la meta en pesos y donación simulada | ✅ |

Estilo: paleta verde sobria, institucional, con una foto de un rancho de
fondo en la portada.

---

## Llamadas a la IA

| # | Qué hace | Bloquea la demo | Estado |
|---|---|---|---|
| — | ElevenLabs: audio → texto (uno por audio, se guarda y no se repite) | Sí | ✅ |
| 1 | Claude **Sonnet 5.5**: fotos + texto → ficha + ajuste + explicación (una sola salida estructurada). Se vuelve a llamar con todo junto cuando faltan datos. | Sí | ✅ |
| 2 | Claude: historia anónima | No (segundo plano) | ✅ (se genera desde "Aprobar historia") |
| 3 | Claude: revisión de privacidad y reescritura | No (segundo plano) | ✅ (marca y sugiere; no reescribe sola) |
| 4 | Claude: elegir foto y proponer recorte | No (deseable) | ⏳ |

---

## Estados de un caso

`relevado → confirmado → en campaña → financiado → casa entregada`

- Mientras la IA deja 5 campos dudosos o más, sigue en **relevado** y no se
  puede confirmar.
- Pasa a **confirmado** cuando el voluntario revisa la ficha y la guarda.
- Pasa a **financiado** solo al llegar a US$ 15.000 y suma al panel de impacto.
- **Casa entregada** se marca a mano, sin pantalla propia.

---

## Roles y permisos

Login con **Better Auth** (email y contraseña). Cuentas creadas a mano, sin
registro. La portada tiene tres botones: "Soy coordinador", "Soy voluntario" y
"Quiero donar" (este último no pide login).

| Acción | Voluntario | Coordinador | Donante |
|---|---|---|---|
| Cargar visita | ✅ | ✅ | ❌ |
| Revisar y corregir la ficha | ✅ (sus casos) | ✅ | ❌ |
| Ver ranking completo | ❌ | ✅ | ❌ |
| Aceptar / rechazar ajuste | ❌ | ✅ | ❌ |
| Aprobar historia, imagen y campaña | ❌ | ✅ | ❌ |
| Ver campañas, impacto y donar | ✅ | ✅ | ✅ |

Mientras el login no esté, se trabaja con un **selector de rol** en la esquina.

**Estado hoy:**
- ✅ Login con Better Auth (email y contraseña). Hace falta sesión para cargar
  visitas y para generar y aprobar historias. El selector de rol no hizo falta.
- ⏳ **Permisos por rol:** la app todavía no distingue voluntario de
  coordinador. Cualquiera con sesión puede cargar y aprobar, y el ranking se ve
  sin iniciar sesión. Los dos botones de la portada llevan a la misma pantalla
  de sesión.
- ⏳ La pantalla de sesión todavía muestra la opción de **crear cuenta**, aunque
  la decisión es no tener registro.

Los montos del panel y de las campañas llevan la etiqueta **"datos simulados"**.
Las cifras reales (US$ 15.000 por casa, meta de 100 hogares) se muestran aparte.
✅ Ranking, campaña y portada dicen "datos simulados" o "modo demo". Las cifras
reales están en la portada.

---

## Stack

Better-T-Stack · Convex · shadcn/ui · API de Claude · ElevenLabs · Vercel ·
Better Auth. Desarrollo con Orca + Claude Code.

App web adaptada al celular, **con conexión** (datos móviles). Sin versión offline.

---

## Fuera de alcance

Mapa satelital, pagos reales, conexión donante–familia, WhatsApp, modo offline,
registro de usuarios, recuperación de contraseña.

---

## Prioridades

| Nivel | Qué entra |
|---|---|
| **Imprescindible** | Carga (fotos + audio + consentimiento) → transcripción → ficha completa con evidencia y campos dudosos señalados → revisión → puntaje base → ranking simple |
| **Importante** | Ajuste de urgencia con aceptar/rechazar · historia anónima · login con 3 roles |
| **Deseable** | Revisión de privacidad · campaña con barra y donar · panel de impacto · recorte de foto |

**Estado hoy:**
- **Imprescindible:** ✅ todo hecho, más el pedido de más datos y el grabador de audio.
- **Importante:** ✅ ajuste de urgencia con aceptar/rechazar · ✅ historia anónima ·
  ✅ login · ⏳ permisos por rol.
- **Deseable:** ✅ revisión de privacidad · ✅ campaña con barra y donación
  (en pesos) · ⏳ panel de impacto (hoy son las cifras de la portada) · ⏳ recorte de foto.

## Horarios

| Hora | Control |
|---|---|
| **Sáb 12:30** | Esquema de la ficha congelado |
| **Sáb 15:00** | Lo imprescindible funciona de punta a punta (tolerancia máxima: 16:00). Si no, se cae todo lo deseable. |
| **Sáb 18:00** | Guion de la demo congelado |
| **Sáb 19:00** | Si lo importante no está, la campaña pasa a ser una pantalla estática |
| **Dom 12:00** | Código congelado. Solo arreglos y ensayo. |
| **Dom 16:00** | Pitch |

## Reparto

- **Persona 1 — IA:** ficha según la tabla de Cireneos, dudas pendientes con Cireneos, acciones de
  Convex (ElevenLabs → Claude), prompts y esquemas.
- **Persona 2 — App:** proyecto con Better-T-Stack, despliegue en Vercel, carga
  desde el celular, ficha con campos dudosos señalados, revisión, login.
- **Persona 3 — Demo y pitch:** ranking, campaña, datos sembrados, casos de
  prueba, guion de la demo, diapositivas y ensayos.

---

## Demo

- **Datos de prueba:** fotos de viviendas sin personas ni números de puerta, más
  imágenes generadas. 3–4 casos completos (fotos + audio) ya procesados.
- **Audio:** al menos uno grabado con voz humana real (con ruido, pausas y
  muletillas), no solo voz sintética.
- **Audio en vivo:** menos de 45 segundos. El guion incluye a propósito un dato
  ambiguo (para que aparezca un campo señalado como dudoso) y un factor que la ficha no
  contempla (para que aparezca el ajuste).
- **Ranking sembrado:** 8–10 familias ficticias con fechas de relevamiento
  distintas. El caso en vivo entra en el puesto 2 o 3, no en el 1.
- **Respaldo:** si el procesamiento tarda más de 30 segundos o falla, botón oculto
  que pasa al mismo caso ya procesado. Además, video grabado de toda la demo.
- Todos los datos de la demo son ficticios y se dice así.

**Estado hoy:**
- ✅ Material de 4 familias en [demo/](demo/GUIA-DEMO.md) (fotos y audio de la Familia A ya cargados).
- ✅ Ranking y campaña sembrados. Se cargan y se reinician desde la terminal
  (`npx convex run casos:seed`, `campanas:seed`, `campanas:reiniciarDemo`); no hay botones en la app.
- ⏳ **Botón oculto del plan B** (pasar al caso ya procesado): todavía no está en la app.
- ⏳ Video grabado de toda la demo.
- La demo ahora incluye el **pedido de más datos**: el primer audio va cortado a
  propósito y la IA pide completarlo (guion en [PITCH.md](PITCH.md)).

## Pitch (4 minutos)

> El guion final es de **3 minutos**: ver [PITCH.md](PITCH.md).

| Tiempo | Contenido |
|---|---|
| 0:00–0:40 | Problema: dato de Cireneos, costo de US$ 15.000 por casa |
| 0:40–2:40 | Demo: audio en vivo y fotos → ficha con campos dudosos señalados → revisión → ajuste con motivo → aceptación → el caso entra al ranking |
| 2:40–3:10 | Historia anónima y campaña |
| 3:10–4:00 | Impacto, validación de Cireneos, modelo de negocio |

**Modelo de negocio:** SaaS de regalo para Cireneos como piloto, adaptable
después a otras organizaciones de vivienda y a gobiernos.

---

## Respuestas preparadas para el jurado

**"¿Y si la IA se equivoca?"**

> La IA nunca decide a quién le toca una casa. Hace tres cosas: completa la ficha,
> y todo lo que no puede verificar lo señala, con el motivo de la duda, para que el voluntario
> lo revise (y si le faltan demasiados datos, no adivina: no muestra la ficha y
> le pide al voluntario un audio o fotos más claras); calcula el puntaje con una fórmula fija cuyos pesos definió
> Cireneos, no la IA; y puede sugerir un ajuste de como máximo 15%, para arriba o
> para abajo, siempre con el motivo y la evidencia a la vista: esta foto, esta
> frase del audio. Si una persona no acepta ese ajuste, no se aplica, y queda
> registrado quién lo aceptó y por qué. Si la IA se equivoca, el error es
> visible, está acotado y lo corrige una persona. Hoy esa decisión se toma con
> planillas y memoria; nosotros la hacemos más trazable, no más automática.

**"¿Y la privacidad de las familias?"**

> Nada se carga sin el consentimiento de la familia. Los datos sensibles solo los
> ve el equipo de Cireneos, con login. Lo público es una historia anónima que una
> segunda IA revisa y reescribe para sacar cualquier dato identificable, y que
> el coordinador aprueba antes de publicar. Nunca mostramos nombres, direcciones,
> caras ni diagnósticos.

*Ajuste a lo que hace hoy la app:* la segunda IA no reescribe sola; marca cada
frase riesgosa y sugiere cómo cambiarla, y el coordinador la corrige antes de
aprobar. Decir "una segunda IA revisa y marca cualquier dato identificable".

---

## Pendientes

- [x] Conseguir la tabla de puntajes real de Cireneos ([docs/tabla_puntajes.xlsx](docs/tabla_puntajes.xlsx)).
- [ ] Resolver con Cireneos las dudas de interpretación de la tabla (marcadas con ⚠️ en [FICHA.md](FICHA.md)).
- [ ] Confirmar permiso para usar el nombre de Cireneos y Rancho Cero en el pitch.
- [ ] Pedir una cita o un video corto de alguien de Cireneos para la diapositiva de validación.
- [ ] Conseguir un dato real del problema para abrir el pitch.
- [x] Grabador de audio en el navegador, con opción de subir archivo.
- [x] Pedido de más datos cuando la IA deja 5 campos dudosos o más.
- [x] Historia anónima con revisión de privacidad y aprobación.
- [x] Donación en pesos con formulario de pago de demo.
- [x] Botón para aceptar o rechazar el ajuste de la IA.
- [ ] Botón oculto del plan B en la demo.
- [ ] Enlace desde el ranking a "Aprobar historia".
- [ ] Permisos por rol y sacar la opción de crear cuenta.
- [ ] Corregir "20 campos" → 18 en la fila del total de [FICHA.md](FICHA.md).
