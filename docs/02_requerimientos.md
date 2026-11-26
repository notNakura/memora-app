# Requerimientos

Prioridad MoSCoW: Must (imprescindible), Should (importante), Could (deseable). Las fuentes F-xx están en `fuentes.md`.

## Funcionales (68)

| ID | Requerimiento | Fuente | Prioridad | Casos de uso | Tablas |
|---|---|---|---|---|---|
| RF-01 | Registrar usuarios en tres pasos: primero el acceso (correo, contraseña y si será estudiante o profesor), luego la verificación del correo con un código y por último los datos personales (cédula, nombres y apellidos), e iniciar sesión. La elección de estudiante o profesor no crea una membresía: se guarda solo en el teléfono y decide el paso siguiente, que es unirse a una sección (estudiante) o a una institución (profesor). Si un administrador o un profesor ya cargó al usuario por CSV con ese mismo correo, sus datos aparecen precargados y su membresía queda activa al completar el registro, sin necesidad de código de ingreso. | F-13, F-17 | Must | CU-01 | app_user, email_code, membership, enrollment |
| RF-02 | El administrador de la institución gestiona las membresías de su institución: cambia roles, retira o reincorpora miembros. No desactiva cuentas, porque una cuenta puede pertenecer a otras instituciones. | F-17 | Should | CU-02 | membership |
| RF-03 | El administrador de la institución o del área gestiona las materias, unidades y secciones de su área y asigna el profesor de cada sección. El administrador de área no gestiona lapsos, usuarios ni solicitudes de ingreso a la institución. | F-10, F-17 | Must | CU-03 | subject, unit, section, area |
| RF-04 | El estudiante se une a una sección con su código de 6 caracteres, con un enlace de invitación o escaneando un código QR; los tres llevan al mismo código. Según el modo de ingreso de la sección, entra directo o queda por confirmar. | F-13 | Must | CU-04 | section, enrollment |
| RF-05 | Crear mazos y tarjetas de cuatro tipos: pregunta y respuesta, completar, imagen con zonas tapadas y ordenar pasos. Publicar un mazo requiere conexión; sin conexión se guarda como borrador en el teléfono. | F-02, F-03, F-12 | Must | CU-05 | deck, card, card_option |
| RF-06 | Importar tarjetas desde un archivo CSV. | F-12, F-13 | Could | CU-05 | card, card_option |
| RF-07 | Definir la visibilidad del mazo como privada, de sección o de toda la institución. | F-13, F-17 | Should | CU-06 | deck |
| RF-08 | El profesor avala los mazos de estudiantes de su sección. | F-17 | Should | CU-07 | deck_endorsement |
| RF-09 | El profesor asigna mazos a sus secciones e indica la fecha del examen. | F-04, F-13 | Must | CU-08 | deck_assignment |
| RF-10 | Aplicar una evaluación diagnóstica al empezar un mazo; lo que el estudiante ya sabe no se repasa desde cero. | F-07, F-10 | Should | CU-09 | assessment, question, attempt, answer, card_state |
| RF-11 | Programar el próximo repaso de cada tarjeta por estudiante con FSRS y parámetros por defecto. | F-01, F-02, F-09 | Must | CU-10 | card_state, review_log |
| RF-12 | Registrar el tiempo de respuesta y corregir la autoevaluación cuando el estudiante tarda mucho más que su promedio. | F-06, F-15 | Must | CU-10 | review_log, card_state |
| RF-13 | Armar la cola del día ordenada por riesgo de olvido, mezclando materias y unidades, con límite diario de tarjetas nuevas. | F-05, F-09 | Must | CU-10 | card_state, card, unit |
| RF-14 | Ajustar la meta de retención y los intervalos de repaso según la fecha del examen (modo examen). | F-04, F-09 | Should | CU-08, CU-10 | deck_assignment, app_user |
| RF-15 | Marcar tarjetas problemáticas (8 fallos o más) y avisar al autor del mazo. | F-12 | Could | CU-10, CU-16 | card_state, error_report |
| RF-16 | Proponer el Reto de dominio sobre las tarjetas consideradas dominadas, con cronómetro y preguntas de cuatro opciones, y confirmar o reducir el estado de cada tarjeta según el resultado. | F-06, F-15 | Must | CU-11 | challenge, challenge_card, card_option, review_log, card_state |
| RF-17 | Permitir pausar o pedir más tiempo en el reto y en las evaluaciones. | F-11 | Must | CU-11, CU-13 | challenge, attempt, app_user |
| RF-18 | El profesor crea evaluaciones con dominio mínimo, cronómetro (tiempo total y por pregunta) y reglas sobre qué pasa con los resultados. | F-07, F-15 | Must | CU-12 | assessment, question |
| RF-19 | Presentar evaluaciones; cada respuesta refuerza su tarjeta o la devuelve a Aprendiendo. | F-03, F-15 | Must | CU-13 | attempt, answer, review_log, card_state |
| RF-20 | Generar un plan de refuerzo con los temas fallados y dar una segunda oportunidad si no se alcanza el dominio mínimo. | F-07 | Must | CU-13, CU-14 | reinforcement_plan, plan_card, attempt |
| RF-21 | Mostrar resultados con la meta, el resultado y qué sigue; la nota solo si el profesor lo decide. | F-08 | Must | CU-14 | attempt, answer, reinforcement_plan, assessment |
| RF-22 | Mostrar el progreso del estudiante, que incluye el dominio general, el estado de cada tarjeta, las insignias y la racha, la cual puede congelarse. | F-08, F-14 | Should | CU-15 | card_state, badge, user_badge, streak |
| RF-23 | Reportar errores en una tarjeta; al corregirla se actualiza para todos sin perder el progreso. | F-13, F-17 | Should | CU-16 | error_report, card |
| RF-24 | El profesor consulta el dominio promedio por tema de su sección. | F-08, F-15 | Must | CU-17 | card_state, answer, unit, enrollment |
| RF-25 | Funcionar sin conexión y sincronizar los cambios al recuperar la conexión. | F-16 | Must | CU-18 | sync_log, review_log (y pending_change en SQLite) |
| RF-26 | Configurar en el perfil el tiempo extendido y la meta de retención. | F-09, F-11 | Should | CU-19 | app_user |
| RF-27 | Listar en la sección Evaluar las evaluaciones pendientes, en curso y presentadas, con su fecha de cierre. | F-15, F-17 | Must | CU-13, CU-14 | assessment, attempt |
| RF-28 | Permitir la práctica libre de un mazo o una unidad sin modificar la programación de repasos. | F-12, F-17 | Should | CU-20 | review_log, card |
| RF-29 | Mostrar el detalle de un mazo, con sus unidades y tarjetas, y permitir agregarlo para estudiar o copiarlo. | F-12, F-13 | Should | CU-21 | deck, deck_subscription, card |
| RF-30 | Permitir al estudiante fijar una fecha de examen personal en los mazos que estudia. | F-04 | Should | CU-21 | deck_subscription |
| RF-31 | Editar y eliminar mazos y tarjetas propios sin perder el progreso de quienes los estudian. | F-12, F-17 | Must | CU-22 | deck, card, card_option, audit_log |
| RF-32 | Mostrar el avance diario del plan de refuerzo. | F-07, F-08 | Should | CU-14 | reinforcement_plan, plan_card |
| RF-33 | Mostrar el historial de evaluaciones del estudiante con sus resultados. | F-08 | Should | CU-14 | attempt, assessment |
| RF-34 | Permitir congelar la racha un día cuando haya congelaciones disponibles. | F-14 | Could | CU-19 | streak |
| RF-35 | Permitir al estudiante salir de una sección. | F-17 | Could | CU-04 | enrollment |
| RF-36 | Recuperar la contraseña mediante un código enviado al correo y cerrar sesión. | F-17 | Must | CU-01 | email_code, app_user |
| RF-37 | Configurar el límite diario de tarjetas nuevas y activar o desactivar la vibración. | F-12, F-18 | Could | CU-19 | app_user |
| RF-38 | El profesor consulta el desempeño de un estudiante: dominio por tema, evaluaciones, tarjetas más falladas, plan de refuerzo y constancia. | F-08, F-15 | Must | CU-23 | card_state, attempt, review_log, reinforcement_plan, streak |
| RF-39 | El profesor consulta las notas de una evaluación por estudiante e intento, y las exporta en formato CSV. | F-15 | Must | CU-24 | attempt, answer, enrollment |
| RF-40 | El profesor revisa, edita, reordena o quita las preguntas antes de publicar la evaluación. | F-10, F-15 | Must | CU-12 | assessment, question |
| RF-41 | El profesor edita, cierra o reabre una evaluación publicada; los cambios quedan en la bitácora. | F-15, F-17 | Should | CU-25 | assessment, audit_log |
| RF-42 | El profesor concede tiempo extra o una reapertura individual a un estudiante. | F-11 | Should | CU-25 | assessment_exception |
| RF-43 | Mostrar al autor y al profesor los reportes de error y las tarjetas problemáticas para corregirlos o descartarlos. | F-12, F-17 | Must | CU-26 | error_report, card_state, card |
| RF-44 | El profesor puede rechazar un mazo con un comentario obligatorio. | F-17 | Should | CU-07 | deck_endorsement |
| RF-45 | El profesor consulta la lista de inscritos, retira a un estudiante y genera un nuevo código de sección; al regenerarlo, el código, el enlace y el QR anteriores dejan de funcionar. | F-13, F-17 | Should | CU-27, CU-37 | enrollment, section |
| RF-46 | El profesor desbloquea una unidad a un estudiante con una justificación. | F-07 | Could | CU-27 | unit_unlock |
| RF-47 | El administrador de la institución gestiona los lapsos académicos y archiva las secciones al cerrar un lapso. | F-17 | Must | CU-28 | academic_term, section, institution |
| RF-48 | Cargar desde un archivo CSV la lista de inscritos (cédula, nombres, apellidos, correo y, solo para el administrador de la institución, el rol). La carga crea cuentas sin contraseña que cada persona reclama al verificar su correo. Desde Invitar a la sección el profesor solo carga estudiantes; los profesores solo los carga el administrador y quedan confirmados. | F-17 | Should | CU-02, CU-37 | app_user, membership, enrollment |
| RF-49 | El administrador oculta o restaura mazos públicos reportados como inapropiados. | F-13, F-17 | Should | CU-29 | deck, error_report, audit_log |
| RF-50 | El administrador de la institución retira membresías, confirma a los profesores que se registraron solos y restablece contraseñas. Bloquear una cuenta completa solo lo hace el equipo de Memora. | F-17 | Must | CU-02 | membership, email_code |
| RF-51 | Enviar notificaciones de repaso pendiente, evaluación nueva o por cerrar, plan de refuerzo, nota publicada y respuestas a reportes y avales. | F-01, F-14 | Must | CU-30 | notification, app_user |
| RF-52 | Explicar al estudiante por qué una tarjeta aparece en su repaso del día. | F-09, F-06 | Should | CU-10 | card_state, review_log |
| RF-53 | Ofrecer una guía de inicio y una sección de ayuda sobre el uso de la aplicación y la repetición espaciada. | F-10 | Must | CU-31 | app_user |
| RF-54 | Registrar en una bitácora las acciones sensibles y permitir su consulta al administrador. | F-17 | Should | CU-32 | audit_log |
| RF-55 | Permitir al usuario decidir si su nombre aparece como autor en los mazos públicos. | F-17 | Could | CU-19 | app_user |
| RF-56 | Registrar de forma opcional la fecha de nacimiento y el sexo del usuario. El sexo adapta el género gramatical de mensajes y notificaciones (redacción neutra si no se indica) y ambos datos se usan agrupados en las estadísticas del administrador. | F-17 | Should | CU-01, CU-19, CU-30 | app_user, notification |
| RF-57 | Cualquier persona con una cuenta verificada puede registrar una institución (universidad, instituto o curso) con su nombre y tipo; el correo de contacto de la institución es el correo verificado de quien la registra, que queda como su primer administrador. | F-13, F-17 | Must | CU-33 | institution, membership |
| RF-58 | El administrador de la institución crea áreas (facultades, escuelas o programas) y nombra administradores de área, que solo gestionan las materias, unidades y secciones de su área. | F-17 | Must | CU-34 | area, membership |
| RF-59 | Una misma cuenta puede pertenecer a varias instituciones con distintos roles; el usuario cambia de institución con un selector y su repaso del día reúne las tarjetas de todas. | F-13, F-17 | Must | CU-35 | membership, institution |
| RF-60 | Unirse a una institución con su código; al unirse a una sección con su código, el estudiante queda inscrito automáticamente en la institución de esa sección. | F-13 | Must | CU-35, CU-04 | membership, institution, enrollment |
| RF-61 | El administrador de la institución asigna o quita roles de administrador; la aplicación impide quitar el rol al último administrador activo. | F-17 | Must | CU-34 | membership |
| RF-62 | El equipo de Memora (superadministrador de la plataforma) puede suspender una institución por abuso, sin acceso a sus datos académicos. | F-17 | Could | CU-36 | institution, audit_log |
| RF-63 | Cada sección y cada institución tiene un modo de ingreso: abierto (entra quien tenga el código), con aprobación (cada solicitud se revisa) o solo inscritos (entran directo los de la lista y el resto queda por confirmar). | F-13, F-17 | Must | CU-04, CU-37 | section, institution, enrollment, membership |
| RF-64 | Las solicitudes de ingreso se atienden en la lista Por confirmar, que indica si la persona está o no en la lista de inscritos y permite aprobar o rechazar una a una o en bloque. Las de una sección las atiende su profesor; las de la institución, su administrador o el del área. | F-17 | Must | CU-37 | enrollment, membership, notification |
| RF-65 | El código de una sección o de una institución puede tener fecha de vencimiento, y la sección puede tener un cupo máximo; al llenarse el cupo o vencer el código no se aceptan más ingresos. | F-17 | Should | CU-27, CU-37 | section, institution, enrollment |
| RF-66 | Avisar a quien atiende las solicitudes cuando hay ingresos por confirmar y avisar al solicitante cuando su solicitud se aprueba o se rechaza. | F-14, F-17 | Should | CU-30, CU-37 | notification |
| RF-67 | El rol de profesor siempre requiere la confirmación de un administrador, salvo que la persona figure con ese rol en la lista de inscritos; el modo abierto solo admite estudiantes sin revisión. Los roles de administrador solo los asigna otro administrador. | F-17 | Must | CU-02, CU-35, CU-37 | membership |
| RF-68 | Verificar el correo con un código de 6 dígitos en todo registro de usuario y de institución. Los datos precargados y las membresías de la lista de inscritos solo se entregan después de verificar el correo y solo si coincide el correo cargado; si solo coincide la cédula, la persona queda por confirmar. | F-17 | Must | CU-01, CU-33, CU-37 | app_user, email_code, membership, enrollment |

## No funcionales (15)

| ID | Categoría | Requerimiento | Fuente |
|---|---|---|---|
| RNF-01 | Sin conexión | Repasar, presentar el reto y ver el progreso funcionan sin internet; los datos se guardan en SQLite y se envían al reconectar. | F-16 |
| RNF-02 | Accesibilidad | Contraste de texto de 4.5:1 o más y de gráficos de 3:1; respeta el tamaño de letra del teléfono; los estados no dependen solo del color. | F-11 |
| RNF-03 | Tiempo ajustable | Todo límite de tiempo se puede pausar o extender (WCAG 2.2.1). | F-11 |
| RNF-04 | Explicabilidad | Sin inteligencia artificial: FSRS con parámetros por defecto y reglas documentadas que el docente puede consultar. | F-09, F-15 |
| RNF-05 | Seguridad | Contraseñas cifradas con bcrypt, comunicación por HTTPS y permisos según el rol. | F-17 |
| RNF-06 | Rendimiento | El próximo repaso se calcula en el teléfono; la cola del día carga en menos de 1 segundo con 5.000 tarjetas (meta del equipo). | F-17 |
| RNF-07 | Integridad al sincronizar | Los registros creados sin conexión usan UUID para no chocar; el historial de repasos solo agrega filas, así no se pierden datos. | F-16 |
| RNF-08 | Usabilidad | Áreas táctiles de 44 px o más, retroalimentación inmediata al tocar y vibración leve. | F-10, F-11 |
| RNF-09 | Plataforma | Aplicación móvil para Android e iOS con Expo (React Native); servidor con PostgreSQL. | F-17 |
| RNF-10 | Diseño de la motivación | Se premia aprender, no el tiempo en pantalla; la racha se puede congelar un día. | F-08, F-10 |
| RNF-11 | Conflictos de sincronización | Un intento presentado sin conexión es válido si comenzó antes del cierre de la evaluación. Los repasos de dos dispositivos se combinan en orden cronológico, porque el historial solo agrega filas. Ante un cambio simultáneo en una tarjeta prevalece la versión más reciente. | F-16 |
| RNF-12 | Privacidad | Cada institución solo ve sus propios datos. El profesor solo ve los datos de los estudiantes de sus secciones; el administrador no ve respuestas individuales. El nombre del autor en los mazos públicos depende de su preferencia. La fecha de nacimiento y el sexo son opcionales, solo los ve el administrador y únicamente de forma agrupada; el profesor no los ve. | F-17 |
| RNF-13 | Aislamiento entre instituciones | Toda consulta se filtra por la institución activa del usuario y por el alcance de su rol: el administrador de área solo ve las materias, unidades y secciones de su área. Una institución suspendida queda en solo lectura para sus miembros. | F-17 |
| RNF-14 | Protección del ingreso | Los códigos no usan caracteres que se confunden (0 y O, 1 e I) y se bloquea por unos minutos a quien falla cinco intentos seguidos, lo que impide adivinar códigos por fuerza bruta. El enlace y el QR contienen el mismo código, por lo que se invalidan junto con él. Los códigos usan solo los dígitos del 2 al 9 y las letras sin I ni O. Los intentos fallidos de códigos de ingreso se cuentan en la memoria del servidor por usuario y por dirección IP; los códigos enviados al correo vencen a los 15 minutos y dejan de servir tras cinco intentos fallidos. | F-17 |
| RNF-15 | Sonido y vibración | La aplicación no usa efectos de sonido ni sonidos de cuenta regresiva. Cada acierto, error o logro se comunica con color, texto, la expresión de Memo y una vibración leve, que se omite si el usuario la desactivó en Ajustes, si el teléfono tiene la vibración apagada o si está activa la opción de reducir movimiento. Las notificaciones usan el sonido configurado por el usuario en su teléfono. | F-11, F-18, F-19 |
