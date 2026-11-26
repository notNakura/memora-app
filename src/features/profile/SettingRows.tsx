// Rows of the grouped lists of screens 21 and 23 (design/pantallas_html/21_Perfil.html, 23_Ajustes_y_cuenta.html):
// a switch row, a stepper row and a link row. Each control has a touch area of at least 44 px.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tapFeedback } from '../../components/feedback';
import { ChevronLeftIcon } from '../../components/icons';
import { colors, fonts, radius, sizes } from '../../theme';

/** Rounded block of rows separated by 2 px, like the mockups. */
export function RowGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

type Texts = { title: string; detail?: string };

function RowTexts({ title, detail }: Texts) {
  return (
    <View style={styles.texts}>
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

/** Switch of 52 x 30 px (teal when on). */
export function Switch({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPressIn={tapFeedback}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={styles.switchTouch}
    >
      <View style={[styles.track, value ? styles.trackOn : styles.trackOff]}>
        <View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff]} />
      </View>
    </Pressable>
  );
}

type SwitchRowProps = Texts & { value: boolean; onChange: (v: boolean) => void; children?: ReactNode };

/** `children` replaces the texts (the reminder row shows its time as a button). */
export function SwitchRow({ title, detail, value, onChange, children }: SwitchRowProps) {
  return (
    <View style={styles.row}>
      {children ?? <RowTexts title={title} detail={detail} />}
      <Switch label={title} value={value} onChange={onChange} />
    </View>
  );
}

type StepperRowProps = Texts & { value: number; onStep: (direction: 1 | -1) => void; min: number; max: number };

export function StepperRow({ title, detail, value, onStep, min, max }: StepperRowProps) {
  return (
    <View style={styles.row}>
      <RowTexts title={title} detail={detail} />
      <View style={styles.stepper}>
        <StepButton label="Menos" symbol="−" disabled={value <= min} onPress={() => onStep(-1)} />
        <Text accessibilityLabel={`${title}: ${value}`} style={styles.stepValue}>
          {value}
        </Text>
        <StepButton label="Más" symbol="+" disabled={value >= max} onPress={() => onStep(1)} />
      </View>
    </View>
  );
}

function StepButton({ label, symbol, disabled, onPress }: { label: string; symbol: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={tapFeedback}
      onPress={onPress}
      hitSlop={4}
      style={[styles.stepTouch, disabled && styles.disabled]}
    >
      <View style={styles.stepCircle}>
        <Text style={styles.stepSymbol}>{symbol}</Text>
      </View>
    </Pressable>
  );
}

export function LinkRow({ label, onPress, accessibilityHint }: { label: string; onPress: () => void; accessibilityHint?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, styles.linkRow, pressed && styles.pressed]}
    >
      <Text style={styles.linkText}>{label}</Text>
      <View style={styles.chevron}>
        <ChevronLeftIcon color={colors.textSecondaryOnDark} />
      </View>
    </Pressable>
  );
}

type PillProps = {
  label: string;
  onPress: () => void;
  /** solid: dark pill on a light card (design 21 "Sincronizar"); outline: on a dark row (design 23 "Salir"). */
  variant?: 'solid' | 'outline';
  accessibilityLabel?: string;
  disabled?: boolean;
};

/** Small pill button of the mockups (40 px tall face inside a 44 px touch area). */
export function PillButton({ label, onPress, variant = 'solid', accessibilityLabel, disabled = false }: PillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={tapFeedback}
      onPress={onPress}
      style={[styles.pillTouch, disabled && styles.disabled]}
    >
      {({ pressed }) => (
        <View style={[styles.pill, variant === 'solid' ? styles.pillSolid : styles.pillOutline, pressed && styles.pressed]}>
          <Text style={[styles.pillText, variant === 'outline' && styles.pillTextOutline]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export const rowStyles = StyleSheet.create({
  title: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.textOnDark },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 17, color: colors.textSecondaryOnDark },
});

const styles = StyleSheet.create({
  group: { gap: 2, borderRadius: radius.field, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  texts: { flex: 1 },
  title: rowStyles.title,
  detail: rowStyles.detail,
  switchTouch: { minHeight: sizes.minTouch, justifyContent: 'center' },
  track: { width: 52, height: 30, borderRadius: radius.pill, padding: 3 },
  trackOn: { backgroundColor: colors.teal },
  trackOff: { backgroundColor: colors.appBackground, borderWidth: 2, borderColor: colors.inputBorder, padding: 1 },
  thumb: { width: 24, height: 24, borderRadius: radius.pill },
  thumbOn: { alignSelf: 'flex-end', backgroundColor: colors.white },
  thumbOff: { alignSelf: 'flex-start', backgroundColor: colors.textSecondaryOnDark },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepTouch: { width: sizes.minTouch, height: sizes.minTouch, alignItems: 'center', justifyContent: 'center' },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.appBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSymbol: { fontFamily: fonts.bodySemi, fontSize: 18, lineHeight: 22, color: colors.textOnDark },
  stepValue: { minWidth: 32, textAlign: 'center', fontFamily: fonts.displaySemi, fontSize: 18, color: colors.textOnDark },
  disabled: { opacity: 0.4 },
  linkRow: { minHeight: 52 },
  linkText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textOnDark },
  chevron: { transform: [{ scaleX: -1 }] },
  pressed: { opacity: 0.8 },
  pillTouch: { minHeight: sizes.minTouch, justifyContent: 'center' },
  pill: { height: 40, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pillSolid: { backgroundColor: colors.appBackground },
  pillOutline: { borderWidth: 2, borderColor: colors.surfaceEdge, backgroundColor: 'transparent' },
  pillText: { fontFamily: fonts.displaySemi, fontSize: 14, color: colors.textOnDark },
  pillTextOutline: { fontFamily: fonts.bodySemi, fontSize: 13 },
});
