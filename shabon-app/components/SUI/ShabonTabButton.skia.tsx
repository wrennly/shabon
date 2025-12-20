import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Canvas, Shader, vec } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { getShabonShader } from './ShabonShader';

interface ShabonTabButtonProps {
    onPress?: () => void;
    size?: number;
    children?: React.ReactNode;
    isActive?: boolean;
}

/**
 * Skia版のシャボン玉タブボタン
 * 
 * 使い方：
 * 1. ShabonTabButton.tsx を ShabonTabButton.gradient.tsx にリネーム
 * 2. このファイルを ShabonTabButton.tsx にリネーム
 * 3. ビルドを作成
 */
export const ShabonTabButton: React.FC<ShabonTabButtonProps> = ({
    onPress,
    size = 70,
    children,
    isActive = false,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    // Shader用のアニメーション時間
    const time = useSharedValue(0);
    
    useEffect(() => {
        time.value = withRepeat(
            withTiming(100, { duration: 100000 }),
            -1,
            false
        );
    }, []);
    
    const shader = getShabonShader();
    
    const borderRadius = size / 2;
    
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
            <View style={[
                StyleSheet.absoluteFill,
                { borderRadius: borderRadius, overflow: 'hidden' }
            ]}>
                {shader && isActive ? (
                    <Canvas style={StyleSheet.absoluteFill}>
                        <Shader
                            source={shader}
                            uniforms={{
                                iTime: time,
                                iResolution: vec(size, size),
                                iIsDark: isDark ? 1.0 : 0.0,
                                iRoundness: 1.0, // 完全な円
                                iRainbowStrength: 2.0, // 虹の強度（選択時は強め）
                                iFillAlpha: 0.3, // 中心の透明度
                            }}
                        />
                    </Canvas>
                ) : (
                    // 非選択時はシンプルな背景
                    <View style={[
                        StyleSheet.absoluteFill,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            borderRadius: borderRadius,
                        }
                    ]} />
                )}
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
    },
});

