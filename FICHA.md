# Ficha de relevamiento — Rancho Cero

Campos, valores, reglas de confianza y fórmula de urgencia.
Los campos, pesos y criterios salen de la **tabla de puntajes real de Cireneos**
([docs/tabla_puntajes.xlsx](docs/tabla_puntajes.xlsx)). Lo marcado con ⚠️ son
dudas sobre cómo interpretar la tabla que hay que confirmar con Cireneos.

Esquema congelado a las **12:30 del sábado**. Cualquier cambio posterior se avisa
a las tres personas antes de tocar el código.

---

## Reglas generales (aplican a todos los campos)

| Concepto | Regla |
|---|---|
| **Valores** | Siempre de una lista cerrada. Nunca texto libre. |
| **Evidencia** | Cada campo cita su fuente: `foto N` (con lo que se ve) o una cita textual del audio. |
| **Confianza alta** | Evidencia directa y clara: se ve sin dudas en una foto o el voluntario lo dice explícitamente. |
| **Confianza media** | Evidencia parcial o indirecta: se ve una parte, o se deduce de algo que se dijo. |
| **Confianza baja** | Inferencia sin evidencia directa. |
| **Ficha completa** | La IA completa **todos** los campos con su mejor propuesta. Ninguno queda vacío. |
| **Campo dudoso** | Confianza baja, sin evidencia, o foto y audio se contradicen. Queda **señalado** (⚠️) con una frase corta de por qué duda la IA. Si el voluntario lo edita o lo acepta, deja de estar señalado. |
| **Fotos** | De 1 a 6, en cualquier orden y sin títulos. La IA las analiza todas juntas sin asumir qué muestra cada una. |
| **Datos de personas** | Los campos de salud y familia salen **solo del audio**. Nunca se infieren de las fotos (las fotos no muestran personas). |
| **Salud** | Enfermedad y discapacidad nunca se infieren. Si no se mencionan, la IA propone "nada" y lo señala como dudoso. Nunca se guarda el diagnóstico exacto en la versión pública. |
| **Ranking** | Solo entran casos en estado `confirmado`: el voluntario revisó la ficha y la guardó. |

---

## Cómo puntúa la tabla

Cada campo tiene un **peso** (1 a 3) y una **puntuación** (1 a 3; algunos admiten 0).
El total del campo es `peso × puntuación`. La suma de pesos es **45**, así que el
máximo posible es **45 × 3 = 135**.

| Bloque | Campos | Peso del bloque | Máximo |
|---|---|---|---|
| 1. Materialidad | Pared, techo, piso, baño | 12 | 36 |
| 2. Habitabilidad | m² por persona, ventanas, separación de ambientes | 5 | 15 |
| 3. Seguridad y salubridad | Riesgo de derrumbe, inundable | 6 | 18 |
| 4. Salud y familia | Enfermedades, menores (3 franjas), monoparental | 11 | 33 |
| 5. Dimensión social | Vínculo, impresión 1ª visita, desalojo, adicionales | 11 | 33 |
| **Total** | **20 campos** | **45** | **135** |

---

## 1. Materialidad (peso total: 12) · fuente: foto (audio complementa)

### Pared — peso 3

| Valor | Puntuación | Evidencia típica |
|---|---|---|
| `material_con_revoque` | 1 | Bloque o ladrillo revocado |
| `material_sin_revoque` | 2 | Bloque o ladrillo a la vista |
| `precaria` | 3 | Chapa, madera, nylon, caña o cartón |

### Techo — peso 3

| Valor | Puntuación | Evidencia típica |
|---|---|---|
| `material` | 1 | Losa / hormigón |
| `liviano_con_aislacion` | 2 | Chapa o madera con aislación |
| `liviano_sin_aislacion` | 3 | Chapa o madera sin cielorraso ni aislación |

### Piso — peso 3

| Valor | Puntuación | Evidencia típica |
|---|---|---|
| `material_revestido` | 1 | Cerámica, baldosa u otro revestimiento |
| `material_sin_terminacion` | 2 | Contrapiso sin terminar |
| `tierra` | 3 | Piso de tierra |

### Baño — peso 3

| Valor | Puntuación | Evidencia típica |
|---|---|---|
| `completo_con_puerta` | 1 | Baño completo, con puerta |
| `incompleto_o_exterior` | 2 | Incompleto, sin puerta o afuera de la vivienda |
| `no_tiene` | 3 | No tienen baño |

---

## 2. Habitabilidad (peso total: 5)

### m² por persona — peso 2 · fuente: audio (foto complementa)

| Valor | Puntuación |
|---|---|
| `mas_de_10` | 1 |
| `de_5_a_10` | 2 |
| `menos_de_5` | 3 |

⚠️ Hace falta la superficie de la vivienda y la cantidad de integrantes. Las fotos
no alcanzan para medir m²: el voluntario tiene que decirlo en el audio. Si falta
alguno de los dos datos, la IA propone un valor y lo señala como dudoso.

### Ventanas — peso 2 · fuente: foto

| Valor | Puntuación |
|---|---|
| `suficientes` | 1 |
| `insuficientes` | 2 |
| `sin_ventanas` | 3 |

### Separación de ambientes — peso 1 · fuente: foto + audio

| Valor | Puntuación |
|---|---|
| `puertas` | 1 |
| `cortinas` | 2 |
| `sin_separacion` | 3 |

---

## 3. Seguridad y salubridad (peso total: 6)

### Riesgo de derrumbe — peso 3 · fuente: foto + audio

| Valor | Puntuación | Evidencia típica |
|---|---|---|
| `normal` | 1 | Paredes y techo sin daños visibles |
| `rajaduras` | 2 | Paredes o techos muy rajados |
| `riesgo_derrumbe` | 3 | Riesgo de derrumbe o de que se vuele el techo |

### Inundable — peso 3 · fuente: audio (foto complementa)

| Valor | Puntuación | Evidencia típica |
|---|---|---|
| `normal` | 1 | — |
| `plagas` | 2 | Presencia de plagas |
| `inundable` | 3 | "Se inunda cuando llueve", marcas de agua |

⚠️ La tabla mezcla inundación y plagas en un mismo campo. Si una vivienda tiene
las dos cosas, se toma la de mayor puntuación (`inundable`).

---

## 4. Salud y familia (peso total: 11) · fuente: solo audio

### Enfermedades o discapacidad — peso 3

| Valor | Puntuación |
|---|---|
| `nada` | 0 |
| `leve` | 1 |
| `media` | 2 |
| `grave` | 3 |

Se guarda la categoría, **nunca el diagnóstico exacto**.
⚠️ Falta un criterio de Cireneos para distinguir leve, media y grave.

### Menores de 5 años — peso 3

| Valor | Puntuación |
|---|---|
| `ninguno` | 0 |
| `uno` | 1 |
| `dos_a_tres` | 2 |
| `cuatro_o_mas` | 3 |

### Menores de 5 a 12 años — peso 2

| Valor | Puntuación |
|---|---|
| `ninguno` | 0 |
| `uno` | 1 |
| `dos_a_tres` | 2 |
| `cinco_o_mas` | 3 |

⚠️ La tabla no dice cuánto vale tener **4** niños de 5 a 12 años (salta de "2 a 3" a "5 o más").

### Menores de 12 a 18 años — peso 1

| Valor | Puntuación |
|---|---|
| `ninguno` | 0 |
| `uno` | 1 |
| `dos` | 2 |
| `tres_o_mas` | 3 |

⚠️ La tabla dice "3 o más = 3, 2 a 3 = 2": el 3 aparece en las dos franjas. Tomamos 2 = 2 y 3 o más = 3.

### Familia monoparental — peso 2

| Valor | Puntuación |
|---|---|
| `padre_y_madre` | 1 |
| `solo_padre` | 2 |
| `solo_madre` | 3 |

⚠️ ¿Cómo se puntúan otras situaciones (abuela a cargo, tutor, otro familiar)?

---

## 5. Dimensión social (peso total: 11) · fuente: audio

### Vínculo con la organización — peso 3

| Valor | Puntuación |
|---|---|
| `menos_de_1_ano` | 1 |
| `de_1_a_2_anos` | 2 |
| `mas_de_2_anos` | 3 |

### Impresión de la 1ª visita — peso 3

| Valor | Puntuación |
|---|---|
| `baja` | 1 |
| `media` | 2 |
| `alta` | 3 |

⚠️ La tabla no trae criterio. Proponemos que el voluntario la elija (baja / media /
alta urgencia percibida). La IA la propone mirando todo junto (vivienda, familia,
salud, riesgos) y el voluntario la revisa; si tiene poca evidencia, queda señalada.

### Desalojo / reinserción familiar — peso 2

| Valor | Puntuación |
|---|---|
| `largo_plazo` | 1 |
| `mediano_plazo` | 2 |
| `inmediato` | 3 |

⚠️ ¿Qué puntuación lleva una familia sin riesgo de desalojo? Por ahora, `largo_plazo` (1).

### Adicionales — peso 3

| Valor | Puntuación |
|---|---|
| `ninguno` | 1 |
| `algunos` | 2 |
| `graves` | 3 |

⚠️ La tabla no trae criterio. ¿Es lo mismo que el **ajuste** de la IA (factores que
la ficha no contempla)? Si es así, conviene que el ajuste viva acá y no como un
porcentaje aparte. Mientras tanto la IA lo propone a partir del audio (otras
vulnerabilidades que no entran en los demás campos) y el voluntario lo revisa.

---

## Fórmula de urgencia

```
total   = Σ (peso_campo × puntuación_valor)          → 0 a 135
base    = total / 135 × 100                          → 0 a 100
ajuste  = sugerido por la IA, entre -15% y +15%      → solo si una persona lo acepta
espera  = +1 punto por mes desde el relevamiento, tope +12   ⚠️

puntaje = base × (1 + ajuste) + espera
```

- `total` y `base` reproducen exactamente la planilla de Cireneos (celdas TOTAL y %).
- Si el coordinador **rechaza** el ajuste, `ajuste = 0`.
- El ajuste siempre trae **motivo + evidencia** (número de foto o cita del audio).
- La IA explica el resultado en lenguaje simple: qué campos pesaron más y por qué.
- ⚠️ La tabla ya premia el tiempo de vínculo con la organización. ¿Sigue haciendo
  falta sumar puntos por espera?

### Factores que justifican un ajuste (no están en la tabla)

Inundación y desalojo ya no van acá: ahora son campos de la tabla.

| Factor | Dirección |
|---|---|
| Situación de violencia o riesgo dentro del hogar | ⬆️ |
| Vivienda al borde de un talud o cañada | ⬆️ |
| Riesgo eléctrico grave (conexión colgada, cables cerca de agua o chapa) | ⬆️ |
| Sin acceso a agua potable | ⬆️ |
| Persona postrada o con cuidados permanentes | ⬆️ |
| Embarazo | ⬆️ |
| La familia ya tiene una solución habitacional en curso (otro programa, mudanza) | ⬇️ |
| El estado real es mejor que lo que reflejan los campos (ej. ampliación reciente) | ⬇️ |

⚠️ Un terreno que no permite instalar la casa no es urgencia, es **viabilidad**: no debería ajustar el puntaje, sino marcarse aparte.

---

## Salida esperada de la llamada 1 (fotos + transcripción)

```json
{
  "campos": {
    "techo": {
      "valor": "liviano_sin_aislacion",
      "confianza": "alta",
      "evidencia": "foto 2: chapa sin cielorraso; audio: 'en invierno no se aguanta el frío'",
      "a_confirmar": false
    }
  },
  "ajuste": {
    "porcentaje": 10,
    "motivo": "La vivienda está al borde de una cañada que se desborda.",
    "evidencia": "audio: 'el año pasado el agua llegó hasta la puerta'"
  },
  "explicacion": "Texto breve en lenguaje simple."
}
```

`ajuste` puede ser `null` si la IA no detecta factores extra.

---

## Pendiente de validar con Cireneos

1. Criterio para "Impresión de la 1ª visita" y "Adicionales" (la tabla no lo trae).
2. Si "Adicionales" reemplaza al ajuste de la IA.
3. Cómo distinguir enfermedad o discapacidad leve, media y grave.
4. Los cortes de menores: 4 niños de 5 a 12 años y el solapamiento en 12 a 18.
5. Otras composiciones familiares en "monoparental".
6. Qué puntúa una familia sin riesgo de desalojo.
7. Si se mantienen los puntos por tiempo de espera, dado que ya se puntúa el vínculo.
