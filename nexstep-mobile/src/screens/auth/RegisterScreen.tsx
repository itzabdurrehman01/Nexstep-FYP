import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSignIn, useSignUp } from '@clerk/expo';
import { checkGmail } from '../../api/auth';
import { clerkAuthError, parseGmail, passwordProblem } from '../../auth/accountRules';
import { completePasswordSignUp } from '../../auth/completePasswordSignUp';
import { PasswordRules } from '../../auth/PasswordRules';
import { Button } from '../../components/Button';
import { GoogleGmailButton } from '../../components/GoogleGmailButton';
import { Input } from '../../components/Input';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

export function RegisterScreen({ onNavigateLogin }: { onNavigateLogin: () => void }) {
  const { signUp } = useSignUp();
  const { signIn } = useSignIn();
  const { colors: c } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submitForm = async () => {
    if (!signUp) return;
    const parsed = parseGmail(email);
    if (!parsed.ok) { setError(parsed.error); return; }
    if (!firstName.trim()) { setError('Enter your first name.'); return; }
    const problem = passwordProblem(password);
    if (problem) { setError(problem); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const checked = await checkGmail(parsed.email, 'signup');
      if (!checked.ok) throw new Error(checked.error);
      const result = await completePasswordSignUp(signUp, signIn, {
        email: checked.email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (result.next === 'done') return;
      setStep('otp');
      setInfo(`We sent a 6-digit OTP to ${checked.email}. If this Gmail does not exist, you will not receive a code.`);
    } catch (err: any) {
      setError(clerkAuthError(err, 'Could not create the account. Use a real Gmail and a password of 15 characters or more.'));
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async () => {
    if (!signUp) return;
    setLoading(true);
    setError('');
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verifyError) throw verifyError;
      if (signUp.status === 'complete') {
        const { error: finalizeError } = await signUp.finalize();
        if (finalizeError) throw finalizeError;
        return;
      }
      if (signUp.missingFields?.length) {
        throw new Error(`Add the missing details to finish: ${signUp.missingFields.join(', ').replace(/_/g, ' ')}.`);
      }
      throw new Error('Invalid OTP. Check the code in your Gmail inbox.');
    } catch (err: any) {
      setError(clerkAuthError(err, 'Invalid OTP. Check the code in your Gmail inbox.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}><Text style={styles.logoText}>NS</Text></View>
          <Text style={[styles.title, { color: c.text }]}>{step === 'otp' ? 'Verify Gmail OTP' : 'Create account'}</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>
            Use your Gmail only. Fake or non-Gmail addresses are rejected. We send an OTP after the address is checked.
          </Text>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {info && !error ? <Text style={styles.info}>{info}</Text> : null}

            {step === 'form' ? (
              <>
                <GoogleGmailButton label="Continue with Gmail" onError={setError} />
                <Text style={[styles.or, { color: c.muted }]}>or create with email</Text>
                <Input label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
                <Input label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
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
                  placeholder="Create a password"
                  secureToggle
                  autoComplete="new-password"
                />
                <PasswordRules password={password} />
                <Input
                  label="Confirm password"
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repeat password"
                  secureToggle
                  autoComplete="new-password"
                />
                <Button title="Verify Gmail and send OTP" onPress={submitForm} loading={loading} disabled={!signUp} />
              </>
            ) : (
              <>
                <Input
                  label="OTP from Gmail"
                  value={code}
                  onChangeText={setCode}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                />
                <Button title="Verify OTP and create account" onPress={submitOtp} loading={loading} disabled={!signUp} />
                <TouchableOpacity onPress={() => { setStep('form'); setError(''); }} style={styles.linkRow}>
                  <Text style={styles.link}>Use a different Gmail</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <TouchableOpacity onPress={onNavigateLogin} style={styles.linkRow}>
            <Text style={{ color: c.muted }}>Already registered? </Text>
            <Text style={styles.link}>Sign in</Text>
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
  info: { color: '#047857', fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md },
  or: { textAlign: 'center', fontSize: FontSize.xs, marginBottom: Spacing.md },
  linkRow: { flexDirection: 'row', justifyContent: 'center', padding: Spacing.sm },
  link: { color: Colors.primary, fontWeight: FontWeight.bold },
});
