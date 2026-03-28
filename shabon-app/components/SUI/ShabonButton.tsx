import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle, Text, TextStyle, View, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
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
    rainbowStrength = 1.0,
    borderRadius: customBorderRadius
}) => {
    const scale = useSharedValue(1);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];

    // Determine dimensions
    const isCircle = size !== undefined;
    const finalWidth = isCircle ? size : (width ?? '100%');
    const finalHeight = isCircle ? size : height;
    const borderRadius = customBorderRadius ?? (isCircle ? size / 2 : 12);
    
    // シャボン玉カラー（パステル調の虹色）
    const shabonColors = isDark 
        ? ['rgba(180,200,255,0.3)', 'rgba(255,180,255,0.3)', 'rgba(200,180,255,0.3)', 'rgba(180,220,255,0.3)'] as const
        : ['rgba(200,220,255,0.4)', 'rgba(255,200,255,0.4)', 'rgba(220,200,255,0.4)', 'rgba(200,240,255,0.4)'] as const;

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

    return (
        <TouchableOpacity 
            onPress={handlePress} 
            activeOpacity={1}
            disabled={disabled || loading}
            style={[
                { width: finalWidth as any, height: finalHeight },
                style
            ]}
        >
            <Animated.View style={[
                styles.container, 
                { 
                    width: '100%', 
                    height: '100%',
                    borderRadius: borderRadius 
                }, 
                containerStyle,
                animatedStyle
            ]}>
                {/* シャボン玉グラデーション背景 */}
                {variant !== 'outline' && rainbowStrength > 0 && (
                    <LinearGradient
                        colors={shabonColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[StyleSheet.absoluteFill, { 
                            borderRadius: borderRadius,
                            opacity: disabled ? 0.3 : rainbowStrength
                        }]}
                    />
                )}
                
                {/* ベース背景 */}
                <View style={[StyleSheet.absoluteFill, { 
                    backgroundColor: variant === 'outline' ? 'transparent' : (isDark ? 'rgba(224,224,224,0.15)' : 'rgba(224,224,224,0.2)'),
                    borderRadius: borderRadius,
                    borderWidth: variant === 'outline' ? 2 : 0,
                    borderColor: theme.tint,
                }]} />
                
                {/* 左上ハイライト（ガラス感） */}
                {variant !== 'outline' && (
                    <View style={[StyleSheet.absoluteFill, { 
                        borderRadius: borderRadius,
                        overflow: 'hidden'
                    }]}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.4)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0.5, y: 0.5 }}
                            style={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '60%',
                                height: '60%',
                            }}
                        />
                    </View>
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
