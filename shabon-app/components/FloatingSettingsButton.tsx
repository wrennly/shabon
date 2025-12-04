import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { router } from 'expo-router';
import { authService } from '@/services/api';
import { analytics, AnalyticsEvents } from '@/services/analytics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export function FloatingSettingsButton() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();

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
    <>
      <TouchableOpacity 
        onPress={() => setMenuVisible(!menuVisible)} 
        style={[styles.button, { top: insets.top + 10 }]}
        activeOpacity={0.8}
      >
        <View
            style={[
                styles.blurContainer,
                { 
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' 
                }
            ]}
        >
             <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} style={{ marginLeft: 1, marginTop: 1 }} />
        </View>
      </TouchableOpacity>
      
      {menuVisible && (
        <>
            <TouchableOpacity 
                style={styles.overlay} 
                activeOpacity={1} 
                onPress={() => setMenuVisible(false)} 
            />
            <View style={[
                styles.popover, 
                { 
                    top: insets.top + 60, 
                    backgroundColor: theme.card,
                    borderColor: theme.border
                }
            ]}>
                {menuActions.filter(a => !a.isCancel).map((action, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.menuItem, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
                        onPress={() => {
                            setMenuVisible(false);
                            action.onPress();
                        }}
                    >
                        <Text style={[
                            styles.menuText, 
                            { color: theme.text },
                            action.isDestructive && { color: '#FF3B30' }
                        ]}>
                            {action.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
    borderRadius: 20,
    // Removed shadows
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any
    })
  },
  blurContainer: {
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    borderWidth: 1,
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden',
    padding: 0,
  },
  overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99,
  },
  popover: {
      position: 'absolute',
      right: 16,
      width: 200,
      borderRadius: 12,
      borderWidth: 1,
      zIndex: 101,
      shadowColor: "#000",
      shadowOffset: {
          width: 0,
          height: 4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
      overflow: 'hidden',
  },
  menuItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
  },
  menuText: {
      fontSize: 16,
  }
});
