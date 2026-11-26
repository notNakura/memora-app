// App theme. Values come from design/tokens.ts (single source of truth); this file only adds
// composed text styles so screens do not repeat font family/size pairs.
import type { TextStyle } from 'react-native';
import { base3D, colors, depth, fonts, fontSize, radius, sizes, spacing } from '../../design/tokens';

export { base3D, colors, depth, fonts, fontSize, radius, sizes, spacing };

export const typography = {
  brand: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: colors.textOnDark },
  title: { fontFamily: fonts.display, fontSize: fontSize.title, color: colors.textOnDark },
  heading: { fontFamily: fonts.displaySemi, fontSize: 20, color: colors.textOnDark },
  body: { fontFamily: fonts.body, fontSize: fontSize.body, color: colors.textOnDark },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: fontSize.body, color: colors.textOnDark },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondaryOnDark },
  secondary: {
    fontFamily: fonts.body,
    fontSize: fontSize.secondary,
    lineHeight: 18,
    color: colors.textSecondaryOnDark,
  },
  button: { fontFamily: fonts.displaySemi, fontSize: fontSize.button, letterSpacing: 0.8 },
} satisfies Record<string, TextStyle>;

export const theme = { colors, base3D, depth, fonts, fontSize, radius, sizes, spacing, typography };
export type Theme = typeof theme;
