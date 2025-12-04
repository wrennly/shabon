import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAssets } from 'expo-asset';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Initialize Sentry (only on native platforms - iOS/Android)
// Web monitoring is handled separately to avoid SSR/dependency conflicts
const sentryDsn = Constants.expoConfig?.extra?.sentryDsn || process.env.EXPO_PUBLIC_SENTRY_DSN;
const environment = Constants.expoConfig?.extra?.environment || process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';

if (sentryDsn && Platform.OS !== 'web') {
  Sentry.init({
    dsn: sentryDsn,
    environment,
    debug: environment === 'development',
  });
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // WebではSkiaをロードしないため、常にtrueとして扱う（Skiaコンポーネント側でWeb判定して無効化する）
  const [skiaLoaded, setSkiaLoaded] = useState(true);
  const [assets] = useAssets([require('@/assets/images/logo.png')]);

  /*
  useEffect(() => {
    if (Platform.OS === 'web') {
      import('@shopify/react-native-skia/lib/module/web').then((module) => {
        module.LoadSkiaWeb({ locateFile: () => '/canvaskit.wasm' })
          .then(() => {
            console.log('Skia Web loaded successfully');
            setSkiaLoaded(true);
          })
          .catch((err) => {
            console.error('Failed to load Skia Web:', err);
            // Optionally set an error state here to show a fallback UI
          });
      });
    }
  }, []);
  */

  if (!skiaLoaded || !assets) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading...</Text></View>;
  }

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const transparentTheme = {
    ...theme,
    colors: {
      ...theme.colors,
      background: 'transparent',
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient
        colors={colorScheme === 'dark' ? ['#1a1a2e', '#16213e'] : ['#D0E8F2', '#D9D2E9']}
        style={StyleSheet.absoluteFill}
      />
      <ThemeProvider value={transparentTheme}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: 'transparent' } }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="feedback" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[mateId]" options={{ headerShown: false }} />
          <Stack.Screen name="mate-editor/[mateId]" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}


