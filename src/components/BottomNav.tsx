// Floating navigation bar: dark blue at 86 % opacity (docs/00_sistema_de_diseno.md). Students use the default
// tabs; the teacher and administrator shells pass their own (docs/08_navegacion.md, Barras de navegación).
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, spacing } from '../theme';
import { tapFeedback } from './feedback';
import { AssessIcon, DecksIcon, ProfileIcon, TodayIcon } from './icons';

export type NavItem = { key: string; label: string; Icon: ComponentType<{ color: string; size?: number }> };

export const studentNavItems: NavItem[] = [
  { key: 'today', label: 'Hoy', Icon: TodayIcon },
  { key: 'decks', label: 'Mazos', Icon: DecksIcon },
  { key: 'assess', label: 'Evaluar', Icon: AssessIcon },
  { key: 'profile', label: 'Perfil', Icon: ProfileIcon },
];

type Props = {
  activeKey: string;
  onSelect: (key: string) => void;
  items?: NavItem[];
  /** Name of the bar for screen readers (design 24: "Navegación docente"). */
  accessibilityLabel?: string;
};

export function BottomNav({
  activeKey,
  onSelect,
  items = studentNavItems,
  accessibilityLabel = 'Navegación principal',
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.bar, { bottom: spacing.block + insets.bottom }]}
    >
      {items.map(({ key, label, Icon }) => {
        const active = key === activeKey;
        const color = active ? colors.textOnDark : colors.textSecondaryOnDark;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            onPressIn={tapFeedback}
            onPress={() => onSelect(key)}
            style={styles.item}
          >
            <Icon color={color} />
            <Text style={[styles.label, { color, fontFamily: active ? fonts.bodySemi : fonts.bodyMedium }]} numberOfLines={2}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.screenX,
    right: spacing.screenX,
    // minHeight, not height: labels grow with the phone's font size (WCAG 1.4.4).
    minHeight: 68,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(14,20,48,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  item: { flex: 1, maxWidth: 96, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11, textAlign: 'center' },
});
