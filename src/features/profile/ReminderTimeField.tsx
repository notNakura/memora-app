// Time of the daily reminder ("7:00 p. m." under "Recordatorio diario", design 23). Pressing it opens the native
// time picker; the web build uses the browser time input, like DateField does for dates.
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, sizes } from '../../theme';
import { formatReminderTime } from './preferences';
import { rowStyles } from './SettingRows';

type Props = {
  title: string;
  /** 'HH:MM' */
  value: string;
  onChange: (hhmm: string) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');
const toHhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toDate = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export function ReminderTimeField({ title, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const shown = formatReminderTime(value);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.texts}>
        <Text style={rowStyles.title}>{title}</Text>
        {createElement('input', {
          type: 'time',
          'aria-label': 'Hora del recordatorio',
          value,
          onChange: (e: { target: { value: string } }) => e.target.value && onChange(e.target.value),
          style: webInputStyle,
        })}
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(Platform.OS === 'ios');
    if (event.type === 'set' && date) {
      setOpen(false);
      onChange(toHhmm(date));
    }
    if (event.type === 'dismissed') setOpen(false);
  };

  return (
    <View style={styles.texts}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Hora del recordatorio: ${shown}`}
        accessibilityHint="Cambia la hora del recordatorio"
        onPress={() => setOpen(true)}
        style={styles.touch}
      >
        <Text style={rowStyles.title}>{title}</Text>
        <Text style={[rowStyles.detail, styles.time]}>{shown}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          value={toDate(value)}
          onChange={handleChange}
          themeVariant="dark"
          locale="es-VE"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  texts: { flex: 1 },
  touch: { minHeight: sizes.minTouch, justifyContent: 'center' },
  time: { textDecorationLine: 'underline' },
});

const webInputStyle = {
  marginTop: 4,
  height: 32,
  borderRadius: 8,
  border: `2px solid ${colors.inputBorder}`,
  background: colors.appBackground,
  padding: '0 8px',
  fontFamily: fonts.body,
  fontSize: 13,
  color: colors.textOnDark,
  colorScheme: 'dark',
};
