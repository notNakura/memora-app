# Sistema de diseño de Memora

Los valores están listos para código en `design/tokens.ts` y `design/tokens.json`.

## Marca

- **Isologo:** la palabra "memora" dentro de la tarjeta frontal de tres tarjetas en abanico (ámbar, verde y
  azul). Una línea de puntos ascendente representa la repetición espaciada y un punto ámbar con anillo
  marca el próximo repaso. Versiones positivo, negativo y una tinta en `design/logo/`.
- **Eslogan:** REPETICIÓN ESPACIADA · APRENDIZAJE ACTIVO.
- **Azules:** `#1E2A5A` es el azul de marca (logo, documentos, fondo del logo en negativo). `#0E1430` es
  el fondo de la aplicación, más oscuro para dar contraste. Son distintos a propósito.

## Colores

| Uso | Color |
|---|---|
| Fondo de la app | `#0E1430` |
| Superficie oscura (tarjetas, filas) | `#1B2347` con borde y base `#2E3970` |
| Repaso (tarjeta protagonista) | Blanco `#FFFFFF`, base `#C9CEDD` |
| Reto de dominio, selección | Ámbar `#F2A93B`, base `#C17A14` |
| Evaluaciones y progreso | Verde `#14A38B`, base `#0B7563`, **texto encima `#0E1430`** |
| Momento de progreso | Menta `#CFF1E7`, base `#9DD9C6` |
| Texto secundario sobre oscuro | `#B4BBD8` |
| Texto secundario sobre blanco | `#4A5370` |
| Borde de campos de texto | `#6873B0` |

Un color sólido por tipo de contenido: blanco para el repaso, ámbar para el reto, verde para evaluaciones y
progreso.

## Tipografía

- **Fredoka** 700/600: marca, títulos, encabezados y etiquetas de botones.
- **Inter** 400/500/600: textos.
- Escala: título 28–34, sección 22–30, número protagonista 40–64, texto 15–17, secundario 13–14.
- En Expo: `@expo-google-fonts/fredoka` y `@expo-google-fonts/inter`, o los `.ttf` de `design/fuentes/`.

## Medidas

- Margen lateral 20, separación entre bloques 24, relleno de tarjetas 22.
- Solo tres redondeos: 28 (tarjetas), 16 (campos, filas, fichas) y cápsula (botones y chips).
- Botón principal 56 de alto, ancho completo, en MAYÚSCULAS; secundario 44. Área táctil mínima 44.

## Botones y superficies "3D"

Cada botón, ficha o tarjeta tiene debajo una base sólida más oscura de su mismo color, desplazada 4 px
(6 px en tarjetas). No es una sombra difusa. Al presionar, el elemento baja esos píxeles y la base
desaparece. En React Native se logra con una vista de fondo desplazada o con `borderBottomWidth`.

## Opciones marcables

Nada de casillas sueltas. Cada opción es una fila que se toca, con título, una línea que explica la
consecuencia y un indicador redondo (ámbar si está activa, contorno si no). Los ajustes que aplican al
instante usan interruptor (switch); las opciones que se confirman con un botón usan la fila marcable.

## Reglas visuales

- Cero emojis: una sola familia de íconos de línea (trazo 2 px, extremos redondeados).
- Cero sombras difusas: solo las bases 3D.
- Un protagonista por pantalla; nada de chips ni etiquetas de adorno.
- Barra de navegación flotante, azul oscuro al 86 % de opacidad.
- Los estados no se distinguen solo por color: llevan texto o forma.

## Mascota: Memo

- Forma de gotita, un solo color plano, sin contorno ni brillos; dos ojos ovalados y boca pequeña.
- Versión ámbar sobre fondos oscuros o claros; versión blanca sobre superficies ámbar.
- Poses en `design/mascota/`: hola (inicio), estudiando (diagnóstico y refuerzo), reto (cronómetro),
  celebrando (logros), pensando (después de un error), descanso (sin repasos pendientes).
- Sus mensajes dicen qué se logró y qué sigue, sin elogios genéricos.

## Accesibilidad

- Contraste de texto ≥ 4.5:1 y de controles ≥ 3:1. Las 37 pantallas se midieron (654 textos): mínimo 4.82:1.
- Respetar el tamaño de letra del sistema operativo del teléfono y la opción de reducir movimiento.
- Elementos con rol accesible (`accessibilityRole`, `accessibilityLabel` en íconos sin texto).
- Retroalimentación inmediata al tocar, con vibración leve.
- Todo límite de tiempo se puede pausar o extender (WCAG 2.2.1).

## Sonido y vibración

Memora **no usa efectos de sonido** (ni al acertar, ni al fallar, ni tictac en el Reto de dominio). Es una
decisión de diseño respaldada por evidencia: en Altmeyer et al. (CHI 2022, 317 participantes) los sonidos no
cambiaron rendimiento, disfrute ni inmersión y los de tono negativo aumentaron la tensión; el ruido intermitente
empeora tareas cognitivas (Szalma y Hancock, 2011). La retroalimentación se da con color, texto, la pose de Memo
y vibración (`expo-haptics`), que se puede apagar en Ajustes (`app_user.vibration_enabled`).

| Momento | Vibración (`expo-haptics`) |
|---|---|
| Tocar un botón principal o una opción | `selectionAsync()` |
| Acierto, Bien o Fácil | `notificationAsync(Success)` |
| Error u Otra vez | `impactAsync(Light)` (suave, nunca de alerta) |
| Quedan 10 s en el Reto o en una evaluación | un `impactAsync(Medium)` único, sin repetir |
| Unidad dominada, insignia o fin del repaso | `notificationAsync(Success)` |

- Nunca vibrar en bucle ni comunicar algo solo con la vibración: siempre va acompañada de un cambio visual.
- No se vibra si `vibration_enabled` es falso, si el teléfono tiene la vibración apagada (modo silencio sin
  vibración) o si el usuario activó reducir movimiento. Las tres condiciones se aplican a la vez (RNF-15).
- Las notificaciones usan el sonido configurado en el teléfono; la aplicación no define sonidos propios.
