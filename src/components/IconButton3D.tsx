// Round 44 px button on a dark 3D base (back button of screen 02).
import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import { depth, radius, sizes } from '../theme';
import { tapFeedback } from './feedback';
import { Surface3D } from './Surface3D';

type Props = { accessibilityLabel: string; onPress: () => void; children: ReactNode };

export function IconButton3D({ accessibilityLabel, onPress, children }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPressIn={tapFeedback} onPress={onPress}>
      {({ pressed }) => (
        <Surface3D
          tone="dark"
          depth={depth.button}
          radius={radius.pill}
          pressed={pressed}
          faceStyle={{ width: sizes.minTouch, height: sizes.minTouch, alignItems: 'center', justifyContent: 'center', flexGrow: 0 }}
        >
          {children}
        </Surface3D>
      )}
    </Pressable>
  );
}
