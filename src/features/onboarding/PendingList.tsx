// Requests waiting for a teacher or an administrator (screens 5 and 22 list them with "Por confirmar").
// No mockup draws this state; it uses the dark row and the mint chip of screen 33 ("Verificado").
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../../theme';

type Props = { items: { key: string; label: string }[] };

export function PendingList({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.heading}>
        Solicitudes enviadas
      </Text>
      {items.map((item) => (
        <View key={item.key} accessible accessibilityLabel={`${item.label}. Por confirmar`} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.chip}>Por confirmar</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  heading: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondaryOnDark },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.field,
    borderWidth: 2,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.surface,
  },
  label: { flex: 1, minWidth: 120, fontFamily: fonts.body, fontSize: 15, color: colors.textOnDark },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.mint,
    color: colors.textOnLight,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
});
