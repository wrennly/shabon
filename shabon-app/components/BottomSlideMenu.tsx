import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Pressable, Animated, Modal } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';

export interface MenuAction {
  title: string;
  onPress: () => void;
  isDestructive?: boolean;
  icon?: React.ReactNode;
}

interface BottomSlideMenuProps {
  visible: boolean;
  onClose: () => void;
  actions: MenuAction[];
}

export function BottomSlideMenu({ visible, onClose, actions }: BottomSlideMenuProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  // アニメーション用
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current; // 下から300px下に隠れている

  useEffect(() => {
    if (visible) {
      // 開くアニメーション
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // 閉じるアニメーション
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View 
          style={[
            styles.menuContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {Platform.OS === 'ios' ? (
              <View style={[
                styles.menuBlurWrapper,
                { 
                  borderWidth: 1,
                  borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)'
                }
              ]}>
                <BlurView 
                  intensity={80} 
                  tint={colorScheme === 'dark' ? 'dark' : 'light'}
                  style={styles.menuBlur}
                >
                  <View style={[
                    styles.menuContent,
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
                          setTimeout(() => action.onPress(), 200);
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
                styles.menu, 
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
                      { color: action.isDestructive ? '#FF3B30' : theme.text }
                    ]}>
                      {action.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  menu: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuBlurWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuContent: {
    paddingVertical: 4,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemGlass: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 17,
    fontWeight: '500',
  },
});

