/**
 * LiquidGlass - iOS 26 Liquid Glass Effect Component
 * 
 * Native Metal Shader を使用した本格的な Liquid Glass 実装
 * iOS 17+ 専用、Android は後日対応
 */

import { requireNativeViewManager } from 'expo-modules-core';
import React, { forwardRef, useCallback } from 'react';
import { 
    Platform, 
    StyleSheet, 
    View, 
    ViewStyle, 
    StyleProp,
    Pressable,
    ActivityIndicator
} from 'react-native';
// Native View Manager (iOS only)
let NativeLiquidGlassView: any = View;

if (Platform.OS === 'ios') {
    try {
        NativeLiquidGlassView = requireNativeViewManager('LiquidGlass');
        console.log('[LiquidGlass] Native module loaded successfully');
    } catch (error) {
        console.warn('[LiquidGlass] Failed to load native module, using fallback:', error);
        NativeLiquidGlassView = null;
    }
}

// ============================================
// Types
// ============================================

export interface LiquidGlassProps {
    /** エフェクトの強度 (0.0 - 2.0, default: 1.0) */
    intensity?: number;
    
    /** 仮想深度 (0.0 - 1.0, default: 0.5) */
    depth?: number;
    
    /** サイズ (default: 38) */
    size?: number;
    
    /** 形状: "circle" | "rect" (default: "circle") */
    shape?: 'circle' | 'rect';
    
    /** 角丸半径（rect の場合, default: 12） */
    cornerRadius?: number;
    
    /** スタイル */
    style?: StyleProp<ViewStyle>;
    
    /** 子要素 */
    children?: React.ReactNode;
}

export interface LiquidGlassButtonProps extends Omit<LiquidGlassProps, 'children'> {
    /** 押下時のコールバック */
    onPress?: () => void;
    
    /** 無効状態 */
    disabled?: boolean;
    
    /** ローディング状態 */
    loading?: boolean;
    
    /** 子要素（アイコンなど） */
    children?: React.ReactNode;
    
    /** アクセシビリティラベル */
    accessibilityLabel?: string;
}

// ============================================
// LiquidGlassView - 基本コンポーネント
// ============================================

export const LiquidGlassView = forwardRef<View, LiquidGlassProps>(({
    intensity = 1.0,
    depth = 0.5,
    size = 38,
    shape = 'circle',
    cornerRadius = 12,
    style,
    children,
}, ref) => {
    // iOS 以外はフォールバック
    if (Platform.OS !== 'ios') {
        return (
            <View 
                ref={ref}
                style={[
                    styles.fallback,
                    { 
                        width: size, 
                        height: size,
                        borderRadius: shape === 'circle' ? size / 2 : cornerRadius,
                    },
                    style
                ]}
            >
                {children}
            </View>
        );
    }

    return (
        <View ref={ref} style={[{ width: size, height: size }, style]}>
            <NativeLiquidGlassView
                intensity={intensity}
                depth={depth}
                glassSize={size}
                shape={shape}
                cornerRadius={cornerRadius}
                isPressed={false}
                style={StyleSheet.absoluteFill}
            />
            {children && (
                <View style={styles.childrenContainer}>
                    {children}
                </View>
            )}
        </View>
    );
});

LiquidGlassView.displayName = 'LiquidGlassView';

// ============================================
// LiquidGlassButton - インタラクティブボタン
// ============================================

export const LiquidGlassButton = forwardRef<View, LiquidGlassButtonProps>(({
    onPress,
    disabled = false,
    loading = false,
    intensity = 1.0,
    depth = 0.5,
    size = 38,
    shape = 'circle',
    cornerRadius = 12,
    style,
    children,
    accessibilityLabel,
}, ref) => {
    const [pressed, setPressed] = React.useState(false);
    const [currentDepth, setCurrentDepth] = React.useState(depth);

    const handlePressIn = useCallback(() => {
        if (disabled || loading) return;
        console.log('[LiquidGlassButton] Press In');
        setPressed(true);
        setCurrentDepth(Math.min(depth + 0.3, 1.0));
    }, [disabled, loading, depth]);

    const handlePressOut = useCallback(() => {
        console.log('[LiquidGlassButton] Press Out');
        setPressed(false);
        setCurrentDepth(depth);
    }, [depth]);

    const handlePress = useCallback(() => {
        if (disabled || loading) return;
        console.log('[LiquidGlassButton] Press!');
        onPress?.();
    }, [disabled, loading, onPress]);

    // iOS 以外はフォールバック
    if (Platform.OS !== 'ios') {
        return (
            <Pressable
                ref={ref}
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                style={[
                    styles.fallback,
                    { 
                        width: size, 
                        height: size,
                        borderRadius: shape === 'circle' ? size / 2 : cornerRadius,
                        opacity: disabled ? 0.4 : 1,
                    },
                    style
                ]}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    children
                )}
            </Pressable>
        );
    }

    // ネイティブモジュールがロードできなかった場合はフォールバック
    const useNative = NativeLiquidGlassView !== null && NativeLiquidGlassView !== View;
    
    return (
        <Pressable
            ref={ref}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={[{ width: size, height: size, opacity: disabled ? 0.4 : 1 }, style]}
        >
            {useNative ? (
                <NativeLiquidGlassView
                    intensity={intensity}
                    depth={currentDepth}
                    glassSize={size}
                    shape={shape}
                    cornerRadius={cornerRadius}
                    isPressed={pressed}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                />
            ) : (
                <View 
                    style={[
                        StyleSheet.absoluteFill, 
                        styles.fallback,
                        { borderRadius: shape === 'circle' ? size / 2 : cornerRadius }
                    ]} 
                    pointerEvents="none"
                />
            )}
            <View style={styles.childrenContainer} pointerEvents="none">
                {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    children
                )}
            </View>
        </Pressable>
    );
});

LiquidGlassButton.displayName = 'LiquidGlassButton';

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    fallback: {
        backgroundColor: 'rgba(0, 122, 255, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    childrenContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

// Default export
export default {
    LiquidGlassView,
    LiquidGlassButton,
};

