import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface CupertinoListItemProps {
  title: string;
  subtitle?: string;
  additionalText?: string;
  onPress?: () => void;
  chevron?: boolean;
  style?: ViewStyle;
  last?: boolean; // To hide separator
}

/**
 * iOSスタイルのリストアイテム
 */
export const CupertinoListItem: React.FC<CupertinoListItemProps> = ({
  title,
  subtitle,
  additionalText,
  onPress,
  chevron = true,
  style,
  last = false,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed 
            ? (isDark ? '#2C2C2E' : '#E5E5EA') 
            : (isDark ? '#1C1C1E' : '#FFFFFF'),
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: '#8E8E93' }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={styles.rightContainer}>
          {additionalText && (
            <Text style={[styles.additionalText, { color: '#8E8E93' }]}>
              {additionalText}
            </Text>
          )}
          {chevron && (
            <IconSymbol
              name="chevron.right"
              size={20}
              color="#C7C7CC"
              style={styles.chevron}
            />
          )}
        </View>
      </View>
      {!last && (
        <View style={[styles.separator, { backgroundColor: isDark ? '#38383A' : '#C6C6C8' }]} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingLeft: 16,
    minHeight: 44,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '400',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  additionalText: {
    fontSize: 17,
    marginRight: 6,
  },
  chevron: {
    marginLeft: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 16, // Indented separator
  },
});
