// Local font files from design/fuentes (OFL). Keys match the family names in design/tokens.ts.
import { fonts } from '../../design/tokens';

export const fontAssets = {
  [fonts.display]: require('../../design/fuentes/Fredoka-Bold.ttf'),
  [fonts.displaySemi]: require('../../design/fuentes/Fredoka-SemiBold.ttf'),
  [fonts.body]: require('../../design/fuentes/Inter-Regular.ttf'),
  // design/fuentes has no Inter Medium (500); the closest shipped weight is SemiBold.
  [fonts.bodyMedium]: require('../../design/fuentes/Inter-SemiBold.ttf'),
  [fonts.bodySemi]: require('../../design/fuentes/Inter-SemiBold.ttf'),
};
