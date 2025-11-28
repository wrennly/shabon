import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View, ViewStyle, DimensionValue } from 'react-native';
import { ShabonCard } from './ShabonCard';
import { Colors } from '@/constants/theme';

interface Option {
    label: string;
    value: string;
}

interface ShabonSelectProps {
    options: Option[];
    value: string;
    onSelect: (value: string) => void;
    width?: number | string;
    height?: number;
    placeholder?: string;
    style?: ViewStyle;
    label?: string;
}

export const ShabonSelect: React.FC<ShabonSelectProps> = ({
    options,
    value,
    onSelect,
    width = '100%',
    height = 50,
    placeholder = 'Select...',
    style,
    label
}) => {
    const [visible, setVisible] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];

    const selectedOption = options.find(opt => opt.value === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;

    return (
        <View style={[styles.container, { width: width as DimensionValue }]}>
            {label && (
                <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            )}
            <TouchableOpacity onPress={() => setVisible(true)} activeOpacity={0.8}>
                <ShabonCard 
                    width="100%" 
                    height={height} 
                    style={StyleSheet.flatten([
                        styles.trigger, 
                        { 
                            borderRadius: height / 2,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F2F4F8'
                        },
                        style
                    ])}
                    contentStyle={{ padding: 0 }} // Remove default padding
                    rainbowStrength={0.0} // No rainbow for select trigger
                    fillAlpha={0.0} // Transparent center (using backgroundColor instead)
                    interactive={false}
                >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20 }}>
                        <Text style={[styles.text, { color: selectedOption ? (isDark ? '#FFF' : '#333') : '#8E8E93' }]}>
                            {displayText}
                        </Text>
                        <Text style={[styles.icon, { color: isDark ? '#AAA' : '#666' }]}>▼</Text>
                    </View>
                </ShabonCard>
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
                    <TouchableOpacity 
                        style={StyleSheet.absoluteFill} 
                        onPress={() => setVisible(false)} 
                    />
                    
                    <View style={styles.modalContent}>
                        <ShabonCard 
                            width={300} 
                            height={Math.min(options.length * 50 + 20, 400)} 
                            style={{ 
                                borderRadius: 20,
                                backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7'
                            }}
                            contentStyle={{ padding: 0 }}
                            rainbowStrength={0.0} // No rainbow for dropdown list
                            fillAlpha={0.0} // Transparent center
                        >
                            <FlatList
                                data={options}
                                keyExtractor={(item) => item.value}
                                contentContainerStyle={{ padding: 10 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.optionItem,
                                            { 
                                                backgroundColor: item.value === value ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                                                borderRadius: 12,
                                                marginBottom: 4
                                            }
                                        ]}
                                        onPress={() => {
                                            onSelect(item.value);
                                            setVisible(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.optionText, 
                                            { 
                                                color: isDark ? '#FFF' : '#333',
                                                fontWeight: item.value === value ? 'bold' : 'normal'
                                            }
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {item.value === value && <Text style={{ color: isDark ? '#FFF' : '#333' }}>✓</Text>}
                                    </TouchableOpacity>
                                )}
                            />
                        </ShabonCard>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        marginBottom: 6,
        marginLeft: 4,
        fontWeight: '500',
        opacity: 0.8,
    },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    text: {
        fontSize: 16,
    },
    icon: {
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    modalContent: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
    },
    optionText: {
        fontSize: 16,
    }
});
