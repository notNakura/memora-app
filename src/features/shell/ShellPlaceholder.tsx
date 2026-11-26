// Placeholder of a screen that is not built yet, shown inside its shell.
// Same style as the temporary landing (NextScreenLanding); each later flow replaces it with the real screen.
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Memo } from '../../components/Memo';
import { Notice } from '../../components/Notice';
import { colors, spacing } from '../../theme';
import { ScreenHeader } from '../onboarding/ScreenHeader';
import { screenNumbers } from './shells';

/** Room left under the content for the floating tab bar (68 px bar + 24 px gap + margin). */
export const TAB_BAR_SPACE = 120;

type Props = {
  title: string;
  screens: number[];
  /** Pushed screens (for example Ajustes, 23) offer "Volver". */
  onBack?: () => void;
  children?: ReactNode;
};

export function ShellPlaceholder({ title, screens, onBack, children }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: onBack ? 28 : TAB_BAR_SPACE }]}>
        <ScreenHeader title={title} onBack={onBack} fontSize={28} />
        <Memo pose="studying" size={96} />
        <Notice message={`${title} (${screenNumbers(screens)}) aún no está disponible.`} />
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: spacing.screenX, gap: 16, alignItems: 'stretch' },
});
