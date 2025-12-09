import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useColorScheme } from '@/hooks/use-color-scheme';

interface ShabonBackgroundProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * アプリ全体で使う共通背景グラデーション。
 * 白 → 薄い水色 → 薄い紫 のシャボン玉っぽいトーン。
 */
export const ShabonBackground: React.FC<ShabonBackgroundProps> = ({ style }) => {
  const colorScheme = useColorScheme();

  const colors =
    colorScheme === 'dark'
      ? (['#1a1a2e', '#16213e'] as const)
      : (['#FFFFFF', '#E5F4FF', '#EDE5FF'] as const);

  return (
    <LinearGradient
      colors={colors}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
};
