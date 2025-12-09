import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity, Alert, Modal, Pressable } from 'react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { apiClient, authService } from '@/services/api';
import { AppHeader } from '@/components/app-header';
import { ShabonButton } from '@/components/SUI/ShabonButton';
import { ShabonInput } from '@/components/SUI/ShabonInput';
import { ShabonSwitch } from '@/components/SUI/ShabonSwitch';
import { ShabonSelect } from '@/components/SUI/ShabonSelect';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

import { FloatingSettingsButton } from '@/components/FloatingSettingsButton';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ShabonBackground } from '@/components/SUI/ShabonBackground';

interface AttributeOption {
  value: string;
  display_name: string;
}

interface SchemaAttribute {
  key: string;
  display_name: string;
  type: 'text' | 'select' | 'textarea';
  display_order: number;
  category?: string;
  options?: AttributeOption[];
}

interface SettingInput {
  key: string;
  value: string;
}

// スキーマのキャッシュ（一度取得したら再利用）
let cachedSchema: SchemaAttribute[] | null = null;

export default function MateBuilderScreen() {
  const isFocused = useIsFocused();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const [schema, setSchema] = useState<SchemaAttribute[]>([]);
  const [formState, setFormState] = useState<Record<string, string>>({});
  const [mateName, setMateName] = useState('');
  const [mateId, setMateId] = useState('');
  const [mateIdError, setMateIdError] = useState('');
  const [mateIdChecking, setMateIdChecking] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitMessage, setSubmitMessage] = useState('');
  const [showDerivativeModal, setShowDerivativeModal] = useState(false);
  const [agreedToDerivative, setAgreedToDerivative] = useState(false);
  
  // Menu state for select inputs (No longer needed for ShabonSelect)
  // const [menuVisible, setMenuVisible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isFocused) {
      checkAuthAndLoad();
    }
  }, [isFocused]);

  const checkAuthAndLoad = async () => {
    const isLoggedIn = await authService.isLoggedIn();
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    loadSchema();
  };

  useEffect(() => {
    if (schema.length > 0 && !mateId) {
      setMateId(generateRandomMateId());
    }
  }, [schema]);

  // mate_id重複チェック
  useEffect(() => {
    if (!mateId || mateId.length < 3) {
      setMateIdError('');
      return;
    }

    const timer = setTimeout(() => {
      setMateIdChecking(true);
      apiClient
        .get(`/mates/check-mate-id/${mateId}`)
        .then((response) => {
          if (!response.data.available) {
            setMateIdError(response.data.reason || 'このIDは使用できません');
          } else {
            setMateIdError('');
          }
          setMateIdChecking(false);
        })
        .catch(() => {
          setMateIdError('IDチェックに失敗しました');
          setMateIdChecking(false);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [mateId]);

  const generateRandomMateId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const loadSchema = async () => {
    try {
      // キャッシュがあればそれを使う
      if (cachedSchema) {
        setSchema(cachedSchema);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const response = await apiClient.get('/settings/schema');
      const sortedAttributes = response.data.attributes.sort(
        (a: SchemaAttribute, b: SchemaAttribute) => a.display_order - b.display_order
      );
      
      // キャッシュに保存
      cachedSchema = sortedAttributes;
      setSchema(sortedAttributes);
    } catch (error: any) {
      console.error('Failed to load schema:', error);
      if (error.response?.status === 401) {
        router.replace('/login');
        return;
      }
      setSubmitMessage('スキーマの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  // const toggleMenu = (key: string) => {
  //   setMenuVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  // };

  // const handleSelectOption = (key: string, value: string) => {
  //   handleInputChange(key, value);
  //   setMenuVisible((prev) => ({ ...prev, [key]: false }));
  // };

  const handleSubmit = async () => {
    if (mateIdError) {
      setSubmitMessage('メイトIDを修正してください');
      return;
    }

    if (!mateName.trim()) {
      setSubmitMessage('メイト名を入力してください');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    const settingsPayload: SettingInput[] = [];
    for (const key in formState) {
      if (formState[key]) {
        settingsPayload.push({ key, value: formState[key] });
      }
    }

    try {
      const response = await apiClient.post('/mates/', {
        mate_name: mateName,
        mate_id: mateId,
        settings: settingsPayload,
        is_public: isPublic,
      });

      const newMate = response.data;
      router.replace(`/chat/${newMate.id}`);
    } catch (error: any) {
      console.error('Failed to create mate:', error);
      setSubmitMessage(
        `メイトづくりに失敗... ${error.response?.data?.detail || error.message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInput = (attr: SchemaAttribute) => {
    const value = formState[attr.key] || '';

    if (attr.type === 'select' && attr.options) {
      // 6個以下のオプションは、横スクロールのピル型選択バーにする
      if (attr.options.length <= 6) {
        return (
          <View key={attr.key} style={styles.pillSection}>
            <Text style={[styles.pillLabel, { color: theme.text }]}>{attr.display_name}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillScrollContent}
            >
              {attr.options.map((opt) => {
                const selected = value === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    activeOpacity={0.9}
                    onPress={() => {
                      // 選択済みなら解除、未選択なら選択
                      if (selected) {
                        handleInputChange(attr.key, '');
                      } else {
                        handleInputChange(attr.key, opt.value);
                      }
                    }}
                    style={{ marginRight: 12 }}
                  >
                    <View
                      style={[
                        styles.pill,
                        selected && styles.pillSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: selected ? '#000000' : theme.text },
                        ]}
                      >
                        {opt.display_name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );
      }

      return (
        <ShabonSelect
          key={attr.key}
          label={attr.display_name}
          value={value}
          options={attr.options.map(opt => ({ label: opt.display_name, value: opt.value }))}
          onSelect={(val) => handleInputChange(attr.key, val)}
          placeholder="選択してください"
        />
      );
    }

    if (attr.type === 'textarea') {
      return (
        <ShabonInput
          key={attr.key}
          label={attr.display_name}
          value={value}
          onChangeText={(text) => handleInputChange(attr.key, text)}
          style={styles.textArea}
          multiline
          numberOfLines={4}
        />
      );
    }

    return (
      <ShabonInput
        key={attr.key}
        label={attr.display_name}
        value={value}
        onChangeText={(text) => handleInputChange(attr.key, text)}
      />
    );
  };

  // 基本設定（display_order < 5）と詳細設定に分割
  const basicSettings = schema.filter((attr) => attr.display_order < 5);
  const advancedSettings = schema.filter((attr) => attr.display_order >= 5);

  return (
    <View style={styles.container}>
      <ShabonBackground />
      <FloatingSettingsButton />
      <AppHeader title="メイト作成" showLogo={false} />
      {loading ? (
        <View style={[styles.centerContainer, { backgroundColor: 'transparent' }]}>
            <ActivityIndicator size="large" color={theme.tint} />
            <Text style={[styles.loadingText, { color: theme.text }]}>読み込み中...</Text>
        </View>
      ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.innerContent}>
          
          {/* メイトID */}
          <View style={styles.mateIdContainer}>
            <View>
              <ShabonInput
                label="メイトID *"
                value={mateId}
                onChangeText={setMateId}
                editable={!mateIdChecking}
                placeholder="英数字8文字以上"
              />
              {mateIdChecking && (
                <View style={styles.loadingIcon}>
                  <ActivityIndicator size="small" color={theme.tint} />
                </View>
              )}
            </View>
            {mateIdError ? (
              <Text style={[styles.helperText, { color: '#FF3B30' }]}>{mateIdError}</Text>
            ) : mateId ? (
              <Text style={[styles.helperText, { color: '#34C759' }]}>このIDは利用可能です</Text>
            ) : null}
          </View>

          {/* メイト名 */}
          <View style={styles.inputContainer}>
            <ShabonInput
              label="メイト名 *"
              value={mateName}
              onChangeText={setMateName}
              placeholder="メイトの名前"
            />
          </View>

          {/* 基本設定 */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            基本設定
          </Text>
          {basicSettings.map((attr) => renderInput(attr))}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* 詳細設定 */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            詳細設定
          </Text>
          {advancedSettings.map((attr) => renderInput(attr))}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* 公開設定 */}
          <View style={styles.switchContainer}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>公開設定</Text>
            <ShabonSwitch 
              value={isPublic} 
              onValueChange={(value) => {
                if (value) {
                  // 先にトグルをオンにして、少し遅延してからモーダルを表示（毎回）
                  setIsPublic(true);
                  setTimeout(() => {
                    setShowDerivativeModal(true);
                  }, 300);
                } else {
                  setIsPublic(false);
                }
              }} 
            />
          </View>
          <Text style={[styles.helperText, { color: theme.icon }]}>
            公開すると他のユーザーもこのメイトとチャットできます
          </Text>

          {/* エラーメッセージ */}
          {submitMessage ? (
            <Text style={styles.errorText}>
              {submitMessage}
            </Text>
          ) : null}

          {/* Padding for floating button */}
          <View style={{ height: 80 }} />
          </View>
        </ScrollView>

        {/* メイト作成ボタン（画面下部中央の横長ガラスボタン） */}
        <View style={styles.floatingButtonContainer}>
          <Pressable onPress={handleSubmit} disabled={isSubmitting || !!mateIdError}>
            {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
              <GlassView style={styles.craftButtonGlass} isInteractive>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={22} color="#000000" />
                    <Text style={styles.craftButtonText}>メイトクラフト</Text>
                  </>
                )}
              </GlassView>
            ) : (
              <BlurView
                intensity={Platform.OS === 'ios' ? 28 : 18}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  styles.floatingBlurBar,
                  { backgroundColor: isDark ? 'rgba(44,44,46,0.45)' : 'rgba(255,255,255,0.25)' },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={theme.tint} />
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={22} color={theme.tint} />
                    <Text style={[styles.craftButtonText, { color: theme.tint }]}>メイトクラフト</Text>
                  </>
                )}
              </BlurView>
            )}
          </Pressable>
        </View>

        {/* 二次創作禁止同意モーダル */}
        <Modal
          visible={showDerivativeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDerivativeModal(false)}
        >
          <View style={styles.modalOverlay}>
            {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
              <GlassView style={styles.modalContentGlass}>
                <Text style={[styles.modalTitle, { color: '#000000' }]}>
                  公開に関する注意事項
                </Text>
                
                <Text style={[styles.modalText, { color: '#000000' }]}>
                  メイトを公開する前に、以下の内容を確認してください。
                </Text>
                
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: '#000000' }]}>
                    ⚠️ 二次創作について
                  </Text>
                  <Text style={[styles.modalSectionText, { color: 'rgba(0,0,0,0.6)' }]}>
                    既存のキャラクター（アニメ、漫画、ゲーム、小説など）を元にしたメイトの公開は、著作権法に違反する可能性があります。
                  </Text>
                  <Text style={[styles.modalSectionText, { color: 'rgba(0,0,0,0.6)' }]}>
                    二次創作メイトは「非公開」でのみご利用ください。
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: '#000000' }]}>
                    ✅ 公開できるメイト
                  </Text>
                  <Text style={[styles.modalSectionText, { color: 'rgba(0,0,0,0.6)' }]}>
                    • オリジナルキャラクター{'\n'}
                    • 自分で考えた設定のメイト{'\n'}
                    • 著作権を侵害しないメイト
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: '#000000' }]}>
                    ❌ 公開できないメイト
                  </Text>
                  <Text style={[styles.modalSectionText, { color: 'rgba(0,0,0,0.6)' }]}>
                    • アニメ・漫画のキャラクター{'\n'}
                    • ゲームのキャラクター{'\n'}
                    • 実在の人物{'\n'}
                    • その他、著作権を侵害するもの
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonCancelGlass]}
                    onPress={() => {
                      // モーダルを閉じてからトグルを戻す
                      setShowDerivativeModal(false);
                      setTimeout(() => {
                        setIsPublic(false);
                      }, 200);
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: '#000000' }]}>
                      キャンセル
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonAgree]}
                    onPress={() => {
                      setAgreedToDerivative(true);
                      setShowDerivativeModal(false);
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                      同意して公開
                    </Text>
                  </Pressable>
                </View>
              </GlassView>
            ) : (
              <View style={[
                styles.modalContent,
                { backgroundColor: isDark ? 'rgba(44,44,46,0.95)' : 'rgba(255,255,255,0.95)' }
              ]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  公開に関する注意事項
                </Text>
                
                <Text style={[styles.modalText, { color: theme.text }]}>
                  メイトを公開する前に、以下の内容を確認してください。
                </Text>
                
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: theme.text }]}>
                    ⚠️ 二次創作について
                  </Text>
                  <Text style={[styles.modalSectionText, { color: theme.icon }]}>
                    既存のキャラクター（アニメ、漫画、ゲーム、小説など）を元にしたメイトの公開は、著作権法に違反する可能性があります。
                  </Text>
                  <Text style={[styles.modalSectionText, { color: theme.icon }]}>
                    二次創作メイトは「非公開」でのみご利用ください。
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: theme.text }]}>
                    ✅ 公開できるメイト
                  </Text>
                  <Text style={[styles.modalSectionText, { color: theme.icon }]}>
                    • オリジナルキャラクター{'\n'}
                    • 自分で考えた設定のメイト{'\n'}
                    • 著作権を侵害しないメイト
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: theme.text }]}>
                    ❌ 公開できないメイト
                  </Text>
                  <Text style={[styles.modalSectionText, { color: theme.icon }]}>
                    • アニメ・漫画のキャラクター{'\n'}
                    • ゲームのキャラクター{'\n'}
                    • 実在の人物{'\n'}
                    • その他、著作権を侵害するもの
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      // モーダルを閉じてからトグルを戻す
                      setShowDerivativeModal(false);
                      setTimeout(() => {
                        setIsPublic(false);
                      }, 200);
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: theme.text }]}>
                      キャンセル
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonAgree]}
                    onPress={() => {
                      setAgreedToDerivative(true);
                      setShowDerivativeModal(false);
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                      同意して公開
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </Modal>
      </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 100, // Add more padding for bottom tab bar
  },
  innerContent: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  mateIdContainer: {
    marginBottom: 12,
  },
  loadingIcon: {
    position: 'absolute',
    right: 12,
    top: 38, // Adjust based on label height + input padding
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 17,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 17,
  },
  submitButtonContainer: {
    marginTop: 24,
    marginBottom: 32,
    alignItems: 'flex-end',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 140 : 96,
    left: 0,
    right: 0,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  errorText: {
    color: '#FF3B30',
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  pillSection: {
    marginBottom: 20,
  },
  pillLabel: {
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '500',
    opacity: 0.9,
  },
  pillScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.25)',
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderColor: '#007AFF',
  },
  pillText: {
    fontSize: 15,
    fontWeight: '400',
  },
  floatingBlurBar: {
    width: 280,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  craftButtonGlass: {
    width: 280,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  craftButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalContentGlass: {
    width: '90%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalScrollView: {
    maxHeight: 300,
    marginBottom: 20,
  },
  modalText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalSection: {
    marginBottom: 16,
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
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  modalButtonCancelGlass: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalButtonAgree: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
