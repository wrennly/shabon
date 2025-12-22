import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Canvas, Shader, vec, Rect } from '@shopify/react-native-skia';
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
 * アクティブ時にアニメーションするシャボン玉エフェクトを表示
 * 重要: Shader は必ず Rect などの Shape の子要素として使用すること
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
                {shader && isActive && (
                    <Canvas style={StyleSheet.absoluteFill}>
                        <Rect x={0} y={0} width={size} height={size}>
                            <Shader
                                source={shader}
                                uniforms={{
                                    iTime: time.value,
                                    iResolution: vec(size, size),
                                    iIsDark: isDark ? 1.0 : 0.0,
                                    iRoundness: 1.0,
                                    iRainbowStrength: 2.0,
                                    iFillAlpha: 0.3,
                                }}
                            />
                        </Rect>
                    </Canvas>
                )}
            </View>
            
            {/* 子要素（アイコンなど） */}
            <View style={[styles.contentContainer, { zIndex: 10 }]}>
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

