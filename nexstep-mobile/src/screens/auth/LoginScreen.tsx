import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSignIn } from '@clerk/expo';
import { clerkAuthError, parseGmail } from '../../auth/accountRules';
import { Button } from '../../components/Button';
import { GoogleGmailButton } from '../../components/GoogleGmailButton';
import { Input } from '../../components/Input';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

interface Props {
  onNavigateRegister: () => void;
  onNavigateForgot: () => void;
}

export function LoginScreen({ onNavigateRegister, onNavigateForgot }: Props) {
  const { signIn } = useSignIn();
  const { colors: c } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!signIn) return;
    setLoading(true);
    setError('');
    try {
      const parsed = parseGmail(email);
      if (!parsed.ok) throw new Error(parsed.error);
      const { error: passwordError } = await signIn.password({ identifier: parsed.email, password });
      if (passwordError) throw passwordError;
      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) throw finalizeError;
        return;
      }
      throw new Error('Could not complete sign in. Check your password or use Forgot password.');
    } catch (err: any) {
      setError(clerkAuthError(err, 'This Gmail does not exist or the password is wrong.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}><Text style={styles.logoText}>NS</Text></View>
          <Text style={[styles.title, { color: c.text }]}>Sign in with Gmail</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>
            Only a real Gmail is accepted. If this Gmail is not registered, you will see “This Gmail does not exist.”
          </Text>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <GoogleGmailButton onError={setError} />
            <Text style={[styles.or, { color: c.muted }]}>or use email and password</Text>
            <Input
              label="Gmail"
              value={email}
              onChangeText={setEmail}
              placeholder="you@gmail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureToggle
              autoComplete="password"
            />
            <Button title="Sign in" onPress={submit} loading={loading} disabled={!signIn} />
            <TouchableOpacity onPress={onNavigateForgot} style={styles.linkRow}>
              <Text style={styles.link}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onNavigateRegister} style={styles.linkRow}>
            <Text style={{ color: c.muted }}>New to NexStep? </Text>
            <Text style={styles.link}>Create an account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing['2xl'], gap: Spacing.lg },
  logo: { width: 72, height: 72, borderRadius: Radius['2xl'], backgroundColor: Colors.primary, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold },
  title: { textAlign: 'center', fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold },
  subtitle: { textAlign: 'center', fontSize: FontSize.base, lineHeight: 23 },
  card: { padding: Spacing.xl, borderWidth: 1, borderRadius: Radius['2xl'] },
  error: { color: Colors.danger, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md },
  or: { textAlign: 'center', fontSize: FontSize.xs, marginBottom: Spacing.md },
  linkRow: { flexDirection: 'row', justifyContent: 'center', padding: Spacing.sm },
  link: { color: Colors.primary, fontWeight: FontWeight.bold },
});
