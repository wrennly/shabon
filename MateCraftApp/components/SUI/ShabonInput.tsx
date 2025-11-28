import { useColorScheme } from '@/hooks/use-color-scheme';
import { Canvas, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, ViewStyle, Text, View } from 'react-native';
import { ShabonCard } from './ShabonCard';
import { Colors } from '@/constants/theme';

interface ShabonInputProps extends TextInputProps {
    width?: number | string;
    height?: number;
    containerStyle?: ViewStyle;
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const ShabonInput: React.FC<ShabonInputProps> = ({
    width = '100%',
    height = 50,
    containerStyle,
    style,
    multiline,
    label,
    error,
    leftIcon,
    rightIcon,
    ...props
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];
    const [isFocused, setIsFocused] = useState(false);

    // Adjust height for multiline if not specified
    const finalHeight = height === 50 && multiline ? 120 : height;
    const borderRadius = multiline ? 24 : (typeof height === 'number' ? height / 2 : 25);
    const strokeWidth = 1.5;

    // Resolve width for Canvas (needs number)
    // If width is string (percentage), we rely on onLayout or just use a large enough number for gradient
    // For simplicity, we'll use a fixed large width for gradient if width is string
    const canvasWidth = typeof width === 'number' ? width : 1000;

    return (
        <View style={[styles.wrapper, containerStyle, { width: width as any }]}>
            {label && (
                <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            )}
            <ShabonCard 
                width={width} 
                height={finalHeight} 
                style={StyleSheet.flatten([
                    { 
                        borderRadius: borderRadius,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F2F4F8',
                        borderWidth: error ? 1 : 0,
                        borderColor: error ? '#FF3B30' : 'transparent',
                    }
                ])}
                contentStyle={{ padding: 0 }} // Remove default padding to prevent text clipping
                rainbowStrength={isFocused ? 0.5 : 0.0} // Subtle rainbow on focus
                fillAlpha={0.0} // Transparent center (using backgroundColor instead)
                interactive={false}
            >
                <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
                    <RoundedRect
                        x={strokeWidth / 2}
                        y={strokeWidth / 2}
                        width={canvasWidth - strokeWidth} // Approximate for percentage width
                        height={finalHeight - strokeWidth}
                        r={borderRadius - strokeWidth / 2}
                        style="stroke"
                        strokeWidth={strokeWidth}
                    >
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(0, finalHeight)}
                            colors={isDark 
                                ? ["rgba(255,255,255,0.25)", "rgba(255,255,255,0.05)"] 
                                : ["rgba(255,255,255,0.6)", "rgba(255,255,255,0.1)"]
                            }
                        />
                    </RoundedRect>
                </Canvas>
                <View style={styles.inputContainer}>
                    {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
                    <TextInput
                        style={[
                            styles.input,
                            { 
                                color: isDark ? '#FFF' : '#333',
                                paddingTop: multiline ? 15 : 0, // Add padding for textarea
                                textAlignVertical: multiline ? 'top' : 'center',
                                paddingLeft: leftIcon ? 8 : 20,
                                paddingRight: rightIcon ? 8 : 20,
                            },
                            style
                        ]}
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        multiline={multiline}
                        {...props}
                    />
                    {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
                </View>
            </ShabonCard>
            {error && (
                <Text style={[styles.errorText, { color: '#FF3B30' }]}>
                    {error}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        marginBottom: 6,
        marginLeft: 4,
        fontWeight: '500',
        opacity: 0.8,
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    leftIcon: {
        paddingLeft: 16,
    },
    rightIcon: {
        paddingRight: 16,
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
});
