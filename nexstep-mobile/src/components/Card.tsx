import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Radius, getColors } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
  elevated?: boolean;
  glow?: boolean;
}

export function Card({ children, style, dark, elevated, glow }: Props) {
  const theme = useTheme();
  const isDark = dark ?? theme.dark;
  const c = isDark === theme.dark ? theme.colors : getColors(isDark);

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: c.surface,
        borderColor:     glow ? c.primary : c.border,
        shadowColor:     glow ? c.primary : '#000',
        shadowOpacity:   elevated || glow ? (isDark ? 0.35 : 0.12) : 0,
        shadowRadius:    glow ? 14 : 8,
      },
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius:  Radius['2xl'],
    borderWidth:   1,
    padding:       Spacing.xl,
    shadowOffset:  { width: 0, height: 4 },
    elevation:     4,
  },
});
