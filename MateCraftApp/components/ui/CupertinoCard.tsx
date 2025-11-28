import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CupertinoCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'filled' | 'outlined';
}

/**
 * iOSスタイルのカードコンポーネント
 */
export const CupertinoCard: React.FC<CupertinoCardProps> = ({
  children,
  style,
  variant = 'elevated',
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getBackgroundColor = () => {
    if (variant === 'filled') {
      return isDark ? '#2C2C2E' : '#F2F2F7'; // Secondary System Background
    }
    return isDark ? '#1C1C1E' : '#FFFFFF'; // Secondary System Grouped Background (for elevated)
  };

  const getBorder = () => {
    if (variant === 'outlined') {
      return {
        borderWidth: 1,
        borderColor: isDark ? '#3A3A3C' : '#C6C6C8',
      };
    }
    return {};
  };

  const getShadow = () => {
    if (variant === 'elevated') {
      return {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2, // Minimal elevation for Android
      };
    }
    return {};
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: getBackgroundColor() },
        getBorder(),
        getShadow(),
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
  },
});
