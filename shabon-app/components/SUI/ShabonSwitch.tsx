import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ShabonCard } from './ShabonCard';

interface ShabonSwitchProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    labelA?: string;
    labelB?: string;
    width?: number;
    height?: number;
    style?: ViewStyle;
}

export const ShabonSwitch: React.FC<ShabonSwitchProps> = ({
    value,
    onValueChange,
    labelA,
    labelB,
    width = 51,
    height = 31,
    style
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    // If labels are provided, use segmented control style (default width 120)
    const isSegmented = labelA !== undefined || labelB !== undefined;
    const finalWidth = isSegmented ? (width === 51 ? 120 : width) : width;
    const finalHeight = isSegmented ? (height === 31 ? 40 : height) : height;
    const knobSize = finalHeight - 4;

    const animatedStyle = useAnimatedStyle(() => {
        if (isSegmented) {
            return {
                transform: [{ translateX: withSpring(value ? finalWidth / 2 : 0, { damping: 40, stiffness: 500 }) }],
            };
        } else {
            return {
                transform: [{ translateX: withSpring(value ? finalWidth - knobSize - 4 : 0, { damping: 20, stiffness: 200 }) }],
            };
        }
    });

    return (
        <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => onValueChange(!value)}
            style={[styles.container, style]}
        >
            <ShabonCard 
                width={finalWidth} 
                height={finalHeight} 
                style={{ 
                    borderRadius: finalHeight / 2,
                    backgroundColor: value 
                        ? '#34C759' // Green when ON
                        : (isDark ? '#39393D' : '#E9E9EA') // Gray when OFF
                }}
                contentStyle={{ padding: 0 }}
                rainbowStrength={value ? 0.5 : 0.0}
                fillAlpha={0.0} // Use backgroundColor
                interactive={false}
            >
                <View style={styles.innerContainer}>
                    {/* Knob or Indicator */}
                    <Animated.View style={[
                        styles.indicator, 
                        isSegmented ? {
                            width: finalWidth / 2, 
                            height: finalHeight, 
                            borderRadius: finalHeight / 2,
                            backgroundColor: 'transparent',
                            borderWidth: 1.5,
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                        } : {
                            width: knobSize,
                            height: knobSize,
                            borderRadius: knobSize / 2,
                            backgroundColor: '#FFFFFF',
                            top: 2,
                            left: 2,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 2.5,
                            elevation: 2,
                        },
                        animatedStyle
                    ]} />

                    {/* Labels (only for segmented) */}
                    {isSegmented && (
                        <>
                            <View style={styles.labelContainer}>
                                <Text style={[
                                    styles.label, 
                                    { 
                                        color: !value ? '#007AFF' : (isDark ? '#888' : '#999'),
                                        fontWeight: !value ? 'bold' : 'normal'
                                    }
                                ]}>
                                    {labelA || 'A'}
                                </Text>
                            </View>
                            <View style={styles.labelContainer}>
                                <Text style={[
                                    styles.label, 
                                    { 
                                        color: value ? '#007AFF' : (isDark ? '#888' : '#999'),
                                        fontWeight: value ? 'bold' : 'normal'
                                    }
                                ]}>
                                    {labelB || 'B'}
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </ShabonCard>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        // 
    },
    innerContainer: {
        flex: 1,
        flexDirection: 'row',
        position: 'relative',
    },
    indicator: {
        position: 'absolute',
    },
    labelContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    label: {
        fontSize: 14,
    }
});
