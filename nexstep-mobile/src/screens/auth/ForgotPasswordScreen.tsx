import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSignIn } from '@clerk/expo';
import { checkGmail } from '../../api/auth';
import { clerkAuthError, passwordProblem } from '../../auth/accountRules';
import { PasswordRules } from '../../auth/PasswordRules';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

export function ForgotPasswordScreen({ onNavigateLogin }: { onNavigateLogin: () => void }) {
  const { signIn } = useSignIn();
  const { colors: c } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submitEmail = async () => {
    if (!signIn) return;
    setLoading(true);
    setError('');
    try {
      const checked = await checkGmail(email, 'forgot');
      if (!checked.ok) throw new Error(checked.error);
      const { error: createError } = await signIn.create({ identifier: checked.email });
      if (createError) throw createError;
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) throw sendError;
      setStep('otp');
      setInfo(`We sent a password-reset OTP to ${checked.email}.`);
    } catch (err: any) {
      setError(clerkAuthError(err, 'This Gmail does not exist.'));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (!signIn) return;
    const problem = passwordProblem(password);
    if (problem) { setError(problem); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verifyError) throw verifyError;
      const { error: resetError } = await signIn.resetPasswordEmailCode.submitPassword({ password });
      if (resetError) throw resetError;
      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) throw finalizeError;
        return;
      }
      setInfo('Password updated. Sign in with your new password.');
      setStep('form');
      setPassword('');
      setConfirm('');
      setCode('');
      onNavigateLogin();
    } catch (err: any) {
      setError(clerkAuthError(err, 'Could not reset the password. Check the OTP and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}><Text style={styles.logoText}>NS</Text></View>
          <Text style={[styles.title, { color: c.text }]}>{step === 'otp' ? 'Set a new password' : 'Forgot password'}</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>
            Enter the Gmail you registered with. If it is not on NexStep, you will see “This Gmail does not exist.”
          </Text>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {info && !error ? <Text style={styles.info}>{info}</Text> : null}

            {step === 'form' ? (
              <>
                <Input
                  label="Registered Gmail"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@gmail.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
                <Button title="Send reset OTP" onPress={submitEmail} loading={loading} disabled={!signIn} />
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
                <Input
                  label="New password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  secureToggle
                  autoComplete="new-password"
                />
                <PasswordRules password={password} />
                <Input
                  label="Confirm new password"
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repeat password"
                  secureToggle
                  autoComplete="new-password"
                />
                <Button title="Update password" onPress={submitReset} loading={loading} disabled={!signIn} />
              </>
            )}
          </View>
          <TouchableOpacity onPress={onNavigateLogin} style={styles.linkRow}>
            <Text style={{ color: c.muted }}>Remembered it? </Text>
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
  linkRow: { flexDirection: 'row', justifyContent: 'center', padding: Spacing.sm },
  link: { color: Colors.primary, fontWeight: FontWeight.bold },
});
