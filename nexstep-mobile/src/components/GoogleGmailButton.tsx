import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSSO } from '@clerk/expo/experimental';
import { clerkAuthError } from '../auth/accountRules';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../utils/theme';

WebBrowser.maybeCompleteAuthSession();

export function GoogleGmailButton({ label = 'Continue with Gmail', onError }: { label?: string; onError?: (message: string) => void }) {
  const { startSSOFlow } = useSSO();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);

  const onPress = async () => {
    setBusy(true);
    try {
      const { createdSessionId, signIn, signUp } = await startSSOFlow({
        strategy: 'oauth_google',
        oidcPrompt: 'select_account',
      });
      if (createdSessionId) return;
      if (signIn?.status === 'complete') {
        const { error } = await signIn.finalize();
        if (error) throw error;
        return;
      }
      if (signUp?.status === 'complete') {
        const { error } = await signUp.finalize();
        if (error) throw error;
        return;
      }
      throw new Error('Gmail sign-in did not finish. Enable Google in the Clerk dashboard and try again.');
    } catch (err: any) {
      onError?.(clerkAuthError(err, 'Could not continue with Gmail. Enable Google in the Clerk dashboard, then try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={busy} style={[styles.btn, { opacity: busy ? 0.6 : 1 }]} accessibilityRole="button">
      {busy ? <ActivityIndicator color={Colors.primary} /> : (
        <View style={styles.row}>
          <View style={styles.mark}><Text style={styles.g}>G</Text></View>
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#DADCE0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  mark: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  g: { color: '#4285F4', fontWeight: FontWeight.extrabold, fontSize: FontSize.base },
  label: { color: '#3C4043', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
});
