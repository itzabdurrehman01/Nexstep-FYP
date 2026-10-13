/**
 * mobile/App.tsx
 * Root entry point for NexStep React Native app.
 *
 * ARCHITECTURE:
 *   AuthProvider wraps everything. AuthNavigator shown when unauthenticated,
 *   MainNavigator shown when authenticated. Loading spinner while restoring session.
 *
 * NO WEBVIEW IS USED. All screens are native React Native components.
 */
import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator, Pressable, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AuthNavigator, MainNavigator } from './src/navigation';
import { Colors } from './src/utils/theme';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function RootRouter() {
  const { authStatus, authError, refreshUser, logout } = useAuth();
  const { dark, colors: c } = useTheme();

  if (authStatus === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (authStatus === 'error') {
    return (
      <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <Text style={{ color: c.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
          We couldn't load your NexStep account
        </Text>
        <Text style={{ color: c.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 }}>
          {authError ?? 'Check your connection and try again.'}
        </Text>
        <Pressable
          onPress={() => void refreshUser()}
          style={{ backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13, marginTop: 24 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Try again</Text>
        </Pressable>
        <Pressable onPress={() => void logout()} style={{ paddingHorizontal: 28, paddingVertical: 13, marginTop: 8 }}>
          <Text style={{ color: c.muted, fontWeight: '600' }}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return authStatus === 'authenticated'
    ? <MainNavigator />
    : <AuthNavigator />;
}

export default function App() {
  if (!clerkPublishableKey) throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured.');
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache} telemetry={false}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <RootRouter />
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ClerkProvider>
  );
}
