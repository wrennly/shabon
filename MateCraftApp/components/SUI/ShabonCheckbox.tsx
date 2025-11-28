import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { ShabonCard } from './ShabonCard';

interface ShabonCheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    size?: number;
    style?: ViewStyle;
}

export const ShabonCheckbox: React.FC<ShabonCheckboxProps> = ({
    checked,
    onChange,
    label,
    size = 28,
    style
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <TouchableOpacity 
            style={[styles.container, style]} 
            onPress={() => onChange(!checked)}
            activeOpacity={0.7}
        >
            <ShabonCard 
                width={size} 
                height={size} 
                style={{ 
                    borderRadius: size/2, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'
                }}
                contentStyle={{ padding: 0 }} // Remove padding for small checkbox
                rainbowStrength={0.0}
                fillAlpha={0.0}
                interactive={false}
            >
                {checked && (
                    <Text style={{ 
                        fontSize: size * 0.6, 
                        color: isDark ? '#FFF' : '#333',
                        fontWeight: 'bold'
                    }}>
                        ✓
                    </Text>
                )}
            </ShabonCard>
            {label && (
                <Text style={[
                    styles.label, 
                    { color: isDark ? '#EEE' : '#444' }
                ]}>
                    {label}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
    }
});
