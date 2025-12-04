import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, ViewStyle, Text, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
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

    return (
        <View style={[styles.wrapper, containerStyle, { width: width as any }]}>
            {label && (
                <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            )}
            <View
                style={[
                    styles.blurContainer,
                    { 
                        height: finalHeight, 
                        borderRadius: borderRadius,
                        borderWidth: 1,
                        borderColor: error 
                            ? '#FF3B30' 
                            : (isFocused ? theme.tint : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)')),
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.05)',
                    },
                    containerStyle
                ]}
            >
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
                                ...Platform.select({
                                    web: {
                                        outlineStyle: 'none',
                                    } as any
                                })
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
            </View>
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
    blurContainer: {
        overflow: 'hidden',
        justifyContent: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: '100%',
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
