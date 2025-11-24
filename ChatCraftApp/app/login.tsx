import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { TextInput, Button, Text, Card, useTheme } from 'react-native-paper';
import { apiClient, authService } from '@/services/api';
import { router } from 'expo-router';
import { analytics, AnalyticsEvents } from '@/services/analytics';
import { useGoogleAuth, exchangeCodeForToken, promptGoogleLoginWeb } from '@/services/google-auth';
import * as AuthSession from 'expo-auth-session';

export default function LoginScreen() {
  const theme = useTheme();
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
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/logo_chatcraft_app.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="headlineLarge" style={styles.title}>
            ChatCraft
          </Text>
        </View>
        <Text variant="bodyLarge" style={styles.subtitle}>
          AIキャラクターとチャット
        </Text>

        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="contained"
              onPress={handleGoogleLogin}
              disabled={isLoading || !request}
              style={styles.googleButton}
              icon="google"
            >
              Googleでログイン
            </Button>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text variant="bodySmall" style={styles.dividerText}>または</Text>
              <View style={styles.divider} />
            </View>

            <TextInput
              label="ユーザー名"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              autoCapitalize="none"
              disabled={isLoading}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />

            {error ? (
              <Text variant="bodyMedium" style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.button}
            >
              ログイン
            </Button>

            <Button
              mode="outlined"
              onPress={handleRegister}
              disabled={isLoading}
              style={styles.button}
            >
              新規登録
            </Button>
          </Card.Content>
        </Card>
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
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  card: {
    padding: 16,
  },
  googleButton: {
    marginBottom: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    opacity: 0.6,
  },
  input: {
    marginBottom: 16,
  },
  inputOutline: {
    borderRadius: 12,
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 12,
  },
});
