import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Switch, View, ViewStyle, Platform } from 'react-native';

interface ShabonSwitchProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    style?: ViewStyle;
}

export const ShabonSwitch: React.FC<ShabonSwitchProps> = ({
    value,
    onValueChange,
    style
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View style={[styles.container, style]}>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ 
                    false: isDark ? '#39393D' : '#E9E9EA', 
                    true: '#34C759' 
                }}
                thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                ios_backgroundColor={isDark ? '#39393D' : '#E9E9EA'}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        // 
    },
});
