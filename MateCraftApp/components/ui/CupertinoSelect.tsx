import React, { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { ShabonButton } from '@/components/SUI/ShabonButton';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface Option {
  label: string;
  value: string;
}

interface CupertinoSelectProps {
  label?: string;
  value: string;
  options: Option[];
  onValueChange: (value: string) => void;
  placeholder?: string;
}

/**
 * iOSスタイルのセレクト（ピッカー）
 * モーダルを使用して選択肢を表示します。
 */
export const CupertinoSelect: React.FC<CupertinoSelectProps> = ({
  label,
  value,
  options,
  onValueChange,
  placeholder = 'Select',
}) => {
  const [visible, setVisible] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      )}
      <ShabonButton
        title={selectedOption ? selectedOption.label : placeholder}
        onPress={() => setVisible(true)}
        variant="secondary"
        style={styles.button}
        contentStyle={{ justifyContent: 'flex-start', paddingHorizontal: 12 }}
        textStyle={{ color: selectedOption ? theme.text : '#8E8E93' }}
        height={44}
      />

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
            <View style={styles.header}>
              <ShabonButton title="完了" onPress={() => setVisible(false)} variant="outline" height={32} width={60} />
            </View>
            <FlatList
              data={options}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: pressed ? (isDark ? '#2C2C2E' : '#E5E5EA') : 'transparent' }
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setVisible(false);
                  }}
                >
                  <Text style={[
                    styles.optionText, 
                    { color: theme.text, fontWeight: item.value === value ? '600' : '400' }
                  ]}>
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Text style={{ color: '#007AFF' }}>✓</Text>
                  )}
                </Pressable>
              )}
            />
          </SafeAreaView>
        </Pressable>
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
  button: {
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    height: 44,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    maxHeight: '50%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  option: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  optionText: {
    fontSize: 17,
  },
});
