// Building blocks shared by the teacher screens 24-28: frame, loading/empty states, bars and the QR.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { Button3D } from '../../components/Button3D';
import { AnimatedMemo } from '../../components/Memo/AnimatedMemo';
import { Notice } from '../../components/Notice';
import { colors, fonts, radius, spacing, typography } from '../../theme';
import { ScreenHeader } from '../onboarding/ScreenHeader';
import { encodeQr } from './qr';
import { errorMessage } from './texts';

/** Room for the floating tab bar on tab screens (same as ShellPlaceholder). */
const TAB_BAR_SPACE = 120;
/** Content keeps a phone width on wide screens until the wide web layout exists. */
const MAX_CONTENT_WIDTH = 560;

type FrameProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Tab screens leave room for the floating tab bar. */
  inTabs?: boolean;
  children: ReactNode;
};

export function TeacherFrame({ title, subtitle, onBack, inTabs, children }: FrameProps) {
  return (
    <SafeAreaView style={styles.safe} edges={inTabs ? ['top'] : ['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: inTabs ? TAB_BAR_SPACE : 28 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.column}>
          <ScreenHeader title={title} onBack={onBack} fontSize={28} />
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export type Loaded<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

/** Loads once and on reload(); keeps only the answer of the latest load. */
export function useLoad<T>(load: () => Promise<T>) {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' });
  const latest = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  const reload = useCallback(async () => {
    const id = ++latest.current;
    try {
      const data = await loadRef.current();
      if (id === latest.current) setState({ status: 'ready', data });
    } catch (err) {
      if (id === latest.current) setState({ status: 'error', message: errorMessage(err) });
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { state, reload, setData: (data: T) => setState({ status: 'ready', data }) };
}

/** Loading spinner or the error with "Reintentar"; renders children only when the data is ready. */
export function LoadGate<T>({ state, onRetry, children }: { state: Loaded<T>; onRetry: () => void; children: (data: T) => ReactNode }) {
  if (state.status === 'loading') {
    return <ActivityIndicator color={colors.amber} accessibilityLabel="Cargando" style={styles.loading} />;
  }
  if (state.status === 'error') {
    return (
      <View style={styles.gap}>
        <Notice tone="error" message={state.message} />
        <Button3D label="Reintentar" size="secondary" tone="dark" onPress={onRetry} />
      </View>
    );
  }
  return <>{children(state.data)}</>;
}

/** Empty state with Memo (no section yet, no data yet). */
export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.empty} accessible accessibilityLabel={`${title}. ${message}`}>
      <AnimatedMemo mood="idle" size={110} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

/** Horizontal mastery bar; decorative (the percentage is always written next to it). */
export function Bar({ value, tone = 'teal' }: { value: number | null; tone?: 'teal' | 'amber' }) {
  return (
    <View style={styles.barTrack} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View
        style={[
          styles.barFill,
          { width: `${Math.max(0, Math.min(100, value ?? 0))}%`, backgroundColor: tone === 'teal' ? colors.teal : colors.amber },
        ]}
      />
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Invitation QR: dark modules on white with the 4-module quiet zone. */
export function QrCode({ value, size, label }: { value: string; size: number; label: string }) {
  const qr = encodeQr(value);
  const quiet = 4;
  const total = qr.size + quiet * 2;
  let d = '';
  qr.modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }),
  );
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} testID="invite-qr">
      <Svg width={size} height={size} viewBox={`0 0 ${total} ${total}`}>
        <Rect x={0} y={0} width={total} height={total} fill={colors.white} />
        <Path d={d} fill={colors.textOnLight} />
      </Svg>
    </View>
  );
}

export const teacherStyles = StyleSheet.create({
  cardBody: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  onLight: { fontFamily: fonts.body, fontSize: 15, color: colors.textOnLight },
  onLightStrong: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.textOnLight },
  onLightSecondary: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textSecondaryOnLight },
  onDark: typography.body,
  onDarkSecondary: typography.secondary,
  bigNumber: { fontFamily: fonts.display, fontSize: 40, color: colors.textOnLight },
  percent: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.textOnLight, minWidth: 56, textAlign: 'right' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: spacing.screenX, alignItems: 'center' },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: 16 },
  subtitle: { ...typography.secondary, marginTop: -8 },
  loading: { marginTop: 40 },
  gap: { gap: 12 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  emptyTitle: { ...typography.heading, textAlign: 'center' },
  emptyText: { ...typography.secondary, textAlign: 'center' },
  barTrack: { height: 10, borderRadius: radius.pill, backgroundColor: '#E4E7F0', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.pill },
  sectionTitle: { ...typography.heading, marginTop: 4 },
});
