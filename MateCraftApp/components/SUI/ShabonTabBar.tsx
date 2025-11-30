import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
    Canvas,
    RoundedRect,
    Shader,
    useClock,
    vec
} from '@shopify/react-native-skia';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withSequence,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getShabonShader } from './ShabonShader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_WIDTH = SCREEN_WIDTH - 40; 
const TAB_BAR_HEIGHT = 70;

interface TabItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

interface ShabonTabBarProps {
  tabs?: TabItem[];
  onTabPress?: (key: string) => void;
  activeTab?: string;
}

const DEFAULT_TABS: TabItem[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'explore', icon: 'search', label: 'Explore' },
  { key: 'create', icon: 'add-circle', label: 'Create' },
  { key: 'profile', icon: 'person', label: 'Profile' },
];

const TabButton = ({ item, isActive, onPress, isDark }: { item: TabItem, isActive: boolean, onPress: () => void, isDark: boolean }) => {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.95, { damping: 20, stiffness: 300 }),
      withSpring(1, { damping: 20, stiffness: 300 })
    );
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const iconSize = 24;
  const iconName = item.icon;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1} style={styles.tabButton}>
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <Ionicons 
            name={iconName} 
            size={iconSize} 
            color={isActive ? '#007AFF' : (isDark ? '#FFF' : '#000')} 
        />
        {isActive && <Text style={[styles.tabLabel, { color: isActive ? '#007AFF' : (isDark ? '#DDD' : '#333') }]}>{item.label}</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const ShabonTabBar: React.FC<ShabonTabBarProps> = ({
  tabs = DEFAULT_TABS,
  onTabPress,
  activeTab
}) => {
  const insets = useSafeAreaInsets();
  const time = useClock();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const uniforms = useDerivedValue(() => {
    if (Platform.OS === 'web') {
      return {};
    }
    return {
      iTime: time.value / 1000,
      iResolution: vec(TAB_BAR_WIDTH, TAB_BAR_HEIGHT),
      iIsDark: isDark ? 1.0 : 0.0,
      iRoundness: 0.6, // Capsule shape (rounded rect)
      iRainbowStrength: isDark ? 0.6 : 1.0, // Stronger rainbow in light mode
      iFillAlpha: 0.02, // Extremely transparent
    };
  });
  
  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      <View style={styles.row}>
        {/* Main Tab Bar */}
        <Animated.View style={[
            styles.container,
            {
                // Light mode: Use a subtle dark border for better definition against light backgrounds
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                borderWidth: 1,
                backgroundColor: 'transparent', // Ensure transparent for BlurView
                overflow: 'hidden', // Clip BlurView
            }
        ]}>
            {/* Glass Effect Background */}
            <BlurView 
                intensity={Platform.OS === 'ios' ? (isDark ? 10 : 8) : 20} 
                tint={isDark ? 'dark' : 'light'} 
                style={StyleSheet.absoluteFill} 
            />

            {/* Rainbow Shader Overlay */}
            {Platform.OS !== 'web' && (
                <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
                    <RoundedRect
                        x={0}
                        y={0}
                        width={TAB_BAR_WIDTH}
                        height={TAB_BAR_HEIGHT}
                        r={35}
                    >
                        {getShabonShader() && <Shader source={getShabonShader()!} uniforms={uniforms as any} />}
                    </RoundedRect>
                </Canvas>
            )}

            <View style={styles.tabsContainer}>
            {tabs.map((tab) => (
                <TabButton
                key={tab.key}
                item={tab}
                isActive={activeTab === tab.key}
                onPress={() => onTabPress?.(tab.key)}
                isDark={isDark}
                />
            ))}
            </View>
        </Animated.View>
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
    pointerEvents: 'box-none',
  },
  row: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  container: {
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    borderRadius: 35,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
});
