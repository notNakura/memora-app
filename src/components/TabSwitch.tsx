import { Pressable, StyleSheet, Text, View } from 'react-native';
import { base3D, colors, fonts, radius } from '../theme';
import { tapFeedback } from './feedback';

type Tab<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  tabs: Tab<K>[];
  value: K;
  onChange: (key: K) => void;
  accessibilityLabel: string;
};

/** Pill switch; the active tab is a white face on a 3 px base. */
export function TabSwitch<K extends string>({ tabs, value, onChange, accessibilityLabel }: Props<K>) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={styles.track}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPressIn={tapFeedback}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
          >
            {active && (
              <>
                <View style={styles.activeBase} />
                <View style={styles.activeFace} />
              </>
            )}
            <Text style={[styles.label, { color: active ? colors.textOnLight : colors.textSecondaryOnDark }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 6,
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceEdge,
  },
  tab: { flex: 1, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  // White face on a solid 3 px base, like the other 3D surfaces.
  activeBase: { ...StyleSheet.absoluteFill, top: 3, bottom: -3, borderRadius: radius.pill, backgroundColor: base3D.white },
  activeFace: { ...StyleSheet.absoluteFill, borderRadius: radius.pill, backgroundColor: colors.white },
  label: { fontFamily: fonts.displaySemi, fontSize: 15 },
});
