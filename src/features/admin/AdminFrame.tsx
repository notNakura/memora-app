// Frame of the admin screens (34, 36, 37): role line, title, scrollable content and room for the tab bar.
// The content column grows to 720 px and centers, so a wider web layout needs no fixed phone width.
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Notice } from '../../components/Notice';
import { colors, fonts, radius, sizes, spacing } from '../../theme';
import { TAB_BAR_SPACE } from '../shell/ShellPlaceholder';

type Props = { overline: string; title: string; children: ReactNode };

export function AdminFrame({ overline, title, children }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <Text style={styles.overline}>{overline}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Section title with an optional action on the right ("Nueva área", "Agregar", "Filtrar"). */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text accessibilityRole="header" style={styles.section}>
        {title}
      </Text>
      {action && onAction ? <PillButton label={action} onPress={onAction} /> : null}
    </View>
  );
}

/** Small outlined action of the rows ("Opciones", "Quitar rol", "Reincorporar"), 44 px tall. */
export function PillButton({
  label,
  onPress,
  tone = 'outline',
  disabled = false,
  accessibilityLabel,
  onLight = false,
}: {
  label: string;
  onPress: () => void;
  tone?: 'outline' | 'amber' | 'teal';
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Outline drawn in dark ink, for amber or white cards. */
  onLight?: boolean;
}) {
  const filled = tone !== 'outline';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        onLight && { borderColor: colors.textOnLight },
        filled && { backgroundColor: tone === 'amber' ? colors.amber : colors.teal, borderColor: 'transparent' },
        (pressed || disabled) && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.pillText, (filled || onLight) && { color: colors.textOnLight }]}>{label}</Text>
    </Pressable>
  );
}

/** A row on a dark surface: name, one line under it and actions on the right. */
export function AdminRow({ title, line, children }: { title: string; line?: string; children?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {line ? <Text style={styles.rowLine}>{line}</Text> : null}
      </View>
      {children ? <View style={styles.rowActions}>{children}</View> : null}
    </View>
  );
}

/** Error notice of a failed call; nothing when there is no message. */
export const ErrorNotice = ({ message }: { message: string | null }) =>
  message ? <Notice tone="error" message={message} /> : null;

export const adminStyles = StyleSheet.create({
  panel: {
    gap: 12,
    padding: spacing.cardPadding,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceEdge,
  },
  muted: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSecondaryOnDark },
  strong: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.textOnDark },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  scroll: { paddingHorizontal: spacing.screenX, paddingTop: 16, paddingBottom: TAB_BAR_SPACE },
  column: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 16 },
  overline: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondaryOnDark },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.textOnDark, marginTop: -8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  section: { flexShrink: 1, fontFamily: fonts.displaySemi, fontSize: 20, color: colors.textOnDark },
  pill: {
    minHeight: sizes.minTouch,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textOnDark },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceEdge,
  },
  rowText: { flex: 1, minWidth: 160, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.textOnDark },
  rowLine: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textSecondaryOnDark },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
