import React from 'react';
import { View, StyleSheet, Modal, Text, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface PublicSettingsModalProps {
  visible: boolean;
  onCancel: () => void;
  onAgree: () => void;
}

export function PublicSettingsModal({ visible, onCancel, onAgree }: PublicSettingsModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 80 : 60}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.modalContent,
              {
                backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.85)',
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.glassText }]}>
              公開設定について
            </Text>

            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: theme.glassText }]}>
                ⚠️ 著作権に関する注意
              </Text>
              <Text style={[styles.modalSectionText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                既存のキャラクター（アニメ、漫画、ゲーム、小説など）を元にしたメイトの公開は、著作権法に違反する可能性があります。
              </Text>
              <Text style={[styles.modalSectionText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                二次創作メイトは「非公開」でのみご利用ください。
              </Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: theme.glassText }]}>
                ✅ 公開できるメイト
              </Text>
              <Text style={[styles.modalSectionText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                • オリジナルキャラクター{'\n'}
                • 自分で考えた設定のメイト{'\n'}
                • 著作権を侵害しないメイト
              </Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: theme.glassText }]}>
                ❌ 公開できないメイト
              </Text>
              <Text style={[styles.modalSectionText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                • アニメ・漫画のキャラクター{'\n'}
                • ゲームのキャラクター{'\n'}
                • 実在の人物{'\n'}
                • その他、著作権を侵害するもの
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancelSimple]}
                onPress={onCancel}
              >
                <Text style={[styles.modalButtonText, { color: theme.glassText }]}>
                  キャンセル
                </Text>
              </Pressable>
              
              <Pressable
                style={[styles.modalButton, styles.modalButtonAgree]}
                onPress={onAgree}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  同意して公開
                </Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancelSimple: {
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
  },
  modalButtonAgree: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

