import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface ShabonTabButtonProps {
    onPress?: () => void;
    size?: number;
    children?: React.ReactNode;
    isActive?: boolean;
}

export const ShabonTabButton: React.FC<ShabonTabButtonProps> = ({
    onPress,
    size = 70,
    children,
    isActive = false,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    const borderRadius = size / 2;
    
    // アクティブ時の虹色グラデーション（シャボン玉風）
    const activeColors = isDark
        ? ['rgba(147, 197, 253, 0.4)', 'rgba(196, 181, 253, 0.4)', 'rgba(251, 207, 232, 0.4)'] as [string, string, string]
        : ['rgba(147, 197, 253, 0.6)', 'rgba(196, 181, 253, 0.6)', 'rgba(251, 207, 232, 0.6)'] as [string, string, string];
    
    // 非アクティブ時のグレーグラデーション
    const inactiveColors = isDark
        ? ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'] as [string, string]
        : ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.15)'] as [string, string];
    
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[
                styles.container,
                {
                    width: size,
                    height: size,
                    borderRadius: borderRadius,
                }
            ]}
        >
            <View style={[StyleSheet.absoluteFill, { borderRadius: borderRadius, overflow: 'hidden' }]}>
                <BlurView
                    intensity={isDark ? 30 : 50}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                >
                    <LinearGradient
                        colors={isActive ? activeColors : inactiveColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    
                    {/* 縁の光沢効果 */}
                    {isActive && (
                        <View style={[styles.edgeGlow, { borderRadius: borderRadius }]} />
                    )}
                </BlurView>
            </View>
            
            {/* 子要素（アイコンなど） */}
            <View style={styles.contentContainer}>
                {children}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'visible',
    },
    contentContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    edgeGlow: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
});
