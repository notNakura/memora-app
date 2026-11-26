// Error under a field: text plus an icon, never color alone (docs/00_sistema_de_diseno.md).
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../../theme';

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.amber} strokeWidth={2.2} strokeLinecap="round">
        <Circle cx="12" cy="12" r="9" />
        <Path d="M12 7v6M12 17h.01" />
      </Svg>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Amber on the app background is 8.9:1.
  text: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: colors.amber },
});
