// Shared "3D" surface: a solid darker base offset under the face (never a blurred shadow).
// While pressed the face drops onto the base and the base disappears (docs/00_sistema_de_diseno.md).
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { base3D, colors } from '../theme';

export type SurfaceTone = 'white' | 'amber' | 'teal' | 'mint' | 'dark';

export const surfaceTones: Record<SurfaceTone, { face: string; base: string; border?: string; text: string }> = {
  white: { face: colors.white, base: base3D.white, text: colors.textOnLight },
  amber: { face: colors.amber, base: base3D.amber, text: colors.textOnLight },
  teal: { face: colors.teal, base: base3D.teal, text: colors.textOnLight },
  mint: { face: colors.mint, base: base3D.mint, text: colors.textOnLight },
  dark: { face: colors.surface, base: base3D.surface, border: colors.surfaceEdge, text: colors.textOnDark },
};

type Props = {
  tone: SurfaceTone;
  depth: number;
  radius: number;
  pressed?: boolean;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Surface3D({ tone, depth, radius, pressed = false, style, faceStyle, children }: Props) {
  const t = surfaceTones[tone];
  return (
    <View style={[{ paddingBottom: depth }, style]}>
      {!pressed && (
        <View
          testID="surface-base"
          style={[styles.base, { top: depth, borderRadius: radius, backgroundColor: t.base }]}
        />
      )}
      <View
        style={[
          styles.face,
          {
            borderRadius: radius,
            backgroundColor: t.face,
            transform: [{ translateY: pressed ? depth : 0 }],
          },
          t.border ? { borderWidth: 2, borderColor: t.border } : null,
          faceStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { ...StyleSheet.absoluteFill },
  face: { flexGrow: 1 },
});
