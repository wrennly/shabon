import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, Text } from 'react-native';
import { apiClient, authService } from '@/services/api';
import { router } from 'expo-router';
import { analytics, AnalyticsEvents } from '@/services/analytics';
import { useGoogleAuth, exchangeCodeForToken, promptGoogleLoginWeb } from '@/services/google-auth';
import * as AuthSession from 'expo-auth-session';
import { ShabonButton, ShabonInput, ShabonCard } from '@/components/SUI';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { request, response, promptAsync } = useGoogleAuth();

  useEffect(() => {
    analytics.logScreenView('Login');
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      
      if (code) {
        handleGoogleCode(code);
      }
    } else if (response?.type === 'error') {
      setError('Google認証に失敗しました');
    }
  }, [response]);

  const handleLogin = async () => {
    if (!username.trim()) {
      setError('ユーザー名を入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simple login (ID only)
      const response = await apiClient.post('/login', { username });
      
      if (response.data) {
        await authService.login(username);
        analytics.logEvent(AnalyticsEvents.LOGIN, { method: 'username' });
        analytics.setUserId(username);
        // Navigate to home/mate list
        router.replace('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim()) {
      setError('ユーザー名を入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/register', { username });
      
      if (response.data) {
        await authService.login(username);
        router.replace('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'アカウント作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCode = async (code: string) => {
    setIsLoading(true);
    setError('');

    try {
      const tokenResult = await exchangeCodeForToken(code);
      
      if (tokenResult.idToken) {
        const response = await authService.loginWithGoogle(tokenResult.idToken);
        analytics.logEvent(AnalyticsEvents.LOGIN, { method: 'google' });
        analytics.setUserId(response.username);
        router.replace('/');
      } else {
        setError(tokenResult.error || 'トークン取得に失敗しました');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.response?.data?.detail || 'Googleログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    
    try {
      if (Platform.OS === 'web') {
        // Web版: WebBrowserを使用
        setIsLoading(true);
        const result = await promptGoogleLoginWeb();
        
        if (result.idToken) {
          const response = await authService.loginWithGoogle(result.idToken);
          analytics.logEvent(AnalyticsEvents.LOGIN, { method: 'google' });
          analytics.setUserId(response.username);
          router.replace('/');
        } else {
          setError(result.error || 'Googleログインに失敗しました');
        }
        setIsLoading(false);
      } else {
        // モバイル版: AuthSessionを使用
        if (request) {
          await promptAsync();
        }
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError('Googleログインに失敗しました');
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.text }]}>
            MateCraft
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.text }]}>
          AIキャラクターとチャット
        </Text>

        <ShabonCard style={styles.card}>
            <ShabonButton
              title="Googleでログイン"
              onPress={handleGoogleLogin}
              variant="secondary"
              style={styles.googleButton}
              // icon="google" // アイコンは別途対応が必要だが一旦テキストのみ
            />

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={[styles.dividerText, { color: theme.text }]}>または</Text>
              <View style={styles.divider} />
            </View>

            <ShabonInput
              label="ユーザー名"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              // disabled={isLoading} // ShabonInput does not have disabled prop in interface but TextInputProps has editable
              editable={!isLoading}
              style={styles.input}
            />
            {error ? (
              <Text style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            <ShabonButton
              title="ログイン"
              onPress={handleLogin}
              style={styles.button}
            />

            <ShabonButton
              title="新規登録"
              onPress={handleRegister}
              variant="outline"
              style={styles.button}
            />
        </ShabonCard>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 32, // headlineLarge equivalent
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
    fontSize: 16, // bodyLarge equivalent
  },
  card: {
    padding: 24,
  },
  googleButton: {
    marginBottom: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA', // iOS separator color
  },
  dividerText: {
    marginHorizontal: 16,
    opacity: 0.6,
    fontSize: 12,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 12,
  },
  errorText: {
    color: '#FF3B30', // iOS Red
    marginBottom: 12,
    textAlign: 'center',
  },
});
