// Title row of screens 5, 22 and 33: round "Volver" button (only when there is a screen to go back to)
// and the screen title.
import { StyleSheet, Text, View } from 'react-native';
import { IconButton3D } from '../../components/IconButton3D';
import { ChevronLeftIcon } from '../../components/icons';
import { colors, fonts } from '../../theme';

type Props = { title: string; onBack?: () => void; fontSize?: number };

export function ScreenHeader({ title, onBack, fontSize = 30 }: Props) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <IconButton3D accessibilityLabel="Volver" onPress={onBack}>
          <ChevronLeftIcon color={colors.textOnDark} />
        </IconButton3D>
      ) : null}
      <Text accessibilityRole="header" style={[styles.title, { fontSize }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { flexShrink: 1, fontFamily: fonts.display, color: colors.textOnDark },
});
