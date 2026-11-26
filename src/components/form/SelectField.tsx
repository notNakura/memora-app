// Field that opens a sheet of OptionRows (React Native has no native <select>).
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { ChevronDownIcon } from '../icons';
import { OptionRow } from '../OptionRow';
import { fieldStyles } from './fieldStyles';

export type SelectOption<V extends string> = { value: V; label: string };

type Props<V extends string> = {
  label: string;
  value: V | null;
  options: SelectOption<V>[];
  onChange: (value: V) => void;
  placeholder?: string;
};

export function SelectField<V extends string>({ label, value, options, onChange, placeholder = 'Elegir' }: Props<V>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={[fieldStyles.group, styles.flex]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? 'sin indicar'}`}
        accessibilityHint="Abre la lista de opciones"
        onPress={() => setOpen(true)}
        style={[fieldStyles.box, fieldStyles.row]}
      >
        <Text numberOfLines={1} style={[fieldStyles.text, styles.flex, !current && fieldStyles.placeholder]}>
          {current?.label ?? placeholder}
        </Text>
        <ChevronDownIcon color={colors.textOnDark} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Cerrar" style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text accessibilityRole="header" style={typography.heading}>
              {label}
            </Text>
            <View accessibilityRole="radiogroup" style={styles.list}>
              {options.map((o) => (
                <OptionRow
                  key={o.value}
                  title={o.label}
                  selected={o.value === value}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                />
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3,5,15,0.7)' },
  sheet: {
    backgroundColor: colors.appBackground,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.screenX,
    paddingBottom: spacing.block * 2,
    gap: 16,
  },
  list: { gap: 10 },
});
