// Small building blocks of Gestión académica (35): pill buttons with their own screen-reader name, and
// a bottom sheet for forms and confirmations.
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tapFeedback } from '../../components/feedback';
import { colors, fonts, radius, sizes, spacing, typography } from '../../theme';

type PillProps = {
  label: string;
  onPress: () => void;
  /** Screen-reader name when the visible label is not enough ("Confirmar a Ana Pérez"). */
  accessibilityLabel?: string;
  tone?: 'dark' | 'light' | 'outline';
  disabled?: boolean;
};

/** Pill button of the design (40 px face inside a 44 px touch area). */
export function PillButton({ label, onPress, accessibilityLabel, tone = 'dark', disabled = false }: PillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={tapFeedback}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.pill, pillTones[tone], pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.pillText, { color: tone === 'light' ? colors.textOnLight : colors.textOnDark }]}>{label}</Text>
    </Pressable>
  );
}

type SheetProps = {
  visible: boolean;
  title: string;
  /** Name of the sheet for screen readers and tests ("Formulario de sección"). */
  accessibilityLabel?: string;
  onClose: () => void;
  children: ReactNode;
};

/** Bottom sheet with a title, scrolling content and "Cerrar". */
export function Sheet({ visible, title, accessibilityLabel, onClose, children }: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View accessibilityLabel={accessibilityLabel ?? title} style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text accessibilityRole="header" style={[typography.heading, styles.sheetTitle]}>
              {title}
            </Text>
            <PillButton label="Cerrar" tone="outline" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const pillTones = StyleSheet.create({
  dark: { backgroundColor: colors.appBackground },
  light: { backgroundColor: colors.white },
  outline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.surfaceEdge },
});

const styles = StyleSheet.create({
  pill: {
    minHeight: sizes.minTouch,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontFamily: fonts.displaySemi, fontSize: 14 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3,5,15,0.7)' },
  sheet: {
    maxHeight: '90%',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    backgroundColor: colors.appBackground,
    borderWidth: 2,
    borderColor: colors.surfaceEdge,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 20,
    paddingHorizontal: spacing.screenX,
  },
  sheetTitle: { flex: 1 },
  sheetBody: { padding: spacing.screenX, paddingBottom: 32, gap: 14 },
});
