import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, IconButton, Menu, Divider, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { authService } from '@/services/api';
import { analytics, AnalyticsEvents } from '@/services/analytics';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function AppHeader({ title, subtitle, children }: AppHeaderProps) {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuPress = (action: () => void) => {
    setMenuVisible(false);
    action();
  };

  const handleLogout = async () => {
    analytics.logEvent(AnalyticsEvents.LOGOUT);
    await authService.logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline }]}>
      <View style={styles.headerContent}>
        <View style={styles.leftSpacer} />
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/logo_chatcraft_app.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="titleLarge" style={styles.appName}>
            ChatCraft
          </Text>
        </View>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="menu"
              size={24}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item 
            onPress={() => handleMenuPress(() => router.push('/(tabs)/mates'))} 
            title="マイメイト" 
            leadingIcon="account-group" 
          />
          <Menu.Item 
            onPress={() => handleMenuPress(() => router.push('/profile'))} 
            title="プロフィール" 
            leadingIcon="account" 
          />
          <Menu.Item 
            onPress={() => handleMenuPress(() => router.push('/feedback'))} 
            title="フィードバック" 
            leadingIcon="message-text" 
          />
          <Divider />
          <Menu.Item 
            onPress={() => handleMenuPress(handleLogout)} 
            title="ログアウト" 
            leadingIcon="logout" 
          />
        </Menu>
      </View>
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
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 4,
  },
});
