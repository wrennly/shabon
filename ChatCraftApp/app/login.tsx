import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import { apiClient, authService } from '@/services/api';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
        // Navigate to home/mate list
        router.replace('/(tabs)');
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
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'アカウント作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          ChatCraft
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          AIキャラクターとチャット
        </Text>

        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="ユーザー名"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              autoCapitalize="none"
              disabled={isLoading}
              style={styles.input}
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
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
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
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 12,
  },
});
