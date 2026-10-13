import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FontSize, Spacing } from '../utils/theme';
import { PASSWORD_RULES } from './accountRules';

export function PasswordRules({ password }: { password: string }) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.list} accessibilityLabel="Password rules">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <Text key={rule.id} style={[styles.rule, { color: ok ? '#059669' : c.muted }]}>
            {ok ? '✓' : '○'} {rule.label}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6, marginTop: -Spacing.sm, marginBottom: Spacing.md },
  rule: { fontSize: FontSize.xs, lineHeight: 18 },
});
