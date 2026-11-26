# Memora · instrucciones para programar

Aplicación móvil de tarjetas de memoria con repetición espaciada para estudiantes universitarios.
Proyecto del Grupo 8 de Sistemas de Información III (UNERG). Este archivo resume las reglas que no se
deben romper; el detalle está en `docs/`, `design/` y `database/`.

## Reglas del proyecto

1. **Nunca llamar "sistema" a Memora** (regla de la profesora). En textos de la interfaz, comentarios
   dirigidos a usuarios y documentación se dice "aplicación", "programa" o "plataforma".
   "Software educativo" sí se puede usar.
2. **Sin inteligencia artificial.** Lo adaptativo se logra con FSRS con parámetros por defecto
   (librería `ts-fsrs`) y reglas explícitas. No usar el optimizador de FSRS ni modelos de IA.
3. **Identificadores en inglés** (tablas, campos, variables, funciones). **Interfaz en español.**
4. **Sin conexión primero.** Todo lo del estudiante funciona offline con SQLite y se sincroniza después
   (`docs/07_sincronizacion.md`).
5. **Datos personales mínimos.** Fecha de nacimiento y sexo son opcionales; el sexo solo adapta el
   género de los textos y el profesor no los ve.
6. **Accesibilidad WCAG 2.2 AA.** Texto ≥ 4.5:1, controles ≥ 3:1, áreas táctiles ≥ 44 px, respetar el
   tamaño de letra del sistema operativo del teléfono y la opción de reducir movimiento, todo límite de
   tiempo se puede pausar o extender. Los diseños actuales ya pasan la medición (mínimo 4.82:1).
7. **El cronómetro tiene sentido pedagógico** (Reto de dominio y corrección por tiempo) y **la evaluación
   tiene consecuencias** (cambia el estado de las tarjetas, genera plan de refuerzo y segunda oportunidad).

8. **Varias instituciones.** Toda consulta se filtra por la institución activa del usuario y el alcance de su
   rol (`membership`). El rol nunca se guarda en `app_user` (única excepción: `is_platform_admin`, el equipo de Memora). La elección
   "Soy estudiante / Soy profesor" del registro solo decide la pantalla siguiente; un profesor siempre queda
   por confirmar salvo que esté en la lista de inscritos. Todo registro verifica el correo con un código antes de
   entregar datos precargados o activar membresías de la lista (ver `docs/01_producto.md`, Registro). Una institución nunca se queda sin administrador.
9. **Ingreso controlado.** Código, enlace y QR son la misma llave; el modo de ingreso (`open`, `approval`,
   `roster`) decide si la persona entra directo o queda por confirmar (ver `docs/01_producto.md`).
10. **Sin efectos de sonido.** La retroalimentación es visual y con vibración leve desactivable
    (`docs/00_sistema_de_diseno.md`, sección Sonido y vibración).

## Tecnología

- **App:** Expo (React Native) con TypeScript.
  - Navegación: Expo Router (pestañas Hoy, Mazos, Evaluar, Perfil para el estudiante).
  - Datos locales: `expo-sqlite` con el esquema `database/memora_sqlite.sql`.
  - Otros: `expo-notifications`, `expo-document-picker` (importar CSV), `expo-crypto` (UUID),
    `react-native-svg` (mascota y gráficos), `expo-haptics` (vibración leve), `expo-secure-store` (elección del registro y sesión).
  - Algoritmo: `ts-fsrs` con parámetros por defecto y retención deseada por usuario.
- **Servidor:** PostgreSQL con el esquema `database/memora_postgresql.sql` (API a elección del equipo,
  por ejemplo Supabase o Node con Express).

## Dónde está cada cosa

| Carpeta / archivo | Contenido |
|---|---|
| `docs/01_producto.md` | Qué es Memora, roles por institución, modos de ingreso y funciones |
| `docs/00_sistema_de_diseno.md` | Colores, tipografía, medidas, botones 3D, mascota, reglas visuales |
| `design/tokens.ts` / `tokens.json` | Los mismos valores listos para usar en código |
| `docs/02_requerimientos.md` | 68 requerimientos funcionales y 15 no funcionales |
| `docs/03_casos_de_uso.md` | 37 casos de uso y 14 especificaciones detalladas |
| `docs/04_pantallas.md` | Las 37 pantallas en orden de flujo, con su archivo y casos de uso |
| `docs/05_logica_fsrs.md` | Repaso, FSRS, corrección por tiempo, cola, Reto, evaluaciones |
| `docs/06_importacion_csv.md` | Formatos CSV de tarjetas y de la lista de inscritos, con plantillas |
| `docs/07_sincronizacion.md` | Modo sin conexión y reglas de conflicto |
| `docs/08_navegacion.md` | Mapa de navegación entre las 37 pantallas |
| `design/pantallas_html/` | Cada pantalla como HTML de referencia visual (abrir en el navegador) |
| `design/pantallas_png/` | Las mismas pantallas como imagen |
| `design/mascota/`, `design/logo/`, `design/fuentes/` | Recursos gráficos y fuentes (licencia OFL) |
| `database/` | Scripts SQL, diccionario de datos y diagramas ER |
| `referencia/` | Informe del avance y PDF de diseño |

## Cómo usar los diseños

Los HTML de `design/pantallas_html/` son maquetas: copian medidas, colores y textos, pero no son código
para reutilizar. Se reconstruyen como componentes de React Native usando `design/tokens.ts`.
Componentes base sugeridos: `Button3D` (principal 56 px, secundario 44 px), `Card3D`, `OptionRow`
(fila marcable con indicador redondo), `TabSwitch`, `ProgressBar`, `BottomNav`, `Memo` (mascota con pose).
