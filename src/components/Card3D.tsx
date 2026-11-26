import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { depth, radius, spacing } from '../theme';
import { tapFeedback } from './feedback';
import { Surface3D, type SurfaceTone } from './Surface3D';

type Props = {
  tone?: SurfaceTone;
  children: ReactNode;
  /** When set, the whole card is one touch target that presses down onto its base. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/** One-color card with a 6 px solid base: white = review, amber = challenge, teal = assessments. */
export function Card3D({ tone = 'white', children, onPress, accessibilityLabel, style, contentStyle }: Props) {
  const face = [{ padding: spacing.cardPadding }, contentStyle];
  if (!onPress) {
    return (
      <Surface3D tone={tone} depth={depth.card} radius={radius.card} style={style} faceStyle={face}>
        {children}
      </Surface3D>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={tapFeedback}
      onPress={onPress}
      style={style}
    >
      {({ pressed }) => (
        <Surface3D tone={tone} depth={depth.card} radius={radius.card} pressed={pressed} faceStyle={face}>
          {children}
        </Surface3D>
      )}
    </Pressable>
  );
}
