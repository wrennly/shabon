import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface BackButtonProps {
  onPress: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Pressable onPress={onPress} style={styles.backButtonContainer}>
      {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
        <GlassView style={styles.backButtonGlass} isInteractive>
          <Ionicons name="chevron-back" size={24} color={theme.glassText} style={{ marginRight: 2 }} />
        </GlassView>
      ) : (
        <View style={[styles.backButtonFallback, { backgroundColor: colorScheme === 'dark' ? 'rgba(50,50,50,0.8)' : 'rgba(255,255,255,0.8)' }]}>
          <Ionicons name="chevron-back" size={24} color={theme.tint} style={{ marginRight: 2 }} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backButtonContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});

