// Inline notice. info = mint; error = cream with dark text for server/network problems.
// `icon` replaces the default info/error icon (for example the shield of screen 02).
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts, radius } from '../theme';

type Props = { message: string; tone?: 'info' | 'error'; icon?: ReactNode };

export function Notice({ message, tone = 'info', icon }: Props) {
  const isError = tone === 'error';
  return (
    <View
      accessible
      accessibilityLabel={message}
      accessibilityRole={isError ? 'alert' : 'text'}
      accessibilityLiveRegion={isError ? 'assertive' : undefined}
      style={[styles.box, { backgroundColor: isError ? colors.cream : colors.mint }]}
    >
      {icon ?? (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.textOnLight} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="9" />
          <Path d={isError ? 'M12 7v6M12 17h.01' : 'M12 8h.01M11 12h1v5h1'} />
        </Svg>
      )}
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.field },
  text: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textOnLight },
});
