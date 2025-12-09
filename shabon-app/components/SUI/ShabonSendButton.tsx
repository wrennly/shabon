import React, { useCallback } from 'react';
import { StyleSheet, Platform, ActivityIndicator, Pressable } from 'react-native';
import { Canvas, Shader, useClock, vec, Circle } from '@shopify/react-native-skia';
import Animated, { 
    useAnimatedStyle, 
    useSharedValue, 
    withSequence, 
    withSpring, 
    withTiming,
    useDerivedValue,
    interpolate,
    Extrapolation,
    runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getLiquidGlassShader } from './LiquidGlassShader';

interface ShabonSendButtonProps {
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    size?: number;
}

/**
 * iOS 26 Liquid Glass スタイルの送信ボタン
 * 
 * 物理ベースの Liquid Glass 実装:
 * - フレネル反射（視線角度依存）
 * - 屈折と色収差
 * - 流体ノイズによる動的歪み
 * - 深度依存のぼかしと透明度
 * - プレス時の「押し込み」アニメーション
 */
export const ShabonSendButton: React.FC<ShabonSendButtonProps> = ({
    onPress,
    disabled = false,
    loading = false,
    size = 38,
}) => {
    const scale = useSharedValue(1);
    const pressed = useSharedValue(0);
    const depth = useSharedValue(0.5); // 仮想深度
    const time = useClock();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handlePressIn = useCallback(() => {
        if (disabled || loading) return;
        
        // 押し込みアニメーション
        scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
        pressed.value = withTiming(1.0, { duration: 100 });
        // 深度を増加（背景に近づく感覚）
        depth.value = withTiming(0.8, { duration: 150 });
    }, [disabled, loading]);

    const handlePressOut = useCallback(() => {
        // 戻りアニメーション
        scale.value = withSpring(1, { damping: 12, stiffness: 350 });
        pressed.value = withTiming(0.0, { duration: 200 });
        depth.value = withSpring(0.5, { damping: 20, stiffness: 300 });
    }, []);

    const handlePress = useCallback(() => {
        if (disabled || loading) return;
        onPress();
    }, [disabled, loading, onPress]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: disabled ? 0.4 : 1.0,
    }));

    // シェーダー uniforms（Reanimated の useDerivedValue で毎フレーム更新）
    const uniforms = useDerivedValue(() => {
        if (Platform.OS === 'web') return {};
        return {
            iTime: time.value / 1000,
            iResolution: vec(size, size),
            iIsDark: isDark ? 1.0 : 0.0,
            iPressed: pressed.value,
            iDepth: depth.value,
        };
    });

    const isNative = Platform.OS === 'ios';

    return (
        <Pressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            accessibilityRole="button"
            accessibilityLabel="メッセージを送信"
            style={{ width: size, height: size }}
        >
            <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
                {/* Liquid Glass 背景 (iOS のみ Skia シェーダー) */}
                {isNative && (
                    <Canvas style={StyleSheet.absoluteFill}>
                        <Circle cx={size / 2} cy={size / 2} r={size / 2}>
                            <Shader source={getLiquidGlassShader()!} uniforms={uniforms as any} />
                        </Circle>
                    </Canvas>
                )}
                
                {/* Android / Web フォールバック背景 */}
                {!isNative && (
                    <Animated.View 
                        style={[
                            styles.fallbackBackground, 
                            { 
                                width: size, 
                                height: size, 
                                borderRadius: size / 2,
                                backgroundColor: isDark 
                                    ? 'rgba(255,255,255,0.15)' 
                                    : 'rgba(0,122,255,0.6)',
                            }
                        ]} 
                    />
                )}

                {/* アイコン or ローディング */}
                {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <Ionicons
                        name="arrow-up"
                        size={size * 0.47}
                        color="#FFFFFF"
                        style={styles.icon}
                    />
                )}
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    fallbackBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    icon: {
        // 微調整: 矢印を少し上に
        marginTop: -1,
    },
});

