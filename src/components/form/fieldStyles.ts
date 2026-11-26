import { StyleSheet } from 'react-native';
import { colors, fonts, radius } from '../../theme';

export const fieldStyles = StyleSheet.create({
  group: { gap: 6, minWidth: 0 },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondaryOnDark },
  box: {
    minHeight: 54,
    borderRadius: radius.field,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  focused: { borderColor: colors.amber },
  text: { fontFamily: fonts.body, fontSize: 16, color: colors.textOnDark },
  placeholder: { color: colors.textSecondaryOnDark },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
