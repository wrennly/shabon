import React from 'react';
import { TextInput, StyleSheet, ViewStyle, TextStyle, View, Text } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CupertinoInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  style?: ViewStyle;
  label?: string;
  error?: string;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

/**
 * iOS (Cupertino) スタイルの入力フィールド
 */
export const CupertinoInput: React.FC<CupertinoInputProps> = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  style,
  label,
  error,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // iOS Colors
  const IOS_BG_LIGHT = '#F2F2F7'; // System Grouped Background
  const IOS_BG_DARK = '#1C1C1E';
  const IOS_TEXT_LIGHT = '#000000';
  const IOS_TEXT_DARK = '#FFFFFF';
  const IOS_PLACEHOLDER_LIGHT = '#3C3C434D'; // Label Color (Secondary)
  const IOS_PLACEHOLDER_DARK = '#EBEBF54D';
  const IOS_RED = '#FF3B30';

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[
          styles.label, 
          { color: isDark ? IOS_TEXT_DARK : IOS_TEXT_LIGHT }
        ]}>
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? IOS_PLACEHOLDER_DARK : IOS_PLACEHOLDER_LIGHT}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        editable={!disabled}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={[
          styles.input,
          multiline && { height: undefined, minHeight: 44, paddingVertical: 10 },
          {
            backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', // Secondary System Grouped Background
            color: isDark ? IOS_TEXT_DARK : IOS_TEXT_LIGHT,
            borderColor: error ? IOS_RED : (isDark ? '#3A3A3C' : '#C6C6C8'),
          }
        ]}
      />
      {error && (
        <Text style={[styles.errorText, { color: IOS_RED }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 4,
    fontWeight: '500',
    opacity: 0.8,
  },
  input: {
    height: 44, // iOS standard height
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 17, // iOS standard body size
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
