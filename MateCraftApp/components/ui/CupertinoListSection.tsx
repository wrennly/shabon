import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CupertinoListSectionProps {
  children: React.ReactNode;
  header?: string;
  footer?: string;
}

/**
 * iOSスタイルのリストセクション
 * グループ化されたリストアイテムを表示します。
 */
export const CupertinoListSection: React.FC<CupertinoListSectionProps> = ({
  children,
  header,
  footer,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      {header && (
        <Text style={[styles.header, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
          {header.toUpperCase()}
        </Text>
      )}
      <View style={[
        styles.list, 
        { 
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderColor: isDark ? '#38383A' : '#C6C6C8',
        }
      ]}>
        {children}
      </View>
      {footer && (
        <Text style={[styles.footer, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
          {footer}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 6,
    marginTop: 16,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    fontSize: 13,
    paddingHorizontal: 16,
    marginTop: 6,
  },
});
