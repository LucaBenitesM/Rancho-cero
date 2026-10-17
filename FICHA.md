# Ficha de relevamiento — Rancho Cero

Propuesta inicial de campos, valores, reglas de confianza y fórmula de urgencia.
**Todo lo marcado con ⚠️ hay que validarlo con Cireneos.** Los pesos y puntos son
una propuesta del equipo, no un criterio oficial.

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
| **"A confirmar"** | Confianza baja, sin evidencia, o foto y audio se contradicen. El voluntario lo resuelve eligiendo una opción (sin escribir). |
| **Datos de personas** | Los campos de familia salen **solo del audio**. Nunca se infieren de las fotos (las fotos no muestran personas). |
| **Salud** | Discapacidad, enfermedad y embarazo nunca se infieren. Si no se mencionan, quedan "a confirmar". Nunca se guarda el diagnóstico exacto en la versión pública. |
| **Ranking** | Solo entran casos en estado `confirmado`, es decir, sin ningún campo "a confirmar". |

---

## Vivienda (peso total: 55)

### Techo — peso 12 · fuente: foto (audio complementa)

| Valor | Puntos | Evidencia típica |
|---|---|---|
| `material` (losa / hormigón) | 0 | Losa visible, sin filtraciones |
| `chapa_buena` | 3 | Chapa entera, fijada, sin óxido visible |
| `chapa_deteriorada` | 7 | Óxido, agujeros, parches, "se llueve" en el audio |
| `madera_carton` | 8 | Tablas, cartón, fibrocemento roto |
| `nylon_lona` | 10 | Nylon o lona como cubierta principal |

### Paredes — peso 10 · fuente: foto

| Valor | Puntos | Evidencia típica |
|---|---|---|
| `bloque_terminado` | 0 | Bloque o ladrillo revocado, sin grietas |
| `bloque_sin_terminar` | 3 | Bloque sin revocar, aberturas sin cerrar |
| `madera_chapa` | 6 | Tablas o chapa como paredes |
| `mixto_precario` | 8 | Mezcla de cartón, restos, materiales recuperados |
| `nylon_incompletas` | 10 | Nylon, lona o paredes que no cierran el ambiente |

### Piso — peso 6 · fuente: foto

| Valor | Puntos | Evidencia típica |
|---|---|---|
| `ceramica_contrapiso` | 0 | Piso terminado |
| `contrapiso_deteriorado` | 3 | Contrapiso roto o con desniveles |
| `madera_sobre_tierra` | 6 | Tarimas o tablas apoyadas en tierra |
| `tierra` | 10 | Piso de tierra |

### Humedad — peso 7 · fuente: foto + audio

| Valor | Puntos | Evidencia típica |
|---|---|---|
| `sin_signos` | 0 | Paredes y techo secos |
| `leve` | 3 | Manchas puntuales |
| `extendida` | 7 | Moho, manchas grandes, olor mencionado en el audio |
| `filtracion_activa` | 10 | Goteras, agua entrando, "se inunda cuando llueve" |

### Riesgo eléctrico — peso 10 · fuente: foto + audio

| Valor | Puntos | Evidencia típica |
|---|---|---|
| `instalacion_segura` | 0 | Tablero, cables embutidos o canalizados |
| `sin_electricidad` | 5 | No hay luz eléctrica ⚠️ (¿cuenta como riesgo o como carencia?) |
| `cables_expuestos` | 6 | Empalmes visibles, cables sueltos dentro de la casa |
| `conexion_irregular_peligrosa` | 10 | Conexión colgada, cables cerca de agua o chapa |

### Baño — peso 5 · fuente: foto + audio

| Valor | Puntos | Evidencia típica |
|---|---|---|
| `interno_completo` | 0 | Baño dentro de la vivienda con descarga |
| `interno_precario` | 4 | Dentro pero sin descarga o sin terminar |
| `externo_letrina` | 7 | Letrina o baño afuera |
| `sin_bano` | 10 | No tienen baño |

### Agua — peso 5 · fuente: audio (foto complementa)

| Valor | Puntos | Evidencia típica |
|---|---|---|
| `red_dentro` | 0 | Canilla dentro de la vivienda |
| `canilla_terreno` | 4 | Canilla en el terreno, afuera |
| `compartida` | 7 | Canilla de un vecino o comunitaria |
| `sin_acceso` | 10 | Acarrean agua desde lejos |

---

## Familia (peso total: 45) · fuente: solo audio

### Integrantes — peso 8

| Valor | Puntos |
|---|---|
| 1–2 personas | 2 |
| 3–4 personas | 5 |
| 5–6 personas | 8 |
| 7 o más | 10 |

⚠️ Lo ideal sería medir hacinamiento (personas por ambiente). ¿Cireneos registra la cantidad de ambientes?

### Menores de 18 — peso 9

| Valor | Puntos |
|---|---|
| 0 | 0 |
| 1 | 5 |
| 2 | 7 |
| 3 o más | 10 |

⚠️ ¿Los menores de 5 años deberían sumar más?

### Mayores de 65 — peso 5

| Valor | Puntos |
|---|---|
| 0 | 0 |
| 1 | 6 |
| 2 o más | 10 |

### Discapacidad — peso 8

| Valor | Puntos |
|---|---|
| `no` | 0 |
| `si_sin_adaptacion` | 6 |
| `si_requiere_accesibilidad` | 10 |

### Enfermedad grave — peso 8

| Valor | Puntos |
|---|---|
| `no` | 0 |
| `si_cronica` | 5 |
| `si_agravada_por_vivienda` | 10 |

Ejemplo de "agravada por la vivienda": una enfermedad respiratoria en una casa con humedad. Se guarda la categoría, **nunca el diagnóstico exacto**.

### Embarazo — peso 7

| Valor | Puntos |
|---|---|
| `no` | 0 |
| `si` | 10 |

---

## Fórmula de urgencia

```
base    = Σ (peso_campo × puntos_valor / 10)        → 0 a 100
ajuste  = sugerido por la IA, entre -15% y +15%     → solo si una persona lo acepta
espera  = +1 punto por mes desde el relevamiento, tope +12   ⚠️

puntaje = base × (1 + ajuste) + espera
```

- Si el coordinador **rechaza** el ajuste, `ajuste = 0`.
- El ajuste siempre trae **motivo + evidencia** (número de foto o cita del audio).
- La IA explica el resultado en lenguaje simple: qué campos pesaron más y por qué.

### Factores que justifican un ajuste (no están en la ficha)

| Factor | Dirección |
|---|---|
| Situación de violencia o riesgo dentro del hogar | ⬆️ |
| Vivienda en zona inundable o al borde de un talud o cañada | ⬆️ |
| Desalojo inminente | ⬆️ |
| Persona postrada o con cuidados permanentes | ⬆️ |
| La familia ya tiene una solución habitacional en curso (otro programa, mudanza) | ⬇️ |
| El estado real es mejor que lo que reflejan los campos (ej. ampliación reciente) | ⬇️ |

⚠️ Un terreno que no permite instalar la casa no es urgencia, es **viabilidad**: no debería ajustar el puntaje, sino marcarse aparte.

---

## Salida esperada de la llamada 1 (fotos + transcripción)

```json
{
  "campos": {
    "techo": {
      "valor": "chapa_deteriorada",
      "confianza": "alta",
      "evidencia": "foto 2: chapa con óxido y agujeros; audio: 'cuando llueve se moja todo'",
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

1. Los pesos de cada campo y los puntos de cada valor.
2. Si "sin electricidad" cuenta como riesgo.
3. Si se registra la cantidad de ambientes (para medir hacinamiento).
4. Si los menores de 5 años suman más.
5. Los puntos por tiempo de espera y su tope.
6. Si están de acuerdo con la lista de factores de ajuste.
