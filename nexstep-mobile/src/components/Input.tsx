import React, { useState } from 'react';
import { TextInput, View, Text, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Spacing, Radius, FontSize, getColors } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
  dark?: boolean;
}

export function Input({ label, error, secureToggle, dark, style, ...props }: Props) {
  const [showPw, setShowPw] = useState(false);
  const theme = useTheme();
  const isDark = dark ?? theme.dark;
  const c = isDark === theme.dark ? theme.colors : getColors(isDark);
  const border = error ? c.danger : c.border;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: c.muted }]}>{label}</Text> : null}
      <View style={[styles.row, { backgroundColor: c.surface, borderColor: border }]}>
        <TextInput
          {...props}
          secureTextEntry={secureToggle ? !showPw : props.secureTextEntry}
          style={[styles.input, { color: c.text }, style]}
          placeholderTextColor={c.muted}
          accessibilityLabel={label}
        />
        {secureToggle && (
          <TouchableOpacity onPress={() => setShowPw(p => !p)} style={styles.toggle} accessibilityLabel={showPw ? 'Hide password' : 'Show password'}>
            <Text style={{ color: c.primary, fontSize: FontSize.sm }}>{showPw ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.lg },
  label:   { fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs },
  row:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, minHeight: 50 },
  input:   { flex: 1, fontSize: FontSize.base, paddingVertical: Spacing.md },
  toggle:  { paddingLeft: Spacing.sm },
  error:   { fontSize: FontSize.xs, marginTop: Spacing.xs },
});
