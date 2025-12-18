import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Platform, Pressable } from 'react-native';
import { Text } from 'react-native';
import LottieView from 'lottie-react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { ShabonButton } from '@/components/SUI/ShabonButton';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth';
import { apiClient } from '@/services/api';
import { ShabonBackground } from '@/components/SUI/ShabonBackground';
import { resetHeaderAnimation, prepareHeaderAnimation } from '@/components/app-header';

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

  // ログイン画面がマウントされたらフラグをリセット（イベントは発火しない）
  useEffect(() => {
    prepareHeaderAnimation();
  }, []);

  // 初回ユーザーかどうかを判定して遷移先を決定
  const navigateAfterLogin = async () => {
    // チャット画面のヘッダーアニメーションをリセット（ログイン後に再生させるため）
    resetHeaderAnimation();
    
    try {
      const response = await apiClient.get('/users/me');
      const user = response.data;
      
      // display_name が未設定なら初回登録画面へ
      if (!user.display_name || user.display_name.trim() === '') {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/chat');
      }
    } catch (error) {
      console.error('Failed to check user status:', error);
      // エラー時はとりあえずチャット画面へ
      router.replace('/(tabs)/chat');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await promptAsync();

      if (result?.type === 'success' && result.authentication?.idToken) {
        await authService.signInWithGoogle(result.authentication.idToken);
        await navigateAfterLogin();
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
      await navigateAfterLogin();
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
      await navigateAfterLogin();
    } catch (error: any) {
      if (error.code !== 'ERR_CANCELED') {
        Alert.alert('Appleログインに失敗しました', error.message);
      }
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ShabonBackground />
      
      {/* 上部: ロゴとタイトル */}
      <View style={styles.titleContainer}>
        <LottieView
          source={require('@/assets/animations/logo.json')}
          autoPlay
          loop={false}
          speed={0.3}
          style={styles.logo}
        />
        <Text style={[styles.title, { color: theme.text }]}>Shabon</Text>
        <Text style={[styles.subtitle, { color: theme.icon }]}>AIメイトと会話しよう</Text>
      </View>

      {/* 下部: ログインボタン */}
      <View style={styles.buttonContainer}>
        {/* Apple ログイン（iOS のみ、上に配置） */}
        {Platform.OS === 'ios' && (
          <Pressable onPress={handleAppleLogin} disabled={loading} style={styles.glassButtonWrapper}>
            {isLiquidGlassAvailable() ? (
              <GlassView style={styles.glassButton} isInteractive>
                <Ionicons name="logo-apple" size={22} color={theme.glassText} />
                <Text style={[styles.glassButtonText, { color: theme.glassText }]}>Appleで続行</Text>
              </GlassView>
            ) : (
              <View style={[styles.fallbackButton, { backgroundColor: '#000000' }]}>
                <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
                <Text style={[styles.glassButtonText, { color: '#FFFFFF' }]}>Appleで続行</Text>
              </View>
            )}
          </Pressable>
        )}

        {/* Google ログイン */}
        <Pressable onPress={handleGoogleLogin} disabled={!request || loading} style={styles.glassButtonWrapper}>
          {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
            <GlassView style={styles.glassButton} isInteractive>
              <Ionicons name="logo-google" size={20} color={theme.glassText} />
              <Text style={[styles.glassButtonText, { color: theme.glassText }]}>Googleで続行</Text>
            </GlassView>
          ) : (
            <View style={[styles.fallbackButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
              <Ionicons name="logo-google" size={20} color={theme.glassText} />
              <Text style={[styles.glassButtonText, { color: theme.glassText }]}>Googleで続行</Text>
            </View>
          )}
        </Pressable>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.tint} />
          </View>
        )}

        {/* テストユーザーログイン（TestFlight用） */}
        <Pressable onPress={handleTestLogin} disabled={testLoginLoading} style={[styles.glassButtonWrapper, { marginTop: 24 }]}>
          {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
            <GlassView style={styles.glassButton} isInteractive>
              <Ionicons name="person-outline" size={20} color={theme.glassText} />
              <Text style={[styles.glassButtonText, { color: theme.glassText, fontSize: 14 }]}>テストユーザー</Text>
            </GlassView>
          ) : (
            <View style={[styles.fallbackButton, { backgroundColor: 'rgba(128,128,128,0.3)' }]}>
              <Ionicons name="person-outline" size={20} color={theme.text} />
              <Text style={[styles.glassButtonText, { color: theme.text, fontSize: 14 }]}>テストユーザー</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 80,
    alignItems: 'center',
  },
  glassButtonWrapper: {
    width: 280,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 16,
  },
  glassButton: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  fallbackButton: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  glassButtonText: {
    fontSize: 17,
    fontWeight: '600',
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
