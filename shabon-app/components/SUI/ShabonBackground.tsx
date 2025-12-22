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
 * ダーク: シャボン玉が映えるグレー - ダークグレーから少し明るいグレーへ
 */
export const ShabonBackground: React.FC<ShabonBackgroundProps> = ({ style }) => {
  const colorScheme = useColorScheme();

  const colors =
    colorScheme === 'dark'
      ? (['#1a1a1a', '#252525', '#2a2a2a'] as const) // ダークグレー → ミディアムグレー → 少し明るいグレー
      : (['#F5F8FF', '#E5F4FF', '#EDE5FF'] as const); // 爽やかな青白 → 薄い水色 → 薄い紫

  return (
    <LinearGradient
      colors={colors}
      locations={[0, 0.5, 1]} // グラデーションの位置を制御
      style={[StyleSheet.absoluteFill, style]}
    />
  );
};
