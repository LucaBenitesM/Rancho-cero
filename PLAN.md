# Plan — Rancho Cero (hackathon de IA)

Decisiones tomadas el sábado 17/10 antes de empezar a programar.
La ficha de relevamiento y la fórmula de urgencia están en [FICHA.md](FICHA.md),
basadas en la tabla de puntajes real de Cireneos ([docs/tabla_puntajes.xlsx](docs/tabla_puntajes.xlsx)):
20 campos en 5 bloques, `peso × puntuación`, máximo 135.

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

1. **Consentimiento.** Casilla obligatoria: "la familia dio su consentimiento".
2. **Carga.** El voluntario sube de 1 a 6 fotos, en cualquier orden, y un audio de **máximo 2 minutos**.
3. **Transcripción.** ElevenLabs transcribe el audio.
4. **Ficha.** Claude analiza fotos + transcripción y completa la ficha con valor,
   evidencia y confianza por campo. Completa todos los campos. Lo dudoso queda señalado con el motivo de la duda.
5. **Revisión.** El voluntario revisa la ficha, corrige lo que haga falta (primero los campos señalados) y la guarda.
6. **Urgencia.** Puntaje base de la tabla de Cireneos (total / 135, en %) +
   ajuste de la IA (±15%, con motivo y evidencia, puede subir o bajar) + puntos
   por espera. El coordinador acepta o rechaza el
   ajuste. La IA explica el resultado.
7. **Ranking.** Solo casos confirmados, ordenados por puntaje.
8. **Historia.** La IA escribe una historia anónima y digna; una segunda llamada
   revisa la privacidad y **reescribe sola** lo identificable. El coordinador ve
   la versión reescrita y la aprueba.
9. **Imagen.** La IA elige una foto y propone un recorte sin rasgos
   identificables; el coordinador lo aprueba. Si no, ilustración genérica.
10. **Campaña.** Meta de US$ 15.000, barra de progreso y botón "Donar" (simulado).

**Si algo falla** (transcripción o análisis): botón "reintentar", sin perder las
fotos ni el audio ya subidos. No hay campo de texto alternativo.

---

## Llamadas a la IA

| # | Qué hace | Bloquea la demo |
|---|---|---|
| — | ElevenLabs: audio → texto | Sí |
| 1 | Claude **Sonnet 5.5**: fotos + texto → ficha + ajuste + explicación (una sola salida estructurada) | Sí |
| 2 | Claude: historia anónima | No (segundo plano) |
| 3 | Claude: revisión de privacidad y reescritura | No (segundo plano) |
| 4 | Claude: elegir foto y proponer recorte | No (deseable) |

---

## Estados de un caso

`relevado → confirmado → en campaña → financiado → casa entregada`

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

Los montos del panel y de las campañas llevan la etiqueta **"datos simulados"**.
Las cifras reales (US$ 15.000 por casa, meta de 100 hogares) se muestran aparte.

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

## Pitch (4 minutos)

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
> lo revise; calcula el puntaje con una fórmula fija cuyos pesos definió
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

---

## Pendientes

- [x] Conseguir la tabla de puntajes real de Cireneos ([docs/tabla_puntajes.xlsx](docs/tabla_puntajes.xlsx)).
- [ ] Resolver con Cireneos las dudas de interpretación de la tabla (marcadas con ⚠️ en [FICHA.md](FICHA.md)).
- [ ] Confirmar permiso para usar el nombre de Cireneos y Rancho Cero en el pitch.
- [ ] Pedir una cita o un video corto de alguien de Cireneos para la diapositiva de validación.
- [ ] Conseguir un dato real del problema para abrir el pitch.
