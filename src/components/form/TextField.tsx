import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../../theme';
import { FieldError } from './FieldError';
import { fieldStyles } from './fieldStyles';

type Props = Omit<TextInputProps, 'style'> & { label: string; error?: string };

export function TextField({ label, error, onFocus, onBlur, ...input }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label} nativeID={`${label}-label`}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        aria-labelledby={`${label}-label`}
        aria-invalid={!!error}
        placeholderTextColor={colors.textSecondaryOnDark}
        selectionColor={colors.amber}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[fieldStyles.box, fieldStyles.text, (focused || error) && fieldStyles.focused]}
        {...input}
      />
      <FieldError message={error} />
    </View>
  );
}
