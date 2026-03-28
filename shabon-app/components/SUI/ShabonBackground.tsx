import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useColorScheme } from '@/hooks/use-color-scheme';

interface ShabonBackgroundProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * アプリ全体で使う共通背景グラデーション。
 * ライト: ほんのり青みがかった爽やかなグラデーション
 * ダーク: 夜空に浮かぶシャボン玉 - 深い青黒からオーロラのような淡い紫へ
 */
export const ShabonBackground: React.FC<ShabonBackgroundProps> = ({ style }) => {
  const colorScheme = useColorScheme();

  const colors =
    colorScheme === 'dark'
      ? (['#0D1117', '#1a1f2e', '#1e2a3a'] as const) // 夜空 → 深い青 → 少し明るい青紫
      : (['#F5F8FF', '#E5F4FF', '#EDE5FF'] as const); // 爽やかな青白 → 薄い水色 → 薄い紫

  return (
    <LinearGradient
      colors={colors}
      locations={[0, 0.5, 1]} // グラデーションの位置を制御
      style={[StyleSheet.absoluteFill, style]}
    />
  );
};
