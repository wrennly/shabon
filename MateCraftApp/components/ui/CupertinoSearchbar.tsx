import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CupertinoSearchbarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

/**
 * iOSスタイルの検索バー
 */
export const CupertinoSearchbar: React.FC<CupertinoSearchbarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search',
  style,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, style]}>
      <View style={[
        styles.inputContainer,
        { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' } // System Fill Color
      ]}>
        <IconSymbol
          name="magnifyingglass"
          size={16}
          color="#8E8E93"
          style={styles.icon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          style={[styles.input, { color: isDark ? '#FFFFFF' : '#000000' }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  icon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 17,
    height: '100%',
  },
});
