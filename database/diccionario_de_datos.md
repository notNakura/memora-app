# Diccionario de datos (PostgreSQL)

Nombres de tablas y campos en inglés; descripciones en español. El script completo está en `memora_postgresql.sql` y la versión del teléfono en `memora_sqlite.sql` (34 tablas: no incluye `email_code`, `audit_log` ni `app_user.password_hash`, no tiene disparadores y agrega `pending_change`). Son 35 tablas.

## institution

Instituciones que usan Memora (universidades, institutos o cursos). Cada una tiene sus datos separados.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| institution_id | INT | No | PK | Identificador único. |
| name | VARCHAR(120) | No |  | Nombre de la institución. |
| type | VARCHAR(12) | No |  | university (universidad), institute (instituto) o course (curso). |
| join_code | CHAR(8) | No |  | Código de 8 caracteres para unirse; también se comparte como enlace o código QR. Usa solo 2-9 y letras sin I ni O. |
| code_expires_at | TIMESTAMP | Sí |  | Fecha en que vence el código; nula si no vence. |
| join_mode | VARCHAR(8) | No |  | Modo de ingreso: open (abierto, entra quien tenga el código), approval (con aprobación de un administrador) o roster (solo los de la lista de inscritos entran directo; el resto queda por confirmar). |
| status | VARCHAR(10) | No |  | active (activa) o suspended (suspendida por el equipo de Memora). |
| created_by | INT | No | FK → app_user | Usuario que registró la institución; queda como su primer administrador. |
| created_at | TIMESTAMP | No |  | Fecha de registro. |

## area

Áreas de una institución: facultad, escuela, programa o carrera.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| area_id | INT | No | PK | Identificador único. |
| institution_id | INT | No | FK → institution | Referencia a institution. |
| name | VARCHAR(100) | No |  | Nombre del área, p. ej. Ingeniería de Sistemas. |

## membership

Pertenencia de un usuario a una institución con un rol. Una persona puede tener varias membresías. No se crea al registrarse, sino al usar un código, al completar el registro si estaba en la lista de inscritos o al registrar una institución.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| membership_id | INT | No | PK | Identificador único. |
| user_id | INT | No | FK → app_user | Usuario. |
| institution_id | INT | No | FK → institution | Referencia a institution. |
| area_id | INT | Sí | FK → area | Área que administra; solo para el rol area_admin. |
| role | VARCHAR(18) | No |  | student, teacher, area_admin (administrador de área) o institution_admin (administrador de la institución). |
| status | VARCHAR(10) | No |  | invited (cargado en la lista de inscritos, aún sin entrar), pending (por confirmar), active (activa), rejected (rechazada) o removed (retirada). |
| approved_by | INT | Sí | FK → app_user | Administrador que aprobó o rechazó la solicitud; nulo si entró directo. |
| created_at | TIMESTAMP | No |  | Fecha de alta. |

## app_user

Personas que usan Memora y sus preferencias de estudio. El rol no se guarda aquí sino en membership, por institución; la única excepción es is_platform_admin, que identifica al equipo de Memora.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| user_id | INT | No | PK | Identificador único. |
| national_id | VARCHAR(12) | Sí |  | Cédula de identidad; única. Nula hasta que la persona completa el paso 3 del registro (o hasta que la cargue una lista de inscritos). |
| first_names | VARCHAR(60) | Sí |  | Nombres; nulos hasta completar el paso 3 del registro. |
| last_names | VARCHAR(60) | Sí |  | Apellidos; nulos hasta completar el paso 3 del registro. |
| email | VARCHAR(120) | No |  | Correo electrónico; único, se usa para iniciar sesión. |
| email_verified_at | TIMESTAMP | Sí |  | Fecha en que el usuario verificó su correo con el código enviado; nula mientras no lo haga. Sin verificar no se entregan datos precargados ni membresías de la lista de inscritos. |
| password_hash | VARCHAR(255) | Sí |  | Contraseña cifrada con bcrypt; nunca se guarda en claro. Es nula en las cuentas cargadas por CSV hasta que la persona verifica su correo y la reclama. |
| birth_date | DATE | Sí |  | Fecha de nacimiento (opcional); la edad se calcula a partir de ella. |
| sex | VARCHAR(12) | Sí |  | Sexo (opcional): female, male o unspecified. Adapta el género gramatical de mensajes y notificaciones; si es nulo se usa redacción neutra. |
| desired_retention | NUMERIC(3,2) | No |  | Meta de retención de FSRS (0,90 = recordar el 90 %). Sube en modo examen. |
| time_factor | NUMERIC(3,2) | No |  | Multiplicador de los límites de tiempo (1,50 = 50 % más de tiempo). WCAG 2.2.1. |
| daily_new_limit | SMALLINT | No |  | Máximo de tarjetas nuevas por día. |
| notifications_enabled | BOOLEAN | No |  | Si el usuario recibe recordatorios. |
| vibration_enabled | BOOLEAN | No |  | Indica si la aplicación vibra levemente al responder y al tocar los botones principales. La aplicación no usa efectos de sonido. |
| reminder_time | TIME | No |  | Hora del recordatorio diario de repaso. |
| show_name_publicly | BOOLEAN | No |  | Si su nombre aparece como autor en los mazos públicos. |
| onboarding_completed | BOOLEAN | No |  | Si ya vio la guía de inicio. |
| is_platform_admin | BOOLEAN | No |  | Superadministrador del equipo de Memora; solo puede suspender instituciones por abuso. |
| is_active | BOOLEAN | No |  | Falso si el equipo de Memora bloqueó la cuenta por abuso. Los administradores de una institución no lo usan: retiran la membresía (membership.status = removed). |
| created_at | TIMESTAMP | No |  | Fecha y hora de registro. |

## email_code

Códigos de un solo uso enviados al correo para verificarlo al registrarse o para recuperar la contraseña.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| code_id | INT | No | PK | Identificador único. |
| user_id | INT | No | FK → app_user | Referencia a app_user. |
| purpose | VARCHAR(16) | No |  | verify_email (verificar el correo al crear la cuenta o al reclamar una cuenta precargada) o reset_password (recuperar o restablecer la contraseña). |
| code_hash | VARCHAR(255) | No |  | Código de 6 dígitos cifrado; se envía por correo. |
| requested_by | INT | Sí | FK → app_user | Administrador que restableció la contraseña; nulo si lo pidió el propio usuario. |
| attempts | SMALLINT | No |  | Intentos fallidos; al llegar a 5 el código deja de servir. |
| created_at | TIMESTAMP | No |  | Fecha de envío. |
| expires_at | TIMESTAMP | No |  | Fecha de vencimiento (15 minutos después del envío). |
| used_at | TIMESTAMP | Sí |  | Fecha en que se usó; nulo si no se ha usado. |

## academic_term

Lapsos académicos de cada institución.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| term_id | INT | No | PK | Identificador único. |
| institution_id | INT | No | FK → institution | Institución a la que pertenece el lapso. |
| name | VARCHAR(10) | No |  | Nombre del lapso, p. ej. 2026-II; único dentro de la institución. |
| starts_on | DATE | No |  | Fecha de inicio. |
| ends_on | DATE | No |  | Fecha de cierre. |
| status | VARCHAR(8) | No |  | open (abierto) o closed (cerrado). |

## subject

Materias de un área.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| subject_id | INT | No | PK | Identificador único. |
| area_id | INT | No | FK → area | Área a la que pertenece la materia. |
| code | VARCHAR(15) | No |  | Código de la materia; único dentro del área. |
| name | VARCHAR(100) | No |  | Nombre de la materia. |

## unit

Unidades temáticas de una materia; se desbloquean por dominio.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| unit_id | INT | No | PK | Identificador único. |
| subject_id | INT | No | FK → subject | Referencia a subject. |
| number | SMALLINT | No |  | Número de la unidad dentro de la materia. |
| name | VARCHAR(100) | No |  | Nombre de la unidad. |

## section

Sección de una materia dictada por un profesor en un lapso.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| section_id | INT | No | PK | Identificador único. |
| subject_id | INT | No | FK → subject | Referencia a subject. |
| term_id | INT | No | FK → academic_term | Lapso al que pertenece la sección. |
| teacher_id | INT | Sí | FK → app_user | Profesor responsable; nulo mientras no se asigne. |
| name | VARCHAR(20) | No |  | Nombre de la sección. |
| join_code | CHAR(6) | No |  | Código de 6 caracteres para unirse; también se comparte como enlace o código QR y se puede regenerar. Usa solo 2-9 y letras sin I ni O. |
| code_expires_at | TIMESTAMP | Sí |  | Fecha en que vence el código; nula si no vence. |
| join_mode | VARCHAR(8) | No |  | Modo de ingreso: open (abierto), approval (el profesor aprueba cada solicitud) o roster (entran directo los de la lista de inscritos; el resto queda por confirmar). |
| capacity | SMALLINT | Sí |  | Cupo máximo de estudiantes activos; nulo sin límite. |
| is_archived | BOOLEAN | No |  | Sección archivada al cerrar el lapso. |

## enrollment

Estudiantes inscritos en cada sección (relación N:M).

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| section_id | INT | No | PK / FK → section | Referencia a section. |
| student_id | INT | No | PK / FK → app_user | Estudiante inscrito. |
| enrolled_at | TIMESTAMP | No |  | Fecha en que se unió. |
| status | VARCHAR(10) | No |  | invited (en la lista de inscritos, aún sin entrar), pending (por confirmar), active (activo), rejected (rechazado), left (salió) o removed (retirado por el profesor). |
| reviewed_by | INT | Sí | FK → app_user | Profesor o administrador que aprobó o rechazó la solicitud; nulo si entró directo. |
| ended_at | TIMESTAMP | Sí |  | Fecha de salida o retiro. |

## unit_unlock

Desbloqueos de unidades concedidos por el profesor a un estudiante.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| student_id | INT | No | PK / FK → app_user | Estudiante al que se desbloquea la unidad. |
| unit_id | INT | No | PK / FK → unit | Referencia a unit. |
| granted_by | INT | No | FK → app_user | Profesor que concede el desbloqueo. |
| reason | VARCHAR(200) | No |  | Justificación. |
| granted_at | TIMESTAMP | No |  | Fecha del desbloqueo. |

## deck

Conjunto de tarjetas de una materia creado por un estudiante o un profesor.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| deck_id | INT | No | PK | Identificador único. |
| author_id | INT | No | FK → app_user | Usuario que creó el mazo. |
| subject_id | INT | No | FK → subject | Referencia a subject. |
| source_deck_id | INT | Sí | FK → deck | Mazo del que se copió; nulo si es original. |
| name | VARCHAR(100) | No |  | Nombre del mazo. |
| description | VARCHAR(300) | Sí |  | Descripción breve. |
| visibility | VARCHAR(12) | No |  | private (solo yo), section (mi sección) o institution (toda la institución). |
| is_hidden | BOOLEAN | No |  | Ocultado por moderación del administrador. |
| is_deleted | BOOLEAN | No |  | Eliminación lógica: deja de mostrarse pero conserva el historial. |
| created_at | TIMESTAMP | No |  | Fecha de creación. |
| updated_at | TIMESTAMP | No |  | Última modificación. |

## deck_endorsement

Solicitudes de aval de mazos de estudiantes y la respuesta del profesor.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| deck_id | INT | No | PK / FK → deck | Referencia a deck. |
| section_id | INT | No | PK / FK → section | Referencia a section. |
| teacher_id | INT | Sí | FK → app_user | Profesor que revisa. |
| status | VARCHAR(10) | No |  | pending (pendiente), approved (avalado) o rejected (rechazado). |
| requested_at | TIMESTAMP | No |  | Fecha de la solicitud. |
| reviewed_at | TIMESTAMP | Sí |  | Fecha de la revisión. |
| comment | VARCHAR(300) | Sí |  | Observación del profesor; obligatoria al rechazar. |

## deck_assignment

Mazos asignados por el profesor a una sección.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| deck_id | INT | No | PK / FK → deck | Referencia a deck. |
| section_id | INT | No | PK / FK → section | Referencia a section. |
| assigned_at | TIMESTAMP | No |  | Fecha de la asignación. |
| exam_date | DATE | Sí |  | Fecha del parcial; activa el modo examen (Cepeda et al., 2008). |

## deck_subscription

Mazos que un estudiante agregó para estudiar, con su fecha de examen personal.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| student_id | INT | No | PK / FK → app_user | Estudiante. |
| deck_id | INT | No | PK / FK → deck | Referencia a deck. |
| subscribed_at | TIMESTAMP | No |  | Fecha en que lo agregó. |
| exam_date | DATE | Sí |  | Fecha de examen personal; activa el modo examen propio. |

## card

Tarjeta de memoria. Se corrige sin perder el progreso (mazos vivos).

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| card_id | INT | No | PK | Identificador único. |
| deck_id | INT | No | FK → deck | Referencia a deck. |
| unit_id | INT | Sí | FK → unit | Unidad a la que pertenece (permite el intercalado y el desbloqueo). |
| type | VARCHAR(20) | No |  | basic (pregunta y respuesta), cloze (completar), image_occlusion (imagen con zonas tapadas) u ordering (ordenar pasos). |
| front | TEXT | No |  | Pregunta o enunciado. |
| back | TEXT | No |  | Respuesta. |
| image_url | VARCHAR(255) | Sí |  | Ruta de la imagen (tarjetas con zonas tapadas). |
| version | INT | No |  | Versión; sube cuando se corrige un error. |
| is_active | BOOLEAN | No |  | Indica si la tarjeta está en uso. |
| updated_at | TIMESTAMP | No |  | Última modificación. |

## card_option

Opciones de respuesta de una tarjeta para preguntas de 4 opciones.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| option_id | INT | No | PK | Identificador único. |
| card_id | INT | No | FK → card | Referencia a card. |
| text | VARCHAR(255) | No |  | Texto de la opción. |
| is_correct | BOOLEAN | No |  | Indica si es la opción correcta. |

## error_report

Errores reportados en tarjetas y su resolución.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| report_id | INT | No | PK | Identificador único. |
| card_id | INT | No | FK → card | Referencia a card. |
| reporter_id | INT | No | FK → app_user | Usuario que reporta. |
| reason | VARCHAR(16) | No |  | Motivo: missing_answer, wrong_answer, confusing o inappropriate. |
| description | VARCHAR(500) | Sí |  | Descripción del error. |
| status | VARCHAR(12) | No |  | open (abierto), fixed (corregido) o dismissed (descartado). |
| reported_at | TIMESTAMP | No |  | Fecha del reporte. |
| reviewer_id | INT | Sí | FK → app_user | Autor o profesor que resolvió el reporte. |
| resolution | VARCHAR(300) | Sí |  | Respuesta del autor, del profesor o del administrador. |
| resolved_at | TIMESTAMP | Sí |  | Fecha de resolución. |

## card_state

Estado actual de la memoria de cada estudiante en cada tarjeta (FSRS).

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| student_id | INT | No | PK / FK → app_user | Estudiante. |
| card_id | INT | No | PK / FK → card | Referencia a card. |
| status | VARCHAR(12) | No |  | new (nueva), learning (aprendiendo), review (en repaso) o mastered (dominada). |
| stability | NUMERIC(8,2) | Sí |  | FSRS: días que tarda la recuperabilidad en bajar al 90 %. |
| difficulty | NUMERIC(4,2) | Sí |  | FSRS: dificultad de la tarjeta para este estudiante (1 a 10). |
| format | VARCHAR(10) | No |  | choice (reconocer entre opciones) o typing (escribir la respuesta). |
| last_review_at | TIMESTAMP | Sí |  | Último repaso. |
| due_at | TIMESTAMP | Sí |  | Fecha programada por FSRS. |
| lapses | INT | No |  | Veces que la olvidó; con 8 o más se marca problemática. |
| avg_response_ms | INT | Sí |  | Tiempo promedio de respuesta; sirve para corregir la autoevaluación. |
| is_leech | BOOLEAN | No |  | Tarjeta que se falla mucho (leech); se avisa al autor. |

## review_log

Historial de cada respuesta del estudiante (repaso, diagnóstico, reto, evaluación o refuerzo). Solo se agregan filas.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| review_id | UUID | No | PK | Identificador único. |
| student_id | INT | No | FK → app_user | Estudiante. |
| card_id | INT | No | FK → card | Referencia a card. |
| occurred_at | TIMESTAMP | No |  | Momento de la respuesta. |
| source | VARCHAR(14) | No |  | Origen: review, diagnostic, challenge, assessment, reinforcement o practice. |
| rating | SMALLINT | No |  | Autoevaluación: 1 Otra vez, 2 Difícil, 3 Bien, 4 Fácil. |
| applied_rating | SMALLINT | No |  | Calificación que usó FSRS después de la corrección por tiempo. |
| response_time_ms | INT | No |  | Tiempo que tardó en responder. |
| elapsed_days | NUMERIC(7,2) | No |  | Días desde el repaso anterior. |
| retrievability | NUMERIC(4,3) | Sí |  | Probabilidad calculada de recordarla en ese momento. |
| new_stability | NUMERIC(8,2) | Sí |  | Estabilidad resultante; nula en la práctica libre. |
| new_difficulty | NUMERIC(4,2) | Sí |  | Dificultad resultante; nula en la práctica libre. |
| challenge_id | UUID | Sí | FK → challenge | Reto de dominio, si la respuesta vino de uno. |
| attempt_id | UUID | Sí | FK → attempt | Intento de evaluación, si vino de una. |
| is_synced | BOOLEAN | No |  | Falso mientras está solo en el teléfono. |

## challenge

Reto de dominio cronometrado propuesto por el Planificador de repasos.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| challenge_id | UUID | No | PK | Identificador único. |
| student_id | INT | No | FK → app_user | Estudiante. |
| started_at | TIMESTAMP | No |  | Inicio del reto. |
| finished_at | TIMESTAMP | Sí |  | Fin del reto. |
| total_time_sec | INT | No |  | Tiempo total (por defecto 120 s). |
| time_per_question_sec | INT | No |  | Segundos por tarjeta. |
| extra_time_sec | INT | No |  | Tiempo extra pedido por el estudiante. |
| pauses | SMALLINT | No |  | Número de pausas. |

## challenge_card

Tarjetas incluidas en un reto y su resultado.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| challenge_id | UUID | No | PK / FK → challenge | Referencia a challenge. |
| card_id | INT | No | PK / FK → card | Referencia a card. |
| selected_option_id | INT | Sí | FK → card_option | Opción que tocó; nula si se acabó el tiempo. |
| response_time_ms | INT | Sí |  | Tiempo de respuesta. |
| confirmed | BOOLEAN | No |  | Verdadero si acertó a tiempo (se confirma el dominio); falso si baja de estado. |

## assessment

Evaluación diagnóstica o docente sobre un mazo.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| assessment_id | INT | No | PK | Identificador único. |
| deck_id | INT | No | FK → deck | Referencia a deck. |
| section_id | INT | Sí | FK → section | Sección evaluada; nula en la diagnóstica. |
| type | VARCHAR(12) | No |  | diagnostic (diagnóstica) o teacher (creada por el profesor). |
| status | VARCHAR(10) | No |  | draft (borrador), published (publicada) o closed (cerrada). |
| title | VARCHAR(120) | No |  | Título. |
| min_mastery | NUMERIC(3,2) | No |  | Porcentaje mínimo de dominio (0,80 = 80 %). |
| total_time_min | SMALLINT | Sí |  | Tiempo total del cronómetro. |
| time_per_question_sec | SMALLINT | Sí |  | Tiempo por pregunta. |
| show_grade | BOOLEAN | No |  | Si el estudiante ve la nota. |
| updates_cards | BOOLEAN | No |  | Si las respuestas cambian el estado de las tarjetas. |
| creates_plan | BOOLEAN | No |  | Si se genera un plan con los temas fallados. |
| allows_retake | BOOLEAN | No |  | Si hay segundo intento tras el refuerzo. |
| opens_at | TIMESTAMP | Sí |  | Apertura. |
| closes_at | TIMESTAMP | Sí |  | Cierre. |

## question

Preguntas de una evaluación; cada una enlazada a una tarjeta.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| question_id | INT | No | PK | Identificador único. |
| assessment_id | INT | No | FK → assessment | Referencia a assessment. |
| card_id | INT | No | FK → card | Referencia a card. |
| position | SMALLINT | No |  | Posición en la evaluación. |
| prompt_override | TEXT | Sí |  | Enunciado editado por el profesor; nulo si se usa el de la tarjeta. |
| points | NUMERIC(4,2) | No |  | Puntos de la pregunta. |

## assessment_exception

Tiempo extra o reapertura individual concedidos por el profesor.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| assessment_id | INT | No | PK / FK → assessment | Referencia a assessment. |
| student_id | INT | No | PK / FK → app_user | Estudiante beneficiado. |
| granted_by | INT | No | FK → app_user | Profesor que la concede. |
| extra_time_sec | INT | No |  | Segundos adicionales. |
| new_closes_at | TIMESTAMP | Sí |  | Nueva fecha de cierre solo para este estudiante. |
| reason | VARCHAR(200) | No |  | Justificación. |
| granted_at | TIMESTAMP | No |  | Fecha de la concesión. |

## attempt

Cada vez que un estudiante presenta una evaluación (máximo 2).

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| attempt_id | UUID | No | PK | Identificador único. |
| assessment_id | INT | No | FK → assessment | Referencia a assessment. |
| student_id | INT | No | FK → app_user | Estudiante. |
| attempt_number | SMALLINT | No |  | 1 o 2 (segunda oportunidad). |
| started_at | TIMESTAMP | No |  | Inicio. |
| finished_at | TIMESTAMP | Sí |  | Fin. |
| synced_at | TIMESTAMP | Sí |  | Momento en que llegó al servidor; permite validar intentos presentados sin conexión. |
| mastery_pct | NUMERIC(5,2) | Sí |  | Porcentaje de dominio logrado. |
| grade | NUMERIC(4,2) | Sí |  | Nota en escala de 0 a 20 (se muestra si el profesor lo decide). |
| extra_time_sec | INT | No |  | Tiempo extra otorgado. |

## answer

Respuesta a cada pregunta dentro de un intento.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| attempt_id | UUID | No | PK / FK → attempt | Referencia a attempt. |
| question_id | INT | No | PK / FK → question | Referencia a question. |
| selected_option_id | INT | Sí | FK → card_option | Opción elegida; nula si respondió No lo sé todavía o se acabó el tiempo. |
| is_correct | BOOLEAN | No |  | Si acertó. |
| response_time_ms | INT | Sí |  | Tiempo de respuesta. |

## reinforcement_plan

Plan automático de refuerzo generado tras un intento.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| plan_id | INT | No | PK | Identificador único. |
| attempt_id | UUID | No | FK → attempt | Referencia a attempt. |
| created_at | TIMESTAMP | No |  | Fecha de creación. |
| days | SMALLINT | No |  | Duración del plan en días. |
| is_completed | BOOLEAN | No |  | Si el estudiante lo terminó. |

## plan_card

Tarjetas que forman el plan, repartidas por día.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| plan_id | INT | No | PK / FK → reinforcement_plan | Referencia a reinforcement_plan. |
| card_id | INT | No | PK / FK → card | Referencia a card. |
| day | SMALLINT | No |  | Día del plan en que se repasa. |
| is_completed | BOOLEAN | No |  | Si ya se repasó. |

## badge

Catálogo de insignias.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| badge_id | INT | No | PK | Identificador único. |
| code | VARCHAR(30) | No |  | Código único. |
| name | VARCHAR(60) | No |  | Nombre. |
| description | VARCHAR(200) | No |  | Qué hay que lograr. |

## user_badge

Insignias obtenidas por cada estudiante.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| student_id | INT | No | PK / FK → app_user | Estudiante. |
| badge_id | INT | No | PK / FK → badge | Referencia a badge. |
| earned_at | TIMESTAMP | No |  | Fecha en que la obtuvo. |

## streak

Racha de días de estudio de cada estudiante (1:1 con usuario).

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| student_id | INT | No | PK / FK → app_user | Estudiante. |
| current_days | INT | No |  | Días seguidos actuales. |
| best_streak | INT | No |  | Mejor racha histórica. |
| last_activity_date | DATE | Sí |  | Último día con repaso. |
| freezes_available | SMALLINT | No |  | Días que puede congelar la racha. |
| last_freeze_date | DATE | Sí |  | Último día congelado. |

## notification

Avisos enviados a los usuarios.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| notification_id | INT | No | PK | Identificador único. |
| user_id | INT | No | FK → app_user | Referencia a app_user. |
| type | VARCHAR(20) | No |  | Tipo: review_due, new_assessment, assessment_closing, plan_reminder, grade_published, report_update, endorsement_update, leech_alert, membership_update o join_request (solicitud de ingreso por revisar). |
| title | VARCHAR(80) | No |  | Título del aviso. |
| body | VARCHAR(200) | No |  | Texto del aviso. |
| link | VARCHAR(120) | Sí |  | Pantalla de la aplicación a la que lleva. |
| created_at | TIMESTAMP | No |  | Fecha de envío. |
| read_at | TIMESTAMP | Sí |  | Fecha de lectura; nulo si no se ha leído. |

## sync_log

Registro de cada sincronización entre el teléfono y el servidor.

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| sync_id | INT | No | PK | Identificador único. |
| user_id | INT | No | FK → app_user | Referencia a app_user. |
| device | VARCHAR(60) | No |  | Dispositivo de origen. |
| occurred_at | TIMESTAMP | No |  | Momento de la sincronización. |
| records_sent | INT | No |  | Cambios enviados al servidor. |
| records_received | INT | No |  | Cambios recibidos. |
| conflicts | INT | No |  | Conflictos detectados y resueltos en la sincronización. |
| result | VARCHAR(10) | No |  | success (exitosa), partial (parcial) o failed (fallida). |

## audit_log

Bitácora de acciones sensibles (cambios de notas, reaperturas, ediciones y moderación).

| Campo | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| audit_id | BIGINT | No | PK | Identificador único. |
| user_id | INT | No | FK → app_user | Usuario que realizó la acción. |
| institution_id | INT | Sí | FK → institution | Institución donde ocurrió la acción; nula en acciones de la plataforma. |
| action | VARCHAR(30) | No |  | Acción realizada, p. ej. grade_changed o deck_hidden. |
| table_name | VARCHAR(40) | No |  | Tabla afectada. |
| record_id | VARCHAR(40) | No |  | Identificador del registro afectado. |
| old_value | TEXT | Sí |  | Valores anteriores en formato JSON. |
| new_value | TEXT | Sí |  | Valores nuevos en formato JSON. |
| occurred_at | TIMESTAMP | No |  | Momento de la acción. |

## Reglas implementadas con disparadores

- `tr_keep_one_institution_admin`: impide retirar o cambiar el rol del último administrador activo de una institución.
- `tr_check_section_capacity`: impide activar una inscripción cuando la sección ya alcanzó su cupo (`section.capacity`).
