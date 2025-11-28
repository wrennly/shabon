import { useColorScheme } from '@/hooks/use-color-scheme';
import { Canvas, RoundedRect, Shader, useClock, vec } from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle, Text, TextStyle, View, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { SHABON_SHADER_SKSL } from './ShabonShader';
import { Colors } from '@/constants/theme';

interface ShabonButtonProps {
    onPress?: () => void;
    title?: string;
    size?: number; // For circular button (diameter)
    width?: number | string;
    height?: number;
    style?: ViewStyle;
    contentStyle?: ViewStyle;
    textStyle?: TextStyle;
    children?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline';
    icon?: React.ReactNode;
    loading?: boolean;
    disabled?: boolean;
}

export const ShabonButton: React.FC<ShabonButtonProps> = ({ 
    onPress, 
    title,
    size, 
    width,
    height = 50,
    style,
    contentStyle,
    textStyle,
    children,
    variant = 'primary',
    icon,
    loading = false,
    disabled = false
}) => {
    const scale = useSharedValue(1);
    const time = useClock();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];

    // Determine dimensions
    // If size is provided, it's a circle. Otherwise use width/height.
    const isCircle = size !== undefined;
    const finalWidth = isCircle ? size : (width ?? '100%');
    const finalHeight = isCircle ? size : height;
    const borderRadius = isCircle ? size / 2 : 12; // iOS style radius

    // For shader resolution, we need concrete numbers. 
    // If width is a string (percentage), we might need a layout measurement.
    // For simplicity in this version, if width is string, we assume a default for shader aspect ratio
    // or we can use a fixed large enough canvas.
    // Let's use a layout state for accurate shader rendering if needed, 
    // but for now let's assume width is number or fallback to 300 for shader res.
    const [layout, setLayout] = React.useState({ width: isCircle ? size : 300, height: finalHeight });

    const handlePress = () => {
        if (disabled || loading) return;
        
        scale.value = withSequence(
            withSpring(0.95, { damping: 10, stiffness: 200 }),
            withSpring(1, { damping: 10, stiffness: 200 })
        );
        onPress?.();
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: disabled ? 0.5 : 1.0,
    }));

    const uniforms = useDerivedValue(() => {
        return {
            iTime: time.value / 1000,
            iResolution: vec(layout.width, layout.height),
            iIsDark: isDark ? 1.0 : 0.0,
            iRoundness: isCircle ? 1.0 : 0.6, // 1.0 for circle, 0.6 for rounded rect
            iRainbowStrength: variant === 'outline' ? 0.3 : (disabled ? 0.0 : 1.0),
            iFillAlpha: variant === 'outline' ? 0.0 : (disabled ? 0.3 : 0.8), // Transparent center for outline
        };
    });

    return (
        <TouchableOpacity 
            onPress={handlePress} 
            activeOpacity={1}
            disabled={disabled || loading}
            style={[
                !isCircle && { width: finalWidth },
                style
            ]}
            onLayout={(e) => setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
            <Animated.View style={[
                styles.container, 
                { 
                    width: '100%', 
                    height: finalHeight, 
                    borderRadius: borderRadius 
                }, 
                animatedStyle
            ]}>
                 <Canvas style={StyleSheet.absoluteFill}>
                    <RoundedRect 
                        x={0} 
                        y={0} 
                        width={layout.width} 
                        height={layout.height} 
                        r={borderRadius}
                    >
                        <Shader source={SHABON_SHADER_SKSL} uniforms={uniforms} />
                    </RoundedRect>
                </Canvas>
                
                <View style={[styles.contentContainer, contentStyle]}>
                    {loading ? (
                        <ActivityIndicator color={isDark ? '#FFF' : '#000'} />
                    ) : (
                        <>
                            {icon && <View style={styles.iconContainer}>{icon}</View>}
                            {title ? (
                                <Text style={[
                                    styles.text, 
                                    { color: isDark ? '#FFF' : '#000' },
                                    variant === 'outline' && { color: theme.tint },
                                    textStyle
                                ]}>
                                    {title}
                                </Text>
                            ) : children}
                        </>
                    )}
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        overflow: 'hidden',
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    iconContainer: {
        marginRight: 8,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});
