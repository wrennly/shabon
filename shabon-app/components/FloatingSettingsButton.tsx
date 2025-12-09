import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Pressable, Animated, Linking } from 'react-native';
import { router } from 'expo-router';
import { authService } from '@/services/api';
import { analytics, AnalyticsEvents } from '@/services/analytics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';

export function FloatingSettingsButton() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();
  
  // アニメーション用
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  
  const openMenu = () => {
    // 初期値にリセット
    fadeAnim.setValue(0);
    scaleAnim.setValue(0);
    setMenuVisible(true);
    
    // ふんわりニョキっと開く
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  const closeMenu = () => {
    // まず文字を消す
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // その後、設定ボタンにふんわり戻る（開く時と同じスピード感）
      Animated.spring(scaleAnim, {
        toValue: 0,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }).start(() => {
        setMenuVisible(false);
      });
    });
  };

  const handleLogout = async () => {
    analytics.logEvent(AnalyticsEvents.LOGOUT);
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Logout error (ignored):', error);
    }
    router.replace('/login');
  };

  const handleFeedback = () => {
    const feedbackUrl = Constants.expoConfig?.extra?.feedbackFormUrl || 'https://forms.gle/bWYV5a5iGiqabK289';
    Linking.openURL(feedbackUrl);
  };

  const menuActions = [
    { title: 'マイメイト', onPress: () => router.push('/(tabs)/chat') },
    { title: 'プロフィール', onPress: () => router.push('/profile') },
    { title: 'フィードバック', onPress: handleFeedback },
    { title: 'ログアウト', onPress: handleLogout, isDestructive: true },
    { title: 'キャンセル', onPress: () => {}, isCancel: true },
  ];

  return (
    <>
      <Pressable 
        onPress={() => menuVisible ? closeMenu() : openMenu()} 
        style={[styles.button, { top: insets.top + 10 }]}
      >
        {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
          <GlassView style={styles.glassContainer} isInteractive>
            <Ionicons name="ellipsis-horizontal" size={24} color="#000000" />
          </GlassView>
        ) : (
          <View
            style={[
              styles.blurContainer,
              { 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' 
              }
            ]}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
          </View>
        )}
      </Pressable>
      
      {menuVisible && (
        <>
          <TouchableOpacity 
            style={styles.overlay} 
            activeOpacity={1} 
            onPress={closeMenu} 
          />
          <Animated.View 
            style={[
              styles.popoverAnimContainer,
              { 
                top: insets.top + 60,
                transform: [
                  { scale: scaleAnim },
                  // 右上（設定ボタン）から出て、戻る時は吸い込まれる
                  { translateX: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [80, 0],
                  })},
                  { translateY: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-40, 0],
                  })},
                ],
              }
            ]}
          >
          {/* 文字のフェード用ラッパー */}
          <Animated.View style={{ opacity: fadeAnim }}>
            {Platform.OS === 'ios' ? (
              <View style={styles.popoverBlurWrapper}>
                <BlurView 
                  intensity={80} 
                  tint="light"
                  style={styles.popoverBlur}
                >
                  <View style={styles.popoverBlurContent}>
                    {/* 左上のハイライト */}
                    <View style={styles.highlightTopLeft} />
                    {/* 右下のハイライト */}
                    <View style={styles.highlightBottomRight} />
                    {menuActions.filter(a => !a.isCancel).map((action, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.menuItemGlass, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)' }]}
                        onPress={() => {
                          closeMenu();
                          setTimeout(() => action.onPress(), 250);
                        }}
                      >
                        <Text style={[
                          styles.menuText, 
                          { color: '#000000' },
                          action.isDestructive && { color: '#FF3B30' }
                        ]}>
                          {action.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </BlurView>
              </View>
            ) : (
              <View style={[
                styles.popover, 
                { 
                  backgroundColor: theme.card,
                  borderColor: theme.border
                }
              ]}>
                {menuActions.filter(a => !a.isCancel).map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.menuItem, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
                    onPress={() => {
                      closeMenu();
                      setTimeout(() => action.onPress(), 200);
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
            )}
          </Animated.View>
          </Animated.View>
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
    overflow: 'hidden',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any
    })
  },
  glassContainer: {
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
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
  popoverAnimContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 101,
  },
  popover: {
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
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
  popoverBlurWrapper: {
    width: 200,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    // 薄い枠線
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  popoverBlur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  popoverBlurContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 8,
    position: 'relative',
  },
  highlightTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 100,
    height: 50,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  highlightBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 80,
    height: 40,
    backgroundColor: 'transparent',
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemGlass: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuText: {
    fontSize: 16,
  }
});
