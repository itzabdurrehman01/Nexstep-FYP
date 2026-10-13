import React, { useState } from 'react';
import { View } from 'react-native';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

export function AuthNavigator() {
  const [screen, setScreen] = useState<'login' | 'register' | 'forgot'>('login');
  return (
    <View style={{ flex: 1 }}>
      {screen === 'register' ? (
        <RegisterScreen onNavigateLogin={() => setScreen('login')} />
      ) : screen === 'forgot' ? (
        <ForgotPasswordScreen onNavigateLogin={() => setScreen('login')} />
      ) : (
        <LoginScreen
          onNavigateRegister={() => setScreen('register')}
          onNavigateForgot={() => setScreen('forgot')}
        />
      )}
    </View>
  );
}
