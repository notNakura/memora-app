# Lógica de repaso y evaluación

## FSRS en una línea

Cada tarjeta, por estudiante, tiene **estabilidad (S)** y **dificultad (D)**. La probabilidad de
recordarla hoy es la **recuperabilidad**:

```
R(t, S) = (1 + 19/81 · t / S) ^ -0.5        t = días desde el último repaso
```

Con retención deseada 0.90 el próximo repaso cae a S días. En general:

```
intervalo = S / (19/81) · (retencion ^ -2 − 1)
```

- `1`: R = 100 % justo después de repasar.
- `−0.5`: forma de la curva (ley de potencia ajustada a datos reales de repasos).
- `19/81`: sale de exigir R = 0.9 cuando t = S (definición de estabilidad): 0.9⁻² − 1 = 100/81 − 1.

**Implementación:** usar `ts-fsrs` con parámetros por defecto (FSRS-5, 19 parámetros w0…w18 que trae la
librería) y `request_retention = app_user.desired_retention`. **No** usar el optimizador.

## Calificaciones

`1 Otra vez · 2 Difícil · 3 Bien · 4 Fácil`. Se guardan dos valores en `review_log`:
- `rating`: lo que marcó el estudiante.
- `applied_rating`: lo que usó FSRS después de la corrección por tiempo.

**Corrección por tiempo:** si `rating = 3` y `response_time_ms > 2 × card_state.avg_response_ms`,
entonces `applied_rating = 2`. Actualizar `avg_response_ms` (media móvil) en la misma transacción.

## Estados de la tarjeta (`card_state.status`)

`new → learning → review → mastered`
- `mastered`: estabilidad > 21 días y tiempo de respuesta por debajo del promedio.
- Fallo (`applied_rating = 1`): vuelve a `learning`, `lapses + 1`. Con `lapses ≥ 8` → `is_leech = true`,
  notificación `leech_alert` al autor del mazo.
- Formato (`format`): `choice` (4 opciones) mientras la estabilidad sea baja; `typing` cuando la
  estabilidad supera unos 7 días.

## Cola del día

1. Calcular R de las tarjetas con `due_at ≤ ahora` (y las que bajaron de la meta).
2. Ordenar de menor a mayor R (más riesgo primero).
3. Agregar nuevas hasta `app_user.daily_new_limit`.
4. Intercalar materias y unidades.
5. Unidades bloqueadas: no entran tarjetas de una unidad si la anterior no está dominada, salvo que exista
   un registro en `unit_unlock`.

## Modo examen

Si el mazo tiene `deck_assignment.exam_date` o `deck_subscription.exam_date` en los próximos días, usar una
retención mayor (por ejemplo 0.95) para ese mazo: el intervalo baja a ≈ 0.46 · S.

## Práctica libre

`review_log.source = 'practice'`: se registra la respuesta pero **no** se actualiza `card_state`
(`new_stability` y `new_difficulty` quedan nulos; el CHECK de la base de datos lo exige).

## Reto de dominio

- Lo propone el Planificador cada cierto tiempo o antes de una evaluación, no el estudiante.
- Toma tarjetas `mastered` o con estabilidad alta; unos 2 minutos, 8 s por pregunta, 4 opciones.
- Acierto a tiempo: `challenge_card.confirmed = true`, se registra como Bien y el intervalo crece.
- Fallo o tiempo agotado: baja a `review`.
- Pausar o pedir más tiempo: `challenge.pauses`, `challenge.extra_time_sec`. El tiempo se multiplica por
  `app_user.time_factor`.

## Evaluaciones

- Estados: `draft → published → closed`. El profesor revisa preguntas en borrador (`prompt_override`).
- Cada pregunta apunta a una tarjeta. Si `updates_cards`: acierto refuerza (rating 3), fallo devuelve a
  `learning`.
- Si `mastery_pct < min_mastery` y `creates_plan`: crear `reinforcement_plan` con las tarjetas falladas
  repartidas en `days`; al completarlo, si `allows_retake`, se habilita el intento 2.
- Tiempo efectivo = tiempo configurado × `time_factor` + `assessment_exception.extra_time_sec`.
- Nota sobre 20 visible solo si `show_grade`.

## Explicación "¿por qué veo esta tarjeta?"

Mostrar: fecha del último repaso, R actual frente a la meta, próximo intervalo si acierta y, si aplica,
la corrección por tiempo del último repaso (`rating ≠ applied_rating`).

## Mensajes y notificaciones

- Tipos en `notification.type`: review_due, new_assessment, assessment_closing, plan_reminder,
  grade_published, report_update, endorsement_update, leech_alert, membership_update, join_request.
- El recordatorio diario se programa con `expo-notifications` a la hora `app_user.reminder_time` si
  `notifications_enabled` es verdadero y hay tarjetas pendientes.
- **Género gramatical:** si `app_user.sex` es `female` se usa la forma femenina ("Bienvenida",
  "¡Lo lograste, estás lista!"), si es `male` la masculina y si es nulo o `unspecified` una redacción
  neutra ("Te damos la bienvenida", "¡Lo lograste!"). Guardar cada texto con sus tres variantes.
- La edad se calcula desde `birth_date` y solo se usa en estadísticas agrupadas del administrador.
