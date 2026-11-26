// Date field shown as DD/MM/AAAA. Uses the native picker on Android/iOS; the web build uses the
// browser date input because @react-native-community/datetimepicker has no web implementation.
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../../theme';
import { CalendarIcon } from '../icons';
import { fieldStyles } from './fieldStyles';

type Props = {
  label: string;
  /** ISO date YYYY-MM-DD, as stored in app_user.birth_date. */
  value: string | null;
  onChange: (isoDate: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const formatDisplayDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const fromIsoDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function DateField({ label, value, onChange, minimumDate, maximumDate }: Props) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={[fieldStyles.group, styles.flex]}>
        <Text style={fieldStyles.label}>{label}</Text>
        {createElement('input', {
          type: 'date',
          'aria-label': label,
          value: value ?? '',
          min: minimumDate ? toIsoDate(minimumDate) : undefined,
          max: maximumDate ? toIsoDate(maximumDate) : undefined,
          onChange: (e: { target: { value: string } }) => e.target.value && onChange(e.target.value),
          style: webInputStyle,
        })}
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(Platform.OS === 'ios');
    if (event.type === 'set' && date) onChange(toIsoDate(date));
    if (event.type === 'dismissed') setOpen(false);
  };

  return (
    <View style={[fieldStyles.group, styles.flex]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDisplayDate(value) : 'sin indicar'}`}
        accessibilityHint="Abre el calendario"
        onPress={() => setOpen(true)}
        style={[fieldStyles.box, fieldStyles.row, styles.compact]}
      >
        <Text style={[fieldStyles.text, styles.flex, !value && fieldStyles.placeholder]}>
          {value ? formatDisplayDate(value) : 'DD/MM/AAAA'}
        </Text>
        <CalendarIcon color={colors.textOnDark} />
      </Pressable>
      {open && (
        <DateTimePicker
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          value={value ? fromIsoDate(value) : (maximumDate ?? new Date())}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
          themeVariant="dark"
          locale="es-VE"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  compact: { paddingHorizontal: 12 },
});

const webInputStyle = {
  boxSizing: 'border-box',
  height: 54,
  minWidth: 0,
  width: '100%',
  borderRadius: radius.field,
  border: `2px solid ${colors.inputBorder}`,
  background: colors.surface,
  padding: '0 12px',
  fontFamily: fonts.body,
  fontSize: 15,
  color: colors.textOnDark,
  colorScheme: 'dark',
};
