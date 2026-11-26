# Memora · producto

**Título del proyecto:** Plataforma Digital de Repetición Espaciada y Tarjetas de Memoria Inteligentes
para la Optimización del Aprendizaje Activo nivel universitario.

**Tipo de software educativo:** programa de ejercitación y práctica (metodología de Pere Marquès;
desarrollo con Scrum).

**Problema:** los estudiantes no tienen una herramienta que les indique qué repasar y cuándo, que
verifique su dominio real y cuyos resultados tengan efecto en su aprendizaje; los docentes no saben qué
contenidos se están olvidando.

## Roles

Los roles se guardan por institución en la tabla `membership`: una misma cuenta puede ser estudiante en una
institución y profesora o administradora en otra.

| Rol | Qué hace |
|---|---|
| Administrador de la institución | Registra la institución (queda como primer administrador), crea áreas, nombra administradores de área, define el modo de ingreso, carga la lista de inscritos (CSV), atiende solicitudes, modera mazos públicos y consulta la bitácora. Una institución nunca se queda sin administrador |
| Administrador de área | Solo las materias, unidades y secciones de su área (facultad, escuela o programa), incluido asignar el profesor de cada sección. No gestiona lapsos, usuarios, solicitudes de ingreso a la institución ni moderación. Arranca en Gestión académica (35) |
| Profesor | Trabaja en las secciones que tiene asignadas: invita con código, enlace o QR, elige el modo de ingreso, aprueba solicitudes, crea y asigna mazos, avala mazos de estudiantes, crea evaluaciones, ve notas y el desempeño de cada estudiante, atiende reportes, concede tiempo extra o desbloquea unidades |
| Estudiante | Se une a secciones (código, enlace o QR), repasa, presenta diagnóstico, Reto de dominio y evaluaciones, crea y comparte mazos, consulta su progreso |
| Superadministrador de la plataforma | Equipo de Memora (`app_user.is_platform_admin`): suspende instituciones (`institution.status`) o bloquea cuentas (`app_user.is_active`) por abuso desde una herramienta interna del servidor, no desde la app; no ve datos académicos. Las denuncias llegan a soporte@memora.app |
| Planificador de repasos | Proceso automático: calcula con FSRS el próximo repaso, arma la cola del día, propone el Reto y envía recordatorios |

Varias instituciones (universidades, institutos o cursos) usan Memora a la vez con sus datos separados. Un
estudiante puede estar en varias secciones e instituciones y su repaso del día mezcla todas sus materias.

## Registro

Requiere conexión. Usa el mismo envío de códigos por correo (tabla `email_code`) que la recuperación de contraseña
y el registro de una institución.

1. **Paso 1 · Ingreso:** correo, contraseña y "Soy estudiante" o "Soy profesor". Esta elección **no se guarda ni crea
   una membresía**: solo decide la pantalla siguiente. Se crea el `app_user` sin verificar o, si el correo ya existe
   como cuenta precargada por CSV (`password_hash` nulo), se reclama esa cuenta en lugar de crear otra.
2. **Paso 2 · Verifica tu correo:** código de 6 dígitos (`email_code.purpose = 'verify_email'`), vence a los 15
   minutos y se anula tras 5 intentos fallidos. Al acertar se llena `app_user.email_verified_at`.
3. **Paso 3 · Completa tus datos:** cédula, nombres y apellidos (fecha de nacimiento y sexo opcionales).
   - Si el **correo verificado** está en una lista de inscritos, los datos aparecen precargados y las membresías e
     inscripciones `invited` pasan a `active`: entra directo, sin código.
   - Si solo coincide la **cédula** (otro correo), no se muestran esos datos: la solicitud queda `pending` y el
     responsable la ve marcada "Cédula en la lista".
   - Si la cédula ya pertenece a otra cuenta verificada, no se permite continuar (se sugiere recuperar la contraseña).
4. **Siguiente pantalla:** guía de inicio y luego, si no tiene ninguna membresía activa, la pantalla que
   corresponde a la elección del paso 1, que se guarda **solo en el teléfono** (`expo-secure-store`) hasta tener
   una membresía: estudiante → Unirse a una sección (5); profesor → Mis instituciones (22). Si la verificación se
   completa en otro teléfono y no hay elección guardada, se usa Unirse a una sección con un enlace visible a Mis
   instituciones. Quien tocó "Registrar mi institución" en el paso 1 hace los pasos 1 a 3 y luego va a Registrar mi
   institución (33), donde queda como `institution_admin`.
5. **Correo sin verificar:** mientras no se verifique, repetir el paso 1 con ese correo reemplaza la contraseña y
   envía un código nuevo (sirve también para reclamar una cuenta precargada). Las cuentas del paso 1 sin verificar
   se eliminan a los 7 días; las precargadas por CSV se conservan.

Reglas de rol al usar un código:

- `student`: entra según el modo de ingreso (`open`, `approval`, `roster`).
- `teacher`: **siempre** queda `pending` hasta que un administrador lo confirme, salvo que figure como profesor en la
  lista de inscritos. El modo abierto no aplica a profesores.
- `area_admin` e `institution_admin`: solo los asigna otro administrador.

## Ingreso a secciones e instituciones

El código, el enlace (`memora.app/u/SK3A26`) y el QR son la misma llave; regenerar el código invalida los tres.
Lo que impide que entren desconocidos es el **modo de ingreso** de cada sección (`section.join_mode`) y de cada
institución (`institution.join_mode`):

| Modo | Qué pasa al usar el código | Uso típico |
|---|---|---|
| `open` (abierto) | Entra directo | Curso pequeño o academia |
| `approval` (con aprobación) | Queda en Por confirmar | Institución sin lista previa |
| `roster` (solo inscritos) | Si su **correo verificado** está en la lista de inscritos (`status = 'invited'`), entra directo; si no (o si solo coincide la cédula), queda en Por confirmar | Sección universitaria (valor por defecto) |

- Las solicitudes de una sección las atiende su profesor; las de la institución, su administrador (no el de área).
  Se pueden aprobar o rechazar una a una o en bloque ("Aprobar los de la lista", "Rechazar los demás").
- El código puede vencer (`code_expires_at`) y la sección puede tener cupo (`capacity`, controlado por disparador).
- Al entrar a una sección aprobada, el estudiante queda también como estudiante de la institución.
- Seguridad: los códigos no usan 0/O ni 1/I y se bloquea temporalmente a quien falla cinco intentos seguidos.

## Funciones principales

- **Repaso espaciado (FSRS)** con cola diaria ordenada por riesgo de olvido e intercalado de materias.
- **Corrección por tiempo:** si marca Bien pero tarda mucho más que su promedio, se aplica Difícil.
- **Reto de dominio:** cronómetro de unos 2 minutos con preguntas de 4 opciones sobre tarjetas que se
  creen dominadas; confirma o baja su estado.
- **Evaluación diagnóstica** al empezar un mazo.
- **Evaluación del profesor con consecuencias:** cada pregunta enlazada a una tarjeta, dominio mínimo,
  plan de refuerzo y segunda oportunidad; la nota se muestra solo si el profesor lo decide.
- **Modo examen:** con fecha de examen (del profesor o personal), sube la retención objetivo y acorta los
  intervalos.
- **Progreso:** dominio general, estado de cada tarjeta, insignias, racha congelable.
- **Mazos vivos:** se reportan errores y al corregir una tarjeta se actualiza para todos sin perder progreso.
- **Notificaciones** con el género gramatical adaptado al usuario (dato opcional), **guía de inicio**, explicación de "¿por qué veo esta tarjeta hoy?".
- **Sin conexión** con sincronización posterior.

## Retirar a un miembro y bloquear una cuenta

- El administrador de la institución **retira la membresía** (`membership.status = 'removed'`) y puede
  reincorporarla. Esto respeta el disparador del último administrador y no afecta otras instituciones.
- `app_user.is_active = false` bloquea la cuenta en toda la plataforma y **solo lo usa el equipo de Memora**.

## Lista de inscritos por CSV

- El **administrador de la institución** puede cargar estudiantes y profesores (columna `rol`).
- El **profesor**, desde Invitar a la sección, solo carga estudiantes de esa sección: la columna `rol` se ignora.
- Formato y reglas en `06_importacion_csv.md`.
