// Tappable option row with title, a line explaining the consequence and a round indicator.
// Replaces loose checkboxes/radios (docs/00_sistema_de_diseno.md, Opciones marcables).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, depth, fonts, radius } from '../theme';
import { tapFeedback } from './feedback';
import { Surface3D } from './Surface3D';

type Props = {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** radio: one of many. checkbox: independent toggle confirmed later with a button. */
  kind?: 'radio' | 'checkbox';
};

export function OptionRow({ title, description, selected, onPress, kind = 'radio' }: Props) {
  return (
    <Pressable
      accessibilityRole={kind}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      onPressIn={tapFeedback}
      onPress={onPress}
    >
      {({ pressed }) => (
        <Surface3D
          tone={selected ? 'amber' : 'dark'}
          depth={depth.button}
          radius={radius.field}
          pressed={pressed}
          faceStyle={styles.face}
        >
          <View style={[styles.indicator, selected && styles.indicatorOn]}>
            {selected && <View testID="option-indicator-dot" style={styles.dot} />}
          </View>
          <View style={styles.texts}>
            <Text style={[styles.title, { color: selected ? colors.textOnLight : colors.textOnDark }]}>{title}</Text>
            {description ? (
              <Text
                style={[
                  styles.description,
                  { color: selected ? colors.textOnLight : colors.textSecondaryOnDark },
                ]}
              >
                {description}
              </Text>
            ) : null}
          </View>
        </Surface3D>
      )}
    </Pressable>
  );
}

const INDICATOR = 20;

const styles = StyleSheet.create({
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  indicator: {
    width: INDICATOR,
    height: INDICATOR,
    borderRadius: INDICATOR / 2,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorOn: { borderWidth: 2, borderColor: colors.textOnLight },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textOnLight },
  texts: { flex: 1 },
  title: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 20 },
  description: { fontFamily: fonts.body, fontSize: 13, lineHeight: 16 },
});
