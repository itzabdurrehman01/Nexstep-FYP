import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Spacing, Radius, FontSize, FontWeight } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

interface Props {
  title?: string;
  label?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, label, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const { colors: c } = useTheme();
  const text = title ?? label ?? '';
  const bg = {
    primary:   c.primary,
    secondary: c.surface2,
    danger:    c.danger,
    ghost:     'transparent',
    outline:   'transparent',
  }[variant];

  const textColor = variant === 'primary' ? c.onPrimary : variant === 'secondary' ? c.text : variant === 'ghost' || variant === 'outline' ? c.primary : '#ffffff';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: variant === 'secondary' || variant === 'outline' ? (variant === 'outline' ? c.primary : c.border) : 'transparent',
          borderWidth: variant === 'secondary' || variant === 'outline' ? 1 : 0,
          opacity: disabled || loading ? 0.6 : 1
        },
        style
      ]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={text}
    >
      {loading
        ? <ActivityIndicator size="small" color={textColor} />
        : <Text style={[styles.label, { color: textColor }]}>{text}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    borderRadius:      Radius.md,
    alignItems:        'center',
    justifyContent:    'center',
    minHeight:         48,   // WCAG touch target minimum
  },
  label: {
    fontSize:   FontSize.base,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.2,
  },
});
