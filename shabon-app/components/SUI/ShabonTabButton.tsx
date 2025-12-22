import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Canvas, Shader, vec, Circle, Fill, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { getShabonShader } from './ShabonShader';

// 🧪 超シンプルなテスト用Shader
const simpleShaderSource = Skia.RuntimeEffect.Make(`
uniform vec2 resolution;
vec4 main(vec2 fragCoord) {
    vec2 uv = fragCoord / resolution;
    // グラデーション（左上：赤、右下：青）
    return vec4(uv.x, 0.5, uv.y, 1.0);
}
`);

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
    
    // デバッグ用ログ
    useEffect(() => {
        console.log('[ShabonTabButton] 🧪 TEST MODE - Shader loaded:', !!shader);
        console.log('[ShabonTabButton] 🧪 TEST MODE - Shader object:', shader);
        console.log('[ShabonTabButton] 🧪 TEST MODE - isActive:', isActive);
        console.log('[ShabonTabButton] 🧪 TEST MODE - time.value:', time.value);
        console.log('[ShabonTabButton] 🧪 TEST MODE - size:', size);
        console.log('[ShabonTabButton] 🧪 TEST MODE - vec(size, size):', vec(size, size));
    }, [shader, isActive]);
    
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
                {/* 🧪 TEST: Canvasの可視性テスト用に背景色追加 */}
                <View style={[
                    StyleSheet.absoluteFill,
                    { 
                        backgroundColor: 'rgba(255,0,0,0.3)',  // 🔴 赤い背景でCanvas領域を確認
                        zIndex: 0 
                    }
                ]} />
                
                {/* 🧪 TEST: Shader を最優先で描画 */}
                <Canvas style={[
                    StyleSheet.absoluteFill, 
                    { 
                        zIndex: 1,
                        backgroundColor: 'rgba(0,255,0,0.3)'  // 🟢 緑の背景でCanvas自体を確認
                    }
                ]}>
                    {/* 🧪 TEST: シンプルなShaderでテスト */}
                    {simpleShaderSource ? (
                        <Shader
                            source={simpleShaderSource}
                            uniforms={{
                                resolution: vec(size, size),
                            }}
                        />
                    ) : (
                        <>
                            {/* 🔵 Shader がない場合のフォールバック */}
                            <Fill color="rgba(0,0,255,0.5)" />
                            <Circle cx={size / 2} cy={size / 2} r={size / 3} color="cyan" />
                        </>
                    )}
                </Canvas>
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

