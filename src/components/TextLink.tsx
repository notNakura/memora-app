// Underlined text link with a 44 px touch area (WCAG 2.5.8). Used for secondary actions on dark screens.
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, sizes } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  /** secondary: muted link (design "¿Olvidaste tu contraseña?"). primary: white, for the main way out. */
  tone?: 'primary' | 'secondary';
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function TextLink({ label, onPress, tone = 'secondary', accessibilityHint, style }: Props) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      hitSlop={8}
      style={[styles.box, style]}
    >
      <Text style={[styles.text, { color: tone === 'primary' ? colors.textOnDark : colors.textSecondaryOnDark }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: sizes.minTouch, justifyContent: 'center' },
  text: { fontFamily: fonts.bodySemi, fontSize: 14, textDecorationLine: 'underline' },
});
