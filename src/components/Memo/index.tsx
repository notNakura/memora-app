// Memo, the mascot. Draws the exact SVGs from design/mascota (see scripts/generate-assets.mjs).
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { MEMO_POSES } from './poses.generated';

export type MemoPose = keyof typeof MEMO_POSES;

type Props = {
  pose: MemoPose;
  /** amber on dark or light backgrounds; white on amber surfaces. */
  tone?: 'amber' | 'white';
  size?: number;
  /** Omit for decorative use; screen readers then skip it. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Memo({ pose, tone = 'amber', size = 76, accessibilityLabel, style }: Props) {
  const decorative = !accessibilityLabel;
  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    >
      <SvgXml testID={`memo-${pose}-${tone}`} xml={MEMO_POSES[pose][tone]} width={size} height={size} />
    </View>
  );
}

export { AnimatedMemo, type AnimatedMemoHandle } from './AnimatedMemo';
export type { MemoTone } from './parts';
export {
  MEMO_ACCESSORIES,
  MEMO_REACTIONS,
  REACTION_DURATION_MS,
  type MemoAccessory,
  type MemoReaction,
} from './reactions';
