import { useColorScheme } from '@/hooks/use-color-scheme';
import { Canvas, RoundedRect, Shader, useClock, vec } from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle, Text, TextStyle, View, ActivityIndicator, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { getShabonShader } from './ShabonShader';
import { Colors } from '@/constants/theme';

interface ShabonButtonProps {
    onPress?: () => void;
    title?: string;
    size?: number; // For circular button (diameter)
    width?: number | string;
    height?: number;
    style?: ViewStyle;
    contentStyle?: ViewStyle;
    containerStyle?: ViewStyle;
    textStyle?: TextStyle;
    children?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline';
    icon?: React.ReactNode;
    loading?: boolean;
    disabled?: boolean;
    disablePressAnimation?: boolean;
    rainbowStrength?: number;
    borderRadius?: number;
}

export const ShabonButton: React.FC<ShabonButtonProps> = ({ 
    onPress, 
    title,
    size, 
    width,
    height = 50,
    style,
    contentStyle,
    containerStyle,
    textStyle,
    children,
    variant = 'primary',
    icon,
    loading = false,
    disabled = false,
    disablePressAnimation = false,
    rainbowStrength,
    borderRadius: customBorderRadius
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
    const borderRadius = customBorderRadius ?? (isCircle ? size / 2 : 12); // iOS style radius

    // For shader resolution, we need concrete numbers. 
    // If width is a string (percentage), we might need a layout measurement.
    // For simplicity in this version, if width is string, we assume a default for shader aspect ratio
    // or we can use a fixed large enough canvas.
    // Let's use a layout state for accurate shader rendering if needed, 
    // but for now let's assume width is number or fallback to 300 for shader res.
    const [layout, setLayout] = React.useState({ width: isCircle ? size : 300, height: finalHeight });

    const handlePress = () => {
        if (disabled || loading) return;
        
        if (!disablePressAnimation) {
            scale.value = withSequence(
                // Snappy shrink (instant feedback)
                withTiming(0.9, { duration: 50 }),
                // Single bounce back (high damping to prevent multiple oscillations)
                withSpring(1, { damping: 15, stiffness: 300 })
            );
        }
        onPress?.();
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: disabled ? 0.5 : 1.0,
    }));

    const uniforms = useDerivedValue(() => {
        if (Platform.OS === 'web') {
            return {};
        }
        return {
            iTime: time.value / 1000,
            iResolution: vec(layout.width, layout.height),
            iIsDark: isDark ? 1.0 : 0.0,
            iRoundness: isCircle ? 1.0 : 0.6, // 1.0 for circle, 0.6 for rounded rect
            iRainbowStrength: rainbowStrength !== undefined ? rainbowStrength : (variant === 'outline' ? 0.3 : (disabled ? 0.0 : 1.0)),
            iFillAlpha: variant === 'outline' ? 0.0 : (disabled ? 0.3 : 0.8), // Transparent center for outline
        };
    });

    return (
        <TouchableOpacity 
            onPress={handlePress} 
            activeOpacity={1}
            disabled={disabled || loading}
            style={[
                { width: finalWidth as any, height: finalHeight }, // Always set dimensions
                style
            ]}
            onLayout={(e) => setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
            <Animated.View style={[
                styles.container, 
                { 
                    width: '100%', 
                    height: '100%', // Use 100% to fill TouchableOpacity
                    borderRadius: borderRadius 
                }, 
                containerStyle,
                animatedStyle
            ]}>
                 {Platform.OS !== 'web' && (
                     <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
                        <RoundedRect 
                            x={0} 
                            y={0} 
                            width={layout.width} 
                            height={layout.height} 
                            r={borderRadius}
                        >
                            <Shader source={getShabonShader()!} uniforms={uniforms as any} />
                        </RoundedRect>
                    </Canvas>
                 )}
                
                <View style={[styles.contentContainer, contentStyle]}>
                    {loading ? (
                        <ActivityIndicator color={isDark ? '#FFF' : '#000'} />
                    ) : (
                        <>
                            {icon && <View style={[styles.iconContainer, !title && { marginRight: 0 }]}>{icon}</View>}
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
