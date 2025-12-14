import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShabonButton } from './ShabonButton';
import { Colors } from '@/constants/theme';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TabItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

interface ShabonTabButtonsProps {
  tabs?: TabItem[];
  onTabPress?: (key: string) => void;
  activeTab?: string;
}

const DEFAULT_TABS: TabItem[] = [
  { key: 'chat', icon: 'chatbubbles', label: 'Chat' },
  { key: 'craft', icon: 'sparkles', label: 'Craft' },
  { key: 'explore', icon: 'search', label: 'Search' },
];

const ACTIVE_COLOR_LIGHT = '#007AFF'; // Blue (ライトモード)
const ACTIVE_COLOR_DARK = '#5AC8FA';   // Soft Cyan Blue (ダークモード - 優しい青)
const INACTIVE_COLOR_LIGHT = '#607D8B'; // Material Blue Grey 500
const INACTIVE_COLOR_DARK = '#9BA1A6';  // 優しいグレー (ダークモード)

const TabButtonWrapper = ({ 
  tab, 
  isActive, 
  onPress, 
  isDark, 
  theme 
}: { 
  tab: TabItem, 
  isActive: boolean, 
  onPress: (key: string) => void, 
  isDark: boolean, 
  theme: any 
}) => {
    // iOS 26+ Liquid Glass または BlurView フォールバック
    const useGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

    return (
        <View style={styles.buttonContainer}>
            {useGlass ? (
                <GlassView
                    style={styles.glassCircle}
                    isInteractive={true}
                >
                    <ShabonButton
                        size={70}
                        onPress={() => onPress(tab.key)}
                        icon={
                            <Ionicons 
                                name={isActive ? tab.icon : `${tab.icon}-outline` as keyof typeof Ionicons.glyphMap} 
                                size={28} 
                                color={isActive ? (isDark ? ACTIVE_COLOR_DARK : ACTIVE_COLOR_LIGHT) : (isDark ? INACTIVE_COLOR_DARK : INACTIVE_COLOR_LIGHT)} 
                            />
                        }
                        variant={isActive ? 'primary' : 'secondary'}
                        // Only show rainbow on active tab
                        rainbowStrength={isActive ? 2.0 : 0.0}
                        style={{ 
                            backgroundColor: 'transparent',
                        }}
                        containerStyle={{
                            shadowOpacity: 0,
                            elevation: 0,
                            backgroundColor: 'transparent',
                        }}
                    />
                </GlassView>
            ) : (
                <BlurView
                    intensity={Platform.OS === 'ios' ? 20 : 10}
                    tint={isDark ? 'dark' : 'light'}
                    style={styles.blurCircle}
                >
                    <ShabonButton
                        size={70}
                        onPress={() => onPress(tab.key)}
                        icon={
                            <Ionicons 
                                name={isActive ? tab.icon : `${tab.icon}-outline` as keyof typeof Ionicons.glyphMap} 
                                size={28} 
                                color={isActive ? (isDark ? ACTIVE_COLOR_DARK : ACTIVE_COLOR_LIGHT) : (isDark ? INACTIVE_COLOR_DARK : INACTIVE_COLOR_LIGHT)} 
                            />
                        }
                        variant={isActive ? 'primary' : 'secondary'}
                        // Only show rainbow on active tab
                        rainbowStrength={isActive ? 2.0 : 0.0}
                        style={{ 
                            backgroundColor: 'transparent',
                        }}
                        containerStyle={{
                            shadowOpacity: 0,
                            elevation: 0,
                            backgroundColor: 'transparent',
                        }}
                    />
                </BlurView>
            )}
        </View>
    );
};

export const ShabonTabButtons: React.FC<ShabonTabButtonsProps> = ({
  tabs = DEFAULT_TABS,
  onTabPress,
  activeTab
}) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.row}>
        {tabs.map((tab) => (
            <TabButtonWrapper 
                key={tab.key} 
                tab={tab} 
                isActive={activeTab === tab.key} 
                onPress={(key) => onTabPress?.(key)} 
                isDark={isDark} 
                theme={theme} 
            />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none', // タブバー自体はタッチを通過させる
  },
  row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center', // Center the buttons
      gap: 20, // Add gap between buttons
      width: '100%',
  },
  buttonContainer: {
      borderRadius: 35,
      overflow: 'visible',
      // 立体感を出すためのシャドウ
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 10,
      // タッチイベントを確実に受け取る
      pointerEvents: 'auto',
  },
  blurCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden', // Ensure content is clipped to circle
      backgroundColor: 'rgba(255,255,255,0.4)',
  },
  glassCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden', // Ensure content is clipped to circle
  }
});
