# Casos de uso

Diagramas UML por actor en `diagramas_casos_de_uso/` (fuente PlantUML `.puml`).

## Actores

| Actor | Tipo | Descripción |
|---|---|---|
| Estudiante | Primario | Repasa, presenta el diagnóstico, el reto y las evaluaciones, crea mazos y consulta su progreso. |
| Profesor | Primario | Crea y asigna mazos y evaluaciones, avala mazos de estudiantes y consulta el rendimiento por tema. |
| Administrador | Primario | Tiene dos alcances. El administrador de la institución la registra, crea áreas, nombra administradores y gestiona lapsos, usuarios, solicitudes y moderación; el administrador de área solo gestiona las materias, unidades y secciones de su área. |
| Superadministrador de la plataforma | Secundario | Equipo de Memora. Solo suspende instituciones o bloquea cuentas por abuso, desde una herramienta interna fuera de la aplicación móvil; no participa en la gestión académica. |
| Planificador de repasos | Secundario | Proceso automático de la aplicación que calcula con FSRS el próximo repaso y propone el Reto de dominio. |

## Lista (37)

| ID | Caso de uso | Actores | Requerimientos |
|---|---|---|---|
| CU-01 | Iniciar sesión, registrarse y recuperar la contraseña | Todos | RF-01, RF-36, RF-56, RF-68 |
| CU-02 | Gestionar usuarios y membresías | Administrador | RF-02, RF-48, RF-50, RF-67 |
| CU-03 | Gestionar materias, unidades y secciones del área | Administrador | RF-03 |
| CU-04 | Unirse a una sección o salir de ella | Estudiante | RF-04, RF-35, RF-60, RF-63 |
| CU-05 | Crear mazo | Estudiante, Profesor | RF-05, RF-06 |
| CU-06 | Definir visibilidad del mazo | Estudiante | RF-07 |
| CU-07 | Avalar o rechazar mazo | Profesor | RF-08, RF-44 |
| CU-08 | Asignar mazo a una sección | Profesor | RF-09, RF-14 |
| CU-09 | Realizar evaluación diagnóstica | Estudiante | RF-10 |
| CU-10 | Repasar tarjetas | Estudiante, Planificador | RF-11 a RF-15, RF-52 |
| CU-11 | Realizar Reto de dominio | Estudiante, Planificador | RF-16, RF-17 |
| CU-12 | Crear evaluación | Profesor | RF-18, RF-40 |
| CU-13 | Presentar evaluación | Estudiante | RF-17, RF-19, RF-20, RF-27 |
| CU-14 | Consultar resultados, historial y plan de refuerzo | Estudiante | RF-20, RF-21, RF-27, RF-32, RF-33 |
| CU-15 | Consultar progreso y logros | Estudiante | RF-22 |
| CU-16 | Reportar error en una tarjeta | Estudiante | RF-15, RF-23 |
| CU-17 | Consultar rendimiento por tema | Profesor | RF-24 |
| CU-18 | Sincronizar datos | Estudiante, Profesor | RF-25 |
| CU-19 | Configurar perfil y preferencias | Estudiante | RF-26, RF-34, RF-37, RF-55, RF-56 |
| CU-20 | Practicar un mazo o una unidad | Estudiante | RF-28 |
| CU-21 | Explorar y agregar mazos | Estudiante | RF-29, RF-30 |
| CU-22 | Editar o eliminar mazo y tarjetas | Estudiante, Profesor | RF-31 |
| CU-23 | Consultar desempeño de un estudiante | Profesor | RF-38 |
| CU-24 | Consultar y exportar notas de una evaluación | Profesor | RF-39 |
| CU-25 | Gestionar evaluación publicada | Profesor | RF-41, RF-42 |
| CU-26 | Atender reportes y tarjetas problemáticas | Profesor, Estudiante (autor) | RF-43 |
| CU-27 | Gestionar la sección | Profesor | RF-45, RF-46, RF-65 |
| CU-28 | Gestionar lapsos académicos | Administrador | RF-47 |
| CU-29 | Moderar mazos públicos | Administrador | RF-49 |
| CU-30 | Recibir notificaciones | Estudiante, Profesor, Planificador | RF-51, RF-56, RF-66 |
| CU-31 | Consultar guía de inicio y ayuda | Estudiante, Profesor | RF-53 |
| CU-32 | Consultar bitácora | Administrador | RF-54 |
| CU-33 | Registrar una institución | Usuario (futuro administrador) | RF-57, RF-68 |
| CU-34 | Gestionar áreas y administradores | Administrador | RF-58, RF-61 |
| CU-35 | Unirse a una institución y cambiar de institución | Estudiante, Profesor | RF-59, RF-60, RF-67 |
| CU-36 | Suspender una institución | Superadministrador | RF-62 |
| CU-37 | Configurar el ingreso y atender solicitudes | Profesor, Administrador | RF-45, RF-48, RF-63 a RF-68 |

## Especificaciones detalladas

### CU-01. Iniciar sesión, registrarse y recuperar la contraseña

- **Actores:** Estudiante, Profesor o Administrador
- **Descripción:** La persona crea su cuenta verificando que el correo le pertenece, completa sus datos y llega al paso que corresponde a su rol; si ya tiene cuenta, inicia sesión o recupera la contraseña.
- **Precondiciones:** La persona instaló la aplicación.

**Flujo principal**

1. La persona toca Crear cuenta en la pantalla de ingreso.
2. Escribe su correo y una contraseña y elige Soy estudiante o Soy profesor.
3. Toca Continuar.
4. La aplicación envía un código de 6 dígitos al correo y muestra la pantalla Verifica tu correo.
5. La persona escribe el código.
6. La aplicación valida el código, marca el correo como verificado y busca ese correo en las listas de inscritos.
7. La aplicación muestra Completa tus datos, con los datos precargados si el correo estaba en una lista.
8. La persona revisa o escribe su cédula, nombres y apellidos y, si lo desea, su fecha de nacimiento y sexo, y toca Crear cuenta.
9. La aplicación activa las membresías e inscripciones de las listas donde estaba y muestra la guía de inicio.
10. Al terminar la guía, la aplicación lleva a la pantalla que corresponde según la elección guardada en el teléfono: al estudiante a Unirse a una sección y al profesor a Mis instituciones, salvo que ya tenga una membresía activa.

**Flujos alternos y excepciones**

- 1a. Si ya tiene cuenta, escribe correo y contraseña en Iniciar sesión y la aplicación abre su inicio.
- 1b. Si olvidó la contraseña, toca ¿Olvidaste tu contraseña?, recibe un código en su correo y define una nueva.
- 1c. Si la persona tocó Registrar mi institución, sigue los mismos pasos 2 a 8 y al terminar pasa a registrar la institución (CU-33).
- 3a. Si el correo pertenece a una cuenta que aún no se verificó, incluida una cuenta precargada por CSV, repetir el paso 1 reemplaza la contraseña y envía un código nuevo; nadie toma la cuenta hasta escribir el código que llega a ese correo.
- 3b. Las cuentas creadas en el paso 1 que no se verifican en 7 días se eliminan; las precargadas por CSV se conservan.
- 5a. Si el código es incorrecto, la aplicación lo indica; tras cinco intentos o 15 minutos debe pedir uno nuevo.
- 6a. Si el correo ya pertenece a una cuenta activa, la aplicación ofrece iniciar sesión o recuperar la contraseña.
- 8a. Si la cédula está en una lista de inscritos pero con otro correo, la aplicación no muestra esos datos y la solicitud queda por confirmar para el responsable.
- 8b. Si la cédula ya pertenece a otra cuenta, la aplicación no permite continuar y sugiere recuperar la contraseña.

- **Postcondiciones:** La cuenta existe, el correo está verificado y la persona tiene, si correspondía, sus membresías activas.
- **Requerimientos:** RF-01, RF-36, RF-56, RF-68
- **Tablas:** app_user, email_code, membership, enrollment

### CU-05. Crear mazo

- **Actores:** Estudiante o Profesor
- **Descripción:** El usuario crea un mazo de una materia, le agrega tarjetas escribiéndolas o importándolas y define su visibilidad.
- **Precondiciones:** El usuario inició sesión. La materia existe.

**Flujo principal**

1. El usuario toca Subir mazo.
2. La aplicación muestra el formulario de la pantalla Subir mazo, con los campos nombre, materia y forma de agregar tarjetas.
3. El usuario escribe el nombre y elige la materia.
4. El usuario agrega las tarjetas indicando el tipo, el anverso, el reverso y, cuando corresponde, las opciones y la unidad.
5. El usuario selecciona la visibilidad del mazo entre solo yo, mi sección o toda la institución.
6. El usuario toca Publicar mazo.
7. La aplicación valida los datos, envía el mazo al servidor, que le asigna sus identificadores, y crea el estado Nueva de cada tarjeta para el autor.

**Flujos alternos y excepciones**

- 4a. El usuario elige importar desde un archivo CSV; la aplicación muestra una vista previa, marca las filas con errores y agrega las válidas.
- 5a. Si el autor es estudiante y elige mi sección, el mazo queda pendiente de aval en el panel del profesor.
- 7a. Si falta el nombre o no hay tarjetas, la aplicación indica qué falta y no publica.
- 7b. Si no hay conexión, el mazo queda como borrador en el teléfono y se publica automáticamente al reconectar.

- **Postcondiciones:** El mazo y sus tarjetas quedan publicados en el servidor, o como borrador en el teléfono si no había conexión.
- **Requerimientos:** RF-05, RF-06
- **Tablas:** deck, card, card_option, card_state

### CU-09. Realizar evaluación diagnóstica

- **Actores:** Estudiante
- **Descripción:** Al empezar un mazo nuevo, el estudiante responde preguntas para que lo que ya sabe no se repase desde cero.
- **Precondiciones:** El estudiante tiene asignado o eligió un mazo que nunca ha estudiado.

**Flujo principal**

1. El estudiante abre el mazo por primera vez.
2. La aplicación muestra Antes de empezar, ¿qué ya sabes? con una pregunta de opción múltiple por tarjeta de una muestra.
3. El estudiante responde o toca No lo sé todavía.
4. La aplicación registra cada respuesta con su tiempo.
5. Al terminar, la aplicación marca las tarjetas acertadas como En repaso con una estabilidad inicial y deja las demás como Nuevas.
6. La aplicación muestra cuántas tarjetas ya domina y cuántas empezará a aprender.

**Flujos alternos y excepciones**

- 3a. Si el estudiante sale antes de terminar, las respuestas dadas se guardan y el resto queda como Nuevas.

- **Postcondiciones:** Existe un intento de tipo diagnóstica y el estado de cada tarjeta refleja lo que el estudiante ya sabe.
- **Requerimientos:** RF-10
- **Tablas:** assessment, question, attempt, answer, review_log, card_state

### CU-10. Repasar tarjetas

- **Actores:** Estudiante; Planificador de repasos (secundario)
- **Descripción:** El estudiante repasa la cola del día; cada respuesta actualiza la memoria de la tarjeta con FSRS.
- **Precondiciones:** El estudiante tiene tarjetas con fecha de repaso vencida o tarjetas nuevas.

**Flujo principal**

1. El estudiante toca Repaso de hoy en Inicio.
2. El Planificador arma la cola del día. Ubica primero las tarjetas con menor probabilidad de recordarse y luego las nuevas, hasta el límite diario, intercalando materias.
3. La aplicación muestra el anverso y empieza a medir el tiempo sin mostrar un cronómetro.
4. El estudiante voltea la tarjeta y ve la respuesta, su tiempo y su promedio.
5. El estudiante elige Otra vez, Difícil, Bien o Fácil; cada botón muestra el próximo intervalo.
6. Si tardó mucho más que su promedio con esa tarjeta, la aplicación aplica Difícil en lugar de Bien.
7. El Planificador calcula con FSRS la nueva estabilidad, dificultad y fecha del próximo repaso, y registra el repaso.
8. Se repiten los pasos 3 a 7 hasta vaciar la cola. La aplicación muestra el resumen del día y actualiza la racha.

**Flujos alternos y excepciones**

- 5a. Si elige Otra vez, la tarjeta vuelve a Aprendiendo y reaparece en la misma sesión; si suma 8 fallos se marca problemática y se avisa al autor (RF-15).
- 2a. Si existe fecha de examen, la meta de retención sube y los intervalos se acortan (modo examen).
- *a. Si no hay conexión, los datos se guardan en el teléfono y se sincroniza después (CU-18).
- 4a. El estudiante toca ¿Por qué veo esta tarjeta? y la aplicación muestra la fecha del último repaso, la probabilidad estimada de recordarla y el motivo de su prioridad (RF-52).

- **Postcondiciones:** Cada tarjeta repasada tiene nueva estabilidad, dificultad y fecha de próximo repaso; el historial tiene una fila por respuesta.
- **Requerimientos:** RF-11 a RF-15, RF-52
- **Tablas:** card_state, review_log, card, streak

### CU-11. Realizar Reto de dominio

- **Actores:** Estudiante; Planificador de repasos (secundario, inicia)
- **Descripción:** Un reto corto y cronometrado comprueba si las tarjetas que el algoritmo cree dominadas se recuerdan rápido.
- **Precondiciones:** El estudiante tiene tarjetas en estado Dominada o con estabilidad alta. El Planificador decidió proponer el reto (de vez en cuando o antes de una evaluación).

**Flujo principal**

1. La aplicación muestra la tarjeta del Reto de dominio en Inicio.
2. El estudiante toca Empezar reto.
3. La aplicación muestra el anillo de cuenta regresiva (unos 2 minutos) y una pregunta con 4 opciones.
4. El estudiante toca una opción antes de que se acabe el tiempo de la pregunta.
5. La aplicación registra la opción y el tiempo.
6. Si acierta a tiempo, la tarjeta se confirma como dominada y su próximo repaso se aleja; si falla, baja a En repaso.
7. Se repiten los pasos 3 a 6 con cada tarjeta del reto.
8. La aplicación muestra cuántas se confirmaron y cuántas vuelven a repaso.

**Flujos alternos y excepciones**

- 4a. Si se agota el tiempo de la pregunta, se registra como fallo y la tarjeta baja de estado.
- 4b. Pausar o pedir más tiempo (extend). El cronómetro se detiene o suma tiempo según el factor de tiempo del perfil; queda registrado.

- **Postcondiciones:** Existe un reto con el resultado de cada tarjeta y el estado de cada una se confirmó o bajó.
- **Requerimientos:** RF-16, RF-17
- **Tablas:** challenge, challenge_card, card_option, review_log, card_state

### CU-12. Crear evaluación

- **Actores:** Profesor
- **Descripción:** El profesor crea una evaluación para una sección sobre un mazo y decide qué pasa con los resultados.
- **Precondiciones:** El profesor inició sesión, tiene la sección y el mazo asignado.

**Flujo principal**

1. El profesor toca Nueva evaluación en el Panel docente.
2. La aplicación muestra el formulario Crear evaluación.
3. El profesor elige el mazo, el número de preguntas y el dominio mínimo (por ejemplo, 80 %).
4. El profesor configura el tiempo total y el tiempo por pregunta del cronómetro.
5. El profesor selecciona los efectos de los resultados, que pueden ser actualizar el estado de las tarjetas, generar un plan de refuerzo, habilitar una segunda oportunidad y mostrar la nota.
6. El profesor fija la fecha de apertura y de cierre y toca Revisar preguntas.
7. La aplicación toma tarjetas del mazo y crea una pregunta enlazada a cada una; la evaluación queda como borrador.
8. El profesor revisa las preguntas y puede editar un enunciado, cambiar el orden o quitar una pregunta.
9. El profesor toca Publicar y la aplicación notifica a los estudiantes de la sección.

**Flujos alternos y excepciones**

- 3a. Si el mazo tiene menos tarjetas que las preguntas solicitadas, la aplicación avisa y ajusta el número.
- 6a. Si la fecha de cierre es anterior a la de apertura, la aplicación lo indica y no continúa.
- 8a. Si el profesor sale sin publicar, la evaluación se conserva como borrador.

- **Postcondiciones:** La evaluación queda publicada con sus preguntas y la sección recibe una notificación.
- **Requerimientos:** RF-18, RF-40
- **Tablas:** assessment, question, card, notification

### CU-13. Presentar evaluación

- **Actores:** Estudiante
- **Descripción:** El estudiante presenta la evaluación; sus respuestas cambian el estado de las tarjetas y, si no alcanza el dominio, recibe refuerzo y segunda oportunidad.
- **Precondiciones:** La evaluación está abierta y el estudiante pertenece a la sección.

**Flujo principal**

1. El estudiante abre la evaluación en Evaluar.
2. La aplicación muestra el tiempo disponible (ajustado a su factor de tiempo) y la primera pregunta.
3. El estudiante responde cada pregunta dentro del tiempo.
4. Al terminar, la aplicación calcula el porcentaje de dominio.
5. Por cada pregunta, la tarjeta enlazada se refuerza si acertó o vuelve a Aprendiendo si falló.
6. Si no alcanza el dominio mínimo, la aplicación genera un plan de refuerzo de varios días con las tarjetas falladas.
7. La aplicación muestra la pantalla Resultados con la meta, el resultado obtenido y los pasos siguientes (CU-14).

**Flujos alternos y excepciones**

- 3a. Pausar o pedir más tiempo (extend). Se registra el tiempo extra.
- 6a. Segunda oportunidad (extend). Al completar el plan de refuerzo se habilita el intento 2.
- 3b. Si se pierde la conexión, las respuestas se guardan en el teléfono y se envían al reconectar.

- **Postcondiciones:** Existe un intento con sus respuestas; los estados de las tarjetas y, si aplica, el plan de refuerzo quedan actualizados.
- **Requerimientos:** RF-17, RF-19, RF-20, RF-27
- **Tablas:** attempt, answer, review_log, card_state, reinforcement_plan, plan_card

### CU-23. Consultar desempeño de un estudiante

- **Actores:** Profesor
- **Descripción:** El profesor revisa el avance de un estudiante de su sección para decidir si necesita apoyo.
- **Precondiciones:** El profesor inició sesión y el estudiante está inscrito en una de sus secciones.

**Flujo principal**

1. El profesor abre Mi sección desde el Panel docente.
2. La aplicación muestra la lista de inscritos con su dominio general y marca a quienes necesitan atención: dominio por debajo del mínimo, varios días sin repasar o un plan de refuerzo sin completar.
3. El profesor toca el nombre del estudiante.
4. La aplicación muestra su dominio por unidad, sus evaluaciones con la nota y el número de intento, las tarjetas que más falla, el avance de su plan de refuerzo y su constancia (racha y último día de repaso).
5. El profesor puede conceder tiempo extra en una evaluación o desbloquear una unidad desde esta pantalla.

**Flujos alternos y excepciones**

- 2a. Si el estudiante no ha repasado nunca, la aplicación lo indica y no muestra porcentajes.
- 5a. Toda concesión pide una justificación y queda registrada en la bitácora.

- **Postcondiciones:** El profesor conoce la situación del estudiante; si concedió una excepción, esta queda guardada y notificada.
- **Requerimientos:** RF-38
- **Tablas:** enrollment, card_state, attempt, review_log, reinforcement_plan, streak, assessment_exception, unit_unlock

### CU-24. Consultar y exportar notas de una evaluación

- **Actores:** Profesor
- **Descripción:** El profesor consulta los resultados de una evaluación y los exporta para su registro de notas.
- **Precondiciones:** La evaluación está publicada o cerrada.

**Flujo principal**

1. El profesor abre la evaluación desde el Panel docente.
2. La aplicación muestra el resumen: estudiantes que la presentaron, pendientes y porcentaje que alcanzó el dominio mínimo.
3. La aplicación lista a cada estudiante con su nota, su porcentaje de dominio y el intento que cuenta.
4. El profesor toca Exportar.
5. La aplicación genera un archivo CSV con la cédula, el nombre, la nota, el dominio y el intento de cada estudiante.

**Flujos alternos y excepciones**

- 3a. Si un intento se presentó sin conexión y llegó después del cierre, se marca y se acepta solo si comenzó antes del cierre (RNF-11).
- 3b. El profesor puede cerrar o reabrir la evaluación desde esta pantalla (CU-25).

- **Postcondiciones:** El profesor tiene el archivo de notas; la consulta no modifica datos.
- **Requerimientos:** RF-39
- **Tablas:** assessment, attempt, answer, enrollment, app_user

### CU-33. Registrar una institución

- **Actores:** Usuario que será el primer administrador
- **Descripción:** Una persona registra su universidad, instituto o curso en Memora sin intervención del equipo de soporte y queda como su administrador.
- **Precondiciones:** La persona tiene una cuenta con el correo verificado o la crea en este momento siguiendo el registro (CU-01).

**Flujo principal**

1. El usuario toca Registrar mi institución en la pantalla de ingreso o en Mis instituciones.
2. La aplicación muestra el formulario con nombre y tipo (universidad, instituto o curso) y el correo verificado de la cuenta como contacto.
3. El usuario completa los datos y toca Registrar institución.
4. La aplicación crea la institución, genera su código de 8 caracteres y registra al usuario como administrador de la institución.
5. La aplicación muestra el panel de la institución con los pasos siguientes: crear áreas, cargar usuarios o compartir el código.

**Flujos alternos y excepciones**

- 1a. Si la persona no tiene cuenta, primero completa el registro con verificación del correo (CU-01).
- 4a. Si ya existe una institución con el mismo nombre, la aplicación lo advierte y pide confirmar que se trata de otra.

- **Postcondiciones:** La institución existe, está activa y tiene un administrador.
- **Requerimientos:** RF-57, RF-68
- **Tablas:** institution, membership, app_user

### CU-34. Gestionar áreas y administradores

- **Actores:** Administrador de la institución
- **Descripción:** El administrador organiza la institución en áreas y decide quién la administra, completa o por área.
- **Precondiciones:** El usuario es administrador activo de la institución.

**Flujo principal**

1. El administrador abre Áreas y administradores.
2. La aplicación muestra el código de la institución, sus áreas con su administrador y los administradores de la institución.
3. El administrador toca Nueva área, escribe el nombre (por ejemplo Odontología) y guarda.
4. El administrador abre el área y toca Asignar administrador.
5. La aplicación muestra los miembros activos de la institución.
6. El administrador elige a una persona.
7. La aplicación crea la membresía de administrador de área, avisa a la persona y registra la acción en la bitácora.

**Flujos alternos y excepciones**

- 3a. Si ya existe un área con ese nombre en la institución, la aplicación lo indica y no la crea.
- 6a. El administrador puede nombrar a la persona administradora de toda la institución en lugar de un área.
- 7a. Si el administrador intenta quitarse el rol siendo el último administrador activo, la aplicación lo impide y le pide nombrar a otro primero.

- **Postcondiciones:** El área existe y tiene, si se asignó, un administrador con acceso solo a ella.
- **Requerimientos:** RF-58, RF-61
- **Tablas:** area, membership, notification, audit_log

### CU-35. Unirse a una institución y cambiar de institución

- **Actores:** Estudiante o Profesor
- **Descripción:** El usuario se une a una institución con su código y elige cuál es la institución activa cuando pertenece a varias.
- **Precondiciones:** El usuario inició sesión y verificó su correo.

**Flujo principal**

1. El usuario abre Mis instituciones desde el perfil, o llega a ella al terminar el registro si eligió ser profesor.
2. La aplicación muestra sus instituciones con su rol en cada una y la institución activa.
3. El usuario toca Unirme a otra institución y escribe el código de 8 caracteres, abre el enlace o escanea el QR.
4. La aplicación muestra el nombre y el tipo de la institución.
5. El usuario confirma.
6. La aplicación crea la membresía según el modo de ingreso y el rol: activa si corresponde o por confirmar en caso contrario, y avisa a los administradores si hay que revisarla.
7. El usuario toca una institución de la lista para hacerla activa.
8. La aplicación muestra las secciones, mazos y evaluaciones de esa institución; el repaso del día sigue reuniendo las tarjetas de todas.

**Flujos alternos y excepciones**

- 3a. Si el código no existe, venció o la institución está suspendida, la aplicación lo indica.
- 6a. Si el usuario se une como profesor, la membresía queda por confirmar aunque el modo sea abierto, salvo que figure como profesor en la lista de inscritos.
- 6b. Si ya pertenece a la institución con ese rol, la aplicación lo indica y no crea otra membresía.

- **Postcondiciones:** El usuario pertenece a la institución con el estado que corresponde y puede cambiar entre sus instituciones.
- **Requerimientos:** RF-59, RF-60, RF-67
- **Tablas:** membership, institution, notification

### CU-36. Suspender una institución

- **Actores:** Superadministrador de la plataforma
- **Descripción:** El equipo de Memora suspende una institución que hace un uso abusivo de la plataforma. Lo hace desde una herramienta interna del servidor, fuera de la aplicación móvil, y sin acceder a los datos académicos.
- **Precondiciones:** Llegó una denuncia de abuso al correo de soporte (soporte@memora.app) o la detectó el equipo.

**Flujo principal**

1. El superadministrador recibe la denuncia por correo.
2. Consulta en la herramienta interna los datos generales de la institución: nombre, tipo, fecha de registro, número de miembros y administradores.
3. Decide si la denuncia procede.
4. Cambia el estado de la institución a suspendida e indica el motivo.
5. La plataforma deja la institución en solo lectura para sus miembros, avisa a sus administradores y registra la acción en la bitácora.

**Flujos alternos y excepciones**

- 3a. Si la denuncia no procede, responde al denunciante y la institución sigue activa.
- 4a. Más tarde puede reactivar la institución con el mismo procedimiento.
- 4b. Si el abuso es de una persona y no de la institución, bloquea su cuenta (is_active) en lugar de suspender la institución.

- **Postcondiciones:** La institución queda suspendida y la decisión queda registrada.
- **Requerimientos:** RF-62
- **Tablas:** institution, app_user, notification, audit_log

### CU-37. Configurar el ingreso y atender solicitudes

- **Actores:** Profesor (en su sección) o Administrador (en la institución o su área)
- **Descripción:** El responsable decide cómo entran las personas a la sección o a la institución, comparte el código como texto, enlace o QR y aprueba o rechaza a quienes quedaron por confirmar.
- **Precondiciones:** El usuario es profesor de la sección o administrador de la institución o del área.

**Flujo principal**

1. El profesor abre Invitar a la sección desde Mi sección.
2. La aplicación muestra el código SK3A26, el enlace de invitación, el código QR, el modo de ingreso, el cupo y la fecha de vencimiento.
3. El profesor elige el modo Solo inscritos y carga la lista de inscritos desde un archivo CSV.
4. La aplicación valida el archivo y marca a cada persona de la lista como invitada.
5. El profesor comparte el QR en clase o envía el enlace por mensaje.
6. Los estudiantes de la lista que usan el código quedan inscritos de inmediato; los que no están en la lista quedan en Por confirmar y la aplicación avisa al profesor.
7. El profesor abre Solicitudes de ingreso, revisa la marca En la lista o No está en la lista y toca Aprobar o Rechazar en cada fila o en bloque.
8. La aplicación actualiza las inscripciones, avisa a cada solicitante y registra la acción en la bitácora.

**Flujos alternos y excepciones**

- 3a. Si elige Abierto, todo el que use el código entra directo; si elige Con aprobación, todos quedan por confirmar.
- 5a. Si el código se filtró, el profesor toca Generar código nuevo; el código, el enlace y el QR anteriores dejan de funcionar.
- 6a. Si la sección llegó a su cupo o el código venció, la aplicación informa al estudiante que no se aceptan más ingresos.
- 6b. Si quien usa el código de la institución se une como profesor, queda por confirmar aunque el modo sea abierto, salvo que figure como profesor en la lista de inscritos.
- 7a. Si hay muchas solicitudes, el profesor usa Aprobar los de la lista o Rechazar los demás.

- **Postcondiciones:** Solo quedan activas las personas autorizadas y cada decisión queda registrada.
- **Requerimientos:** RF-45, RF-48, RF-63 a RF-68
- **Tablas:** section, institution, enrollment, membership, notification, audit_log
