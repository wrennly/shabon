import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, Platform, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { ShabonInput } from '@/components/SUI/ShabonInput';
import { ShabonBackground } from '@/components/SUI/ShabonBackground';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { apiClient } from '@/services/api';
import { PRIVACY_POLICY } from '@/constants/legal';
import { resetHeaderAnimation } from '@/components/app-header';
import { logToDiscord, logErrorToDiscord, logSuccessToDiscord } from '@/utils/discord-logger';

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [displayName, setDisplayName] = useState('');
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleOpenPrivacyPolicy = () => {
    setShowPrivacyModal(true);
  };

  const handleRegister = async () => {
    if (!displayName.trim()) {
      Alert.alert('エラー', 'ニックネームを入力してください');
      return;
    }
    if (!agreedToPrivacy) {
      Alert.alert('エラー', 'プライバシーポリシーに同意してください');
      return;
    }

    try {
      setSaving(true);
      await logToDiscord('📝 オンボーディング登録開始', { displayName: displayName.trim() });
      
      // バックエンドにユーザー情報を更新
      await apiClient.put('/users/me', {
        display_name: displayName.trim(),
      });
      
      await logSuccessToDiscord('✅ オンボーディング登録成功', { displayName: displayName.trim() });
      
      // チャット画面のヘッダーアニメーションをリセット
      resetHeaderAnimation();
      
      // チャット画面へ遷移
      await logToDiscord('➡️ チャット画面へ遷移');
      router.replace('/(tabs)/chat');
    } catch (error: any) {
      await logErrorToDiscord('🔴 ERROR: オンボーディング登録失敗', error);
      console.error('Registration failed:', error);
      Alert.alert('エラー', '登録に失敗しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const canRegister = displayName.trim().length > 0 && agreedToPrivacy;

  return (
    <View style={styles.container}>
      <ShabonBackground />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* タイトル */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>ようこそ！</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            メイトがあなたを呼ぶ名前を{'\n'}教えてください
          </Text>
        </View>

        {/* ニックネーム入力 */}
        <View style={styles.inputSection}>
          <ShabonInput
            label="ニックネーム"
            placeholder="例: けん、ゆうこ、たろう"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={20}
          />
          <Text style={[styles.hint, { color: theme.icon }]}>
            メイトがあなたを呼ぶときに使う名前です
          </Text>
        </View>

        {/* プライバシーポリシー同意 */}
        <View style={styles.agreementSection}>
          <Pressable 
            style={styles.checkboxRow}
            onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}
          >
            <View style={[
              styles.checkbox,
              agreedToPrivacy && styles.checkboxChecked,
              { borderColor: theme.icon }
            ]}>
              {agreedToPrivacy && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text style={[styles.agreementText, { color: theme.text }]}>
              <Text 
                style={[styles.linkText, { color: theme.tint }]}
                onPress={handleOpenPrivacyPolicy}
              >
                プライバシーポリシー
              </Text>
              に同意する
            </Text>
          </Pressable>
        </View>

        {/* 登録ボタン */}
        <View style={styles.buttonContainer}>
          <Pressable 
            onPress={handleRegister} 
            disabled={!canRegister || saving}
            style={{ opacity: (!canRegister || saving) ? 0.5 : 1 }}
          >
            {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
              <GlassView style={styles.registerButtonGlass} isInteractive>
                <Text style={[styles.registerButtonText, { color: theme.glassText }]}>
                  {saving ? '登録中...' : 'はじめる'}
                </Text>
              </GlassView>
            ) : (
              <View style={styles.registerButtonFallback}>
                <Text style={styles.registerButtonTextFallback}>
                  {saving ? '登録中...' : 'はじめる'}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* プライバシーポリシーモーダル */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { backgroundColor: colorScheme === 'dark' ? 'rgba(28,28,30,0.98)' : 'rgba(255,255,255,0.98)' }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                プライバシーポリシー
              </Text>
              <Pressable 
                onPress={() => setShowPrivacyModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.icon} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              <Text style={[styles.modalText, { color: theme.text }]}>
                {PRIVACY_POLICY}
              </Text>
            </ScrollView>

            <Pressable onPress={() => setShowPrivacyModal(false)}>
              {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
                <GlassView style={styles.modalButtonGlass} isInteractive>
                  <Text style={[styles.modalButtonTextGlass, { color: theme.glassText }]}>閉じる</Text>
                </GlassView>
              ) : (
                <View style={[styles.modalButton, { backgroundColor: theme.tint }]}>
                  <Text style={styles.modalButtonText}>閉じる</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 100 : 60,
    paddingBottom: 40,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputSection: {
    marginBottom: 32,
  },
  hint: {
    fontSize: 13,
    marginTop: 8,
    marginLeft: 4,
  },
  agreementSection: {
    marginBottom: 40,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  agreementText: {
    fontSize: 15,
    flex: 1,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  registerButtonGlass: {
    width: 200,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButtonFallback: {
    width: 200,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  registerButtonTextFallback: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonGlass: {
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  modalButtonTextGlass: {
    fontSize: 16,
    fontWeight: '600',
  },
});

