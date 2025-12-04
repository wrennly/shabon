import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';

import { ShabonButton } from '@/components/SUI/ShabonButton';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({
  scheme: 'shabon',
  path: 'auth'
});

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [loading, setLoading] = useState(false);
  const [testLoginLoading, setTestLoginLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
  });

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await promptAsync();

      if (result?.type === 'success' && result.authentication?.idToken) {
        await authService.signInWithGoogle(result.authentication.idToken);
        router.replace('/(tabs)/chat');
      } else {
        setLoading(false);
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Googleログインに失敗しました', error.message);
    }
  };

  const handleTestLogin = async () => {
    const email = process.env.EXPO_PUBLIC_TEST_USER_EMAIL;
    const password = process.env.EXPO_PUBLIC_TEST_USER_PASSWORD;

    if (!email || !password) {
      Alert.alert('テストユーザー情報が不足しています', 'EXPO_PUBLIC_TEST_USER_EMAIL / PASSWORD を設定してください');
      return;
    }

    try {
      setTestLoginLoading(true);
      await authService.signInWithPassword(email, password);
      router.replace('/(tabs)/chat');
    } catch (error: any) {
      Alert.alert('テストログインに失敗しました', error.message || 'Unknown error');
    } finally {
      setTestLoginLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Sign-In は iOS でのみ利用できます');
      return;
    }

    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('Apple認証に失敗しました');
      }

      await authService.signInWithApple(credential.identityToken, credential.authorizationCode ?? '');
      router.replace('/(tabs)/chat');
    } catch (error: any) {
      if (error.code !== 'ERR_CANCELED') {
        Alert.alert('Appleログインに失敗しました', error.message);
      }
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={styles.innerContainer}>
        <Text style={[styles.title, { color: theme.text }]}>Shabonへようこそ</Text>
        <Text style={[styles.subtitle, { color: theme.icon }]}>Google または Apple でログイン</Text>

        <ShabonButton
          title="Googleで続行"
          onPress={handleGoogleLogin}
          disabled={!request || loading}
          loading={loading}
          variant="primary"
          width={260}
          height={52}
          borderRadius={26}
          icon={<Ionicons name="logo-google" size={20} color={theme.text} />}
        />

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={
              colorScheme === 'dark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={26}
            style={{ width: 260, height: 52, marginTop: 16 }}
            onPress={handleAppleLogin}
          />
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.tint} />
          </View>
        )}

        <ShabonButton
          title="テストユーザーでログイン"
          onPress={handleTestLogin}
          disabled={testLoginLoading}
          loading={testLoginLoading}
          variant="secondary"
          width={260}
          height={48}
          borderRadius={24}
          style={{ marginTop: 32 }}
          textStyle={{ color: theme.text }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});
