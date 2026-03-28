import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Pressable, Animated } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';

export interface MenuAction {
  title: string;
  onPress: () => void;
  isDestructive?: boolean;
  icon?: React.ReactNode;
}

interface TopRightMenuProps {
  visible: boolean;
  onClose: () => void;
  actions: MenuAction[];
  buttonTop?: number; // ボタンの位置（top）
  buttonRight?: number; // ボタンの位置（right）
}

export function TopRightMenu({ 
  visible, 
  onClose, 
  actions,
  buttonTop = 60,
  buttonRight = 16,
}: TopRightMenuProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  // アニメーション用
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 初期値にリセット
      fadeAnim.setValue(0);
      scaleAnim.setValue(0);
      
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
    } else {
      // まず文字を消す
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        // その後、ボタンにふんわり戻る
        Animated.spring(scaleAnim, {
          toValue: 0,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose} 
      />
      <Animated.View 
        style={[
          styles.popoverAnimContainer,
          { 
            top: buttonTop,
            right: buttonRight,
            transform: [
              { scale: scaleAnim },
              // 右上（ボタン）から出て、戻る時は吸い込まれる
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
            <View style={[
              styles.popoverBlurWrapper,
              { 
                borderWidth: 1,
                borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)'
              }
            ]}>
              <BlurView 
                intensity={80} 
                tint={colorScheme === 'dark' ? 'dark' : 'light'}
                style={styles.popoverBlur}
              >
                <View style={[
                  styles.popoverBlurContent,
                  { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)' }
                ]}>
                  {actions.map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.menuItemGlass, 
                        index > 0 && { 
                          borderTopWidth: StyleSheet.hairlineWidth, 
                          borderTopColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' 
                        }
                      ]}
                      onPress={() => {
                        onClose();
                        setTimeout(() => action.onPress(), 250);
                      }}
                    >
                      {action.icon && <View style={styles.menuIcon}>{action.icon}</View>}
                      <Text style={[
                        styles.menuText, 
                        { color: action.isDestructive ? '#FF3B30' : theme.glassText }
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
              {actions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem, 
                    index > 0 && { 
                      borderTopWidth: StyleSheet.hairlineWidth, 
                      borderTopColor: theme.border 
                    }
                  ]}
                  onPress={() => {
                    onClose();
                    setTimeout(() => action.onPress(), 200);
                  }}
                >
                  {action.icon && <View style={styles.menuIcon}>{action.icon}</View>}
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
  );
}

const styles = StyleSheet.create({
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
    zIndex: 101,
  },
  popover: {
    width: 240,
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
    width: 240,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  popoverBlur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  popoverBlurContent: {
    paddingVertical: 8,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemGlass: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
  },
});

