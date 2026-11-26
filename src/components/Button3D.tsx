import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { depth, radius, sizes, typography } from '../theme';
import { tapFeedback } from './feedback';
import { Surface3D, surfaceTones, type SurfaceTone } from './Surface3D';

type Props = {
  label: string;
  onPress?: () => void;
  /** primary: 56 px, full width. secondary: 44 px. */
  size?: 'primary' | 'secondary';
  tone?: SurfaceTone;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button3D({
  label,
  onPress,
  size = 'primary',
  tone = 'white',
  disabled = false,
  accessibilityHint,
  style,
}: Props) {
  const height = size === 'primary' ? sizes.buttonPrimary : sizes.buttonSecondary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={tapFeedback}
      onPress={onPress}
      style={[size === 'primary' && styles.fullWidth, disabled && styles.disabled, style]}
    >
      {({ pressed }) => (
        <Surface3D
          tone={tone}
          depth={depth.button}
          radius={radius.pill}
          pressed={pressed}
          faceStyle={[styles.face, { height, paddingHorizontal: size === 'primary' ? 24 : 20 }]}
        >
          <Text
            style={[typography.button, { color: surfaceTones[tone].text }, size === 'secondary' && styles.small]}
          >
            {label.toUpperCase()}
          </Text>
        </Surface3D>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  face: { alignItems: 'center', justifyContent: 'center', flexGrow: 0 },
  small: { fontSize: 15 },
  disabled: { opacity: 0.5 },
});
