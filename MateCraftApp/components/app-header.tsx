import React, { useState } from 'react';
import { View, StyleSheet, Image, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/api';
import { analytics, AnalyticsEvents } from '@/services/analytics';
import { CupertinoActionSheet } from '@/components/ui/CupertinoActionSheet';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function AppHeader({ title, subtitle, children }: AppHeaderProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = async () => {
    analytics.logEvent(AnalyticsEvents.LOGOUT);
    await authService.logout();
    router.replace('/login');
  };

  const menuActions = [
    { title: 'マイメイト', onPress: () => router.push('/(tabs)/chat') },
    { title: 'プロフィール', onPress: () => router.push('/profile') },
    { title: 'フィードバック', onPress: () => router.push('/feedback') },
    { title: 'ログアウト', onPress: handleLogout, isDestructive: true },
    { title: 'キャンセル', onPress: () => {}, isCancel: true },
  ];

  return (
    <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      <View style={styles.headerContent}>
        <View style={styles.leftSpacer} />
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.appName, { color: theme.text }]}>
            MateCraft
          </Text>
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      
      <CupertinoActionSheet
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        actions={menuActions}
      />
      
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSpacer: {
    width: 48,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  appName: {
    fontWeight: 'bold',
    fontSize: 17,
  },
  menuButton: {
    width: 48,
    alignItems: 'flex-end',
  },
});
