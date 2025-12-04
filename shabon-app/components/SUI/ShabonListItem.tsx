import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { ShabonCard } from './ShabonCard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface ShabonListItemProps {
  title: string;
  subtitle?: string;
  additionalText?: string;
  onPress?: () => void;
  chevron?: boolean;
  style?: ViewStyle;
  width?: number | string;
}

export const ShabonListItem: React.FC<ShabonListItemProps> = ({
  title,
  subtitle,
  additionalText,
  onPress,
  chevron = true,
  style,
  width = '100%',
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.container, style]}>
      <ShabonCard
        width={width}
        height={subtitle ? 70 : 56}
        style={{
          borderRadius: 16,
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)',
        }}
        contentStyle={styles.cardContent}
        rainbowStrength={0.0}
        fillAlpha={0.0}
        interactive={true}
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
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#C7C7CC"
                style={styles.chevron}
              />
            )}
          </View>
        </View>
      </ShabonCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  cardContent: {
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  additionalText: {
    fontSize: 15,
    marginRight: 6,
  },
  chevron: {
    marginLeft: 4,
  },
});
