import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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
  
  const paperTheme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  );
}
