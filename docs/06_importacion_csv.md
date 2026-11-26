# Importación por CSV

Hay dos archivos distintos: tarjetas de un mazo y lista de inscritos.

# 1. Tarjetas (CSV)

Plantilla: `docs/plantilla_importacion.csv`.

## Formato completo

- CSV en UTF-8. Separador coma o punto y coma (detectar automáticamente; Excel en español usa `;`).
- Primera fila con los nombres de las columnas.

| Columna | Obligatoria | Contenido | Destino |
|---|---|---|---|
| `tipo` | No (por defecto `pregunta`) | `pregunta`, `completar` u `ordenar` | `card.type` = `basic`, `cloze`, `ordering` |
| `unidad` | No | Número de unidad de la materia del mazo | `card.unit_id` |
| `anverso` | Sí | Pregunta; en `completar` el hueco se marca con `____` | `card.front` |
| `reverso` | Sí | Respuesta; en `ordenar` los pasos separados por `\|` | `card.back` |
| `incorrecta_1..3` | No | Opciones falsas | `card_option` (`is_correct = false`) |

Si faltan opciones falsas, se toman respuestas de otras tarjetas del mismo mazo.

## Formato corto

Dos columnas sin encabezado (anverso, reverso), compatible con exportaciones de Anki y Quizlet.

## Reglas

- Hasta 500 filas por archivo.
- Vista previa antes de guardar; filas con error marcadas con el motivo ("falta el reverso", "tipo no
  válido", "unidad inexistente"). Solo se importan las válidas.
- Las tarjetas de imagen con zonas tapadas no se importan: se crean en la aplicación.


# 2. Lista de inscritos (CSV)

Plantilla: `docs/plantilla_inscritos.csv`. La carga el administrador (para la institución o un área) o el
profesor (para su sección) desde Usuarios o desde Invitar a la sección.

| Columna | Obligatoria | Contenido | Destino |
|---|---|---|---|
| `cedula` | Sí | Cédula con prefijo, p. ej. `V-30555777` (se aceptan puntos y se eliminan) | `app_user.national_id` |
| `nombres` | Sí | Nombres | `app_user.first_names` |
| `apellidos` | Sí | Apellidos | `app_user.last_names` |
| `correo` | Sí | Correo personal con el que la persona se va a registrar | `app_user.email` |
| `rol` | No (por defecto `estudiante`) | `estudiante` o `profesor`. Solo la usa el administrador de la institución; si carga el profesor desde Invitar a la sección, siempre es `estudiante` | `membership.role` = `student`, `teacher` |
| `seccion` | No | Código de 6 caracteres de la sección (solo estudiantes) | `enrollment` |

Qué hace la carga por fila:

1. Busca la cédula y el correo.
   - Ninguno existe: crea un `app_user` **sin contraseña y sin verificar** (cuenta precargada).
   - Existe una cuenta con esa cédula **y** ese correo: la reutiliza.
   - La cédula existe con otro correo, o el correo con otra cédula: marca la fila con error ("la cédula ya está
     registrada con otro correo") y no la carga.
2. Crea la membresía con `status = 'invited'` (si la persona ya tiene cuenta verificada, directamente `active`).
   Los profesores cargados así no necesitan confirmación.
3. Si trae `seccion`, crea la inscripción con `status = 'invited'` (o `active` si la cuenta ya está verificada),
   respetando el cupo.

Reglas:

- CSV en UTF-8, separador coma o punto y coma, primera fila con los nombres de las columnas, hasta 2000 filas.
- Vista previa con las filas válidas y las que tienen error antes de confirmar; la carga queda en la bitácora.
- Las membresías `invited` se activan solo cuando la persona **verifica ese mismo correo** al registrarse
  (`docs/01_producto.md`, Registro).
