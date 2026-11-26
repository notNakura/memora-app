# Sin conexión y sincronización

## Modelo

- El teléfono tiene una réplica SQLite (`database/memora_sqlite.sql`, 34 tablas) con los datos del usuario:
  sus instituciones y membresías, secciones, mazos, tarjetas, `card_state`, historial, evaluaciones abiertas y
  notificaciones.
- Toda escritura local se registra también en `pending_change` (tabla, id, operación, JSON).
- Al recuperar conexión se envían los cambios pendientes y se reciben los del servidor; cada
  sincronización queda en `sync_log` (enviados, recibidos, conflictos, resultado).

## Qué viaja en cada sentido

| Sentido | Tablas |
|---|---|
| Solo se descargan (las escribe el servidor o un administrador) | `institution`, `area`, `membership`, `academic_term`, `subject`, `unit`, `section`, `enrollment`, `unit_unlock`, `deck_endorsement`, `deck_assignment`, `assessment`, `question`, `assessment_exception`, `reinforcement_plan`, `plan_card`, `badge`, `user_badge`, `notification` |
| Se crean en el teléfono y se suben | `review_log`, `challenge`, `challenge_card`, `attempt`, `answer`, `card_state`, `streak`, `error_report`, `deck_subscription` |
| Se suben solo con conexión (no se crean sin ella) | `deck`, `card`, `card_option` (sin conexión queda un borrador en `pending_change` y el servidor asigna los identificadores al publicar) |
| Nunca están en el teléfono | `email_code`, `audit_log` y el campo `app_user.password_hash` |

- **Varias instituciones:** se descargan todas las instituciones y membresías activas del usuario; el selector
  de institución activa funciona sin conexión.
- **Suspensión o retiro:** si en la descarga una institución viene `suspended` o una membresía `removed`, el
  teléfono deja esa institución en solo lectura (suspendida) o borra sus datos locales (retirada) y descarta
  los cambios pendientes que le pertenezcan, avisando al usuario.
- **Notificaciones:** los avisos de membresía (`membership_update`, `join_request`) también fuerzan una
  sincronización al llegar como notificación push.

## Identificadores

`review_log`, `challenge` y `attempt` usan UUID generados en el teléfono (`expo-crypto`) para que dos
dispositivos no generen la misma clave. `answer` y `challenge_card` tienen clave compuesta formada por esos UUID
y el id de la pregunta o tarjeta, así que tampoco chocan. Las demás tablas usan enteros asignados por el
servidor.

## Reglas de conflicto (RNF-11)

1. `review_log` solo agrega filas: los repasos de varios dispositivos se combinan en orden cronológico y
   `card_state` se recalcula aplicando FSRS en ese orden.
2. Un `attempt` presentado sin conexión es válido si `started_at` es anterior a `assessment.closes_at`
   (o a `assessment_exception.new_closes_at`); se marca con `synced_at`.
3. Cambios simultáneos sobre una tarjeta (edición del autor): gana la versión con `updated_at` más reciente
   y `card.version` aumenta.
4. Nada de lo que ve el estudiante depende de estar conectado, salvo registrarse (verificar el correo), unirse a
   una sección o institución, publicar mazos y descargar mazos nuevos.
