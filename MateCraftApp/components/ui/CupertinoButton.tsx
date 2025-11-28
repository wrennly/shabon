import React from 'react';
import { Text, Pressable, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CupertinoButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

/**
 * iOS (Cupertino) スタイルのボタンコンポーネント
 * AndroidでもiOSのデザインに統一するために使用します。
 */
export const CupertinoButton: React.FC<CupertinoButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme ?? 'light';
  const theme = Colors[currentTheme as keyof typeof Colors];

  // iOS System Colors
  const IOS_BLUE = '#007AFF';
  const IOS_RED = '#FF3B30';
  const IOS_GRAY = '#8E8E93';
  const IOS_LIGHT_GRAY = '#E5E5EA';
  const IOS_DARK_GRAY = '#1C1C1E';

  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) return colorScheme === 'dark' ? '#3A3A3C' : '#D1D1D6';
    
    if (variant === 'outline') return 'transparent';

    switch (variant) {
      case 'primary':
        return IOS_BLUE;
      case 'secondary':
        return colorScheme === 'dark' ? IOS_DARK_GRAY : IOS_LIGHT_GRAY;
      case 'destructive':
        return IOS_RED;
      default:
        return IOS_BLUE;
    }
  };

  const getTextColor = () => {
    if (disabled) return '#8E8E93';
    
    switch (variant) {
      case 'primary':
      case 'destructive':
        return '#FFFFFF';
      case 'secondary':
        return IOS_BLUE;
      case 'outline':
        return IOS_BLUE;
      default:
        return '#FFFFFF';
    }
  };

  const getBorder = (): ViewStyle => {
    if (variant === 'outline') {
      return {
        borderWidth: 1,
        borderColor: disabled ? '#D1D1D6' : IOS_BLUE,
      };
    }
    return {};
  };

  const getPadding = (): ViewStyle => {
    switch (size) {
      case 'small':
        return { paddingVertical: 6, paddingHorizontal: 12 };
      case 'large':
        return { paddingVertical: 14, paddingHorizontal: 24 };
      default: // medium
        return { paddingVertical: 10, paddingHorizontal: 16 };
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'small': return 14;
      case 'large': return 17; // iOS standard body size
      default: return 16;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        getPadding(),
        getBorder(),
        {
          backgroundColor: getBackgroundColor(pressed),
          opacity: pressed ? 0.7 : 1.0, // iOS-like tap feedback
          // iOS Shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: variant === 'secondary' || variant === 'outline' ? 0 : 0.1,
          shadowRadius: 4,
          // Android Shadow (Minimal)
          elevation: variant === 'secondary' || variant === 'outline' ? 0 : 2,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
                marginLeft: icon ? 8 : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10, // iOS trend 8px-12px
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'System', // iOS default font
  },
});
