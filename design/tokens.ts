// Memora · tokens de diseño (fuente: docs/00_sistema_de_diseno.md)
// Contraste verificado con WCAG 2.2: los pares de texto indicados abajo cumplen ≥ 4.5:1.

export const colors = {
  // Fondos y superficies
  appBackground: '#0E1430',   // fondo de la app (oscuro)
  brandIndigo: '#1E2A5A',     // logo, documentos
  surface: '#1B2347',         // tarjetas y filas sobre el fondo oscuro
  surfaceEdge: '#2E3970',     // borde y base 3D de superficies oscuras
  white: '#FFFFFF',

  // Acentos
  amber: '#F2A93B',           // reto, próximo repaso, mascota, selección
  teal: '#14A38B',            // progreso, dominado, evaluaciones (texto encima: #0E1430)
  tealText: '#0E7C6A',        // texto verde sobre blanco (5.1:1)
  mint: '#CFF1E7',            // momento protagonista de progreso
  cream: '#FFF4E2',
  lilac: '#E8DDF7',

  // Texto
  textOnDark: '#FFFFFF',
  textSecondaryOnDark: '#B4BBD8', // 9.5:1 sobre #0E1430
  textOnLight: '#0E1430',
  textSecondaryOnLight: '#4A5370', // 7.6:1 sobre blanco
  warningOnLight: '#B4531A',       // avisos sobre blanco

  // Bordes de campos de texto (≥ 3:1 contra el fondo)
  inputBorder: '#6873B0',
} as const;

// Base sólida "3D" bajo cada superficie (no es sombra difusa)
export const base3D = {
  amber: '#C17A14',
  white: '#C9CEDD',
  teal: '#0B7563',
  dark: '#03050F',      // azul oscuro sobre claro
  mint: '#9DD9C6',
  surface: '#2E3970',   // superficie oscura sobre fondo oscuro (con borde 2 px del mismo color)
} as const;

export const depth = { button: 4, card: 6 } as const; // px de desplazamiento de la base 3D

export const fonts = {
  display: 'Fredoka_700Bold',      // títulos, marca
  displaySemi: 'Fredoka_600SemiBold', // encabezados y etiquetas de botones
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

export const fontSize = {
  title: 30,        // 28–34
  section: 22,      // 22–30
  hero: 56,         // número protagonista 40–64
  body: 16,         // 15–17
  secondary: 13,    // 13–14
  button: 17,
} as const;

export const spacing = {
  screenX: 20,      // margen lateral
  block: 24,        // separación entre bloques
  cardPadding: 22,
} as const;

export const radius = {
  card: 28,
  field: 16,        // campos, filas, fichas
  pill: 999,        // botones y chips
} as const;

export const sizes = {
  buttonPrimary: 56,   // ancho completo, MAYÚSCULAS
  buttonSecondary: 44,
  minTouch: 44,
  screen: { width: 390, height: 844 },
} as const;
