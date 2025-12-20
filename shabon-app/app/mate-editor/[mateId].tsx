import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Text, TouchableOpacity, ActivityIndicator, Pressable, Modal, Image } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api';
import { ShabonInput } from '@/components/SUI/ShabonInput';
import { ShabonButton } from '@/components/SUI/ShabonButton';
import { ShabonSwitch } from '@/components/SUI/ShabonSwitch';
import { ShabonSelect } from '@/components/SUI/ShabonSelect';
import { ShabonBackground } from '@/components/SUI/ShabonBackground';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { BackButton } from '@/components/BackButton';
import { PublicSettingsModal } from '@/components/PublicSettingsModal';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { logToDiscord, logErrorToDiscord, logSuccessToDiscord } from '@/utils/discord-logger';

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

interface MateDetails {
  mate_name: string;
  mate_id: string;
  is_public: boolean;
  settings: Array<{ key: string; value: string }>;
  image_url?: string;
}

export default function MateEditorScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { mateId: paramMateId } = useLocalSearchParams<{ mateId: string }>();
  
  const [schema, setSchema] = useState<SchemaAttribute[]>([]);
  const [formState, setFormState] = useState<Record<string, string>>({});
  const [mateName, setMateName] = useState('');
  const [mateId, setMateId] = useState('');
  const [originalMateId, setOriginalMateId] = useState('');
  const [mateIdError, setMateIdError] = useState('');
  const [mateIdChecking, setMateIdChecking] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitMessage, setSubmitMessage] = useState('');
  const [showDerivativeModal, setShowDerivativeModal] = useState(false);
  const [agreedToDerivative, setAgreedToDerivative] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  
  useEffect(() => {
    loadSchema();
    if (paramMateId) {
      loadMateDetails();
    }
  }, [paramMateId]);

  // mate_id重複チェック（元のIDと異なる場合のみ）
  useEffect(() => {
    if (!mateId || mateId === originalMateId || mateId.length < 3) {
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
  }, [mateId, originalMateId]);

  const loadSchema = async () => {
    try {
      const response = await apiClient.get('/settings/schema');
      const sortedAttributes = response.data.attributes.sort(
        (a: SchemaAttribute, b: SchemaAttribute) => a.display_order - b.display_order
      );
      setSchema(sortedAttributes);
    } catch (error) {
      console.error('Failed to load schema:', error);
    }
  };

  const loadMateDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/mates/${paramMateId}/details`);
      const details: MateDetails = response.data;

      const loadedState: Record<string, string> = {};
      details.settings.forEach((setting) => {
        loadedState[setting.key] = setting.value;
      });

      setFormState(loadedState);
      setMateName(details.mate_name);
      setMateId(details.mate_id || '');
      setOriginalMateId(details.mate_id || '');
      setIsPublic(details.is_public);
      
      // Load image if exists
      if (details.image_url) {
        setImageUri(details.image_url);
      }
    } catch (error) {
      console.error('Failed to load mate details:', error);
      setSubmitMessage('メイト情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const optimizeImage = async (uri: string): Promise<string> => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      console.error('Image optimization failed:', error);
      return uri;
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', 'ギャラリーへのアクセス権限を許可してください');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      exif: false,
    });

    if (!result.canceled && result.assets[0]) {
      const optimizedUri = await optimizeImage(result.assets[0].uri);
      setImageUri(optimizedUri);
      
      // Upload immediately if mate exists
      if (paramMateId) {
        await uploadImage(optimizedUri, Number(paramMateId));
      }
    }
  };

  const uploadImage = async (uri: string, mateId: number) => {
    setImageUploading(true);
    try {
      await logToDiscord('📸 画像アップロード開始', { 
        uri: uri.substring(0, 50) + '...', 
        mateId,
        platform: Platform.OS 
      });
      
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      await logToDiscord('📦 FormData準備完了', { 
        filename, 
        type,
        processedUri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri
      });

      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type,
      } as any);

      await logToDiscord('📡 /mates/{id}/upload-image APIコール開始', { endpoint: `/mates/${mateId}/upload-image` });
      
      const response = await apiClient.post(`/mates/${mateId}/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await logSuccessToDiscord('✅ 画像アップロード成功', { 
        imageUrl: response.data.image_url 
      });

      if (response.data.image_url) {
        setImageUri(response.data.image_url);
      }
    } catch (error: any) {
      await logErrorToDiscord('❌ 画像アップロード失敗', error);
      Alert.alert('エラー', '画像のアップロードに失敗しました');
    } finally {
      setImageUploading(false);
    }
  };

  const deleteImage = async () => {
    if (!paramMateId) return;

    Alert.alert(
      '画像を削除',
      '本当に画像を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/mates/${paramMateId}/image`);
              setImageUri(null);
              Alert.alert('成功', '画像を削除しました');
            } catch (error: any) {
              console.error('Image deletion failed:', error);
              Alert.alert('エラー', '画像の削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const handlePublicToggle = (value: boolean) => {
    if (value && !agreedToDerivative) {
      // 公開ONにする場合、モーダルを表示
      setIsPublic(true);
      setTimeout(() => {
        setShowDerivativeModal(true);
      }, 300);
    } else {
      // 公開OFFにする場合、または既に同意済みの場合
      setIsPublic(value);
    }
  };

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
      await apiClient.put(`/mates/${paramMateId}`, {
        mate_name: mateName,
        mate_id: mateId,
        settings: settingsPayload,
        is_public: isPublic,
      });

      Alert.alert('成功', 'メイトを更新しました', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Failed to update mate:', error);
      setSubmitMessage(
        `更新に失敗しました ${error.response?.data?.detail || error.message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'メイトを削除',
      '本当にこのメイトを削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/mates/${paramMateId}`);
              Alert.alert('削除完了', 'メイトを削除しました', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/chat') },
              ]);
            } catch (error: any) {
              console.error('Failed to delete mate:', error);
              Alert.alert('エラー', '削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const renderInput = (attr: SchemaAttribute) => {
    const value = formState[attr.key] || '';

    if (attr.type === 'select' && attr.options) {
      // 6個以下ならスライド式（pill）、7個以上ならリストボックス
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
                          { color: selected ? '#000000' : '#8E8E93' },
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

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
          <ShabonBackground />
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.text }]}>読み込み中...</Text>
        </View>
      </>
    );
  }

  const basicSettings = schema.filter((attr) => attr.display_order < 5);
  const advancedSettings = schema.filter((attr) => attr.display_order >= 5);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ShabonBackground />
        
        {/* ヘッダー */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <BackButton onPress={() => router.back()} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>{mateName || 'メイトを編集'}</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButtonContainer}>
            {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
              <GlassView style={styles.deleteButtonGlass} isInteractive>
                <View style={styles.deleteButtonInner}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </View>
              </GlassView>
            ) : (
              <BlurView
                intensity={Platform.OS === 'ios' ? 28 : 18}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  styles.deleteButtonBlur,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </BlurView>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 20 }]}>
            {/* 画像セクション */}
            <View style={styles.imageSection}>
              {imageUri ? (
                <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <View style={styles.imageEditOverlay}>
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={pickImage} 
                  style={styles.imageContainer}
                  disabled={imageUploading}
                >
                  {imageUploading ? (
                    <View style={styles.imagePreview}>
                      <ActivityIndicator size="large" color={theme.tint} />
                    </View>
                  ) : (
                    <View style={styles.imagePreview}>
                      <Ionicons name="person" size={40} color={theme.icon} />
                    </View>
                  )}
                  <View style={styles.imageEditOverlay}>
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              )}
              {imageUri && (
                <TouchableOpacity onPress={deleteImage} style={styles.deleteImageButton}>
                  <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>

            {/* メイトID */}
            <View style={styles.inputContainer}>
              <View>
                <ShabonInput
                  label="メイトID *"
                  value={mateId}
                  onChangeText={setMateId}
                  editable={!mateIdChecking}
                />
                {mateIdChecking && (
                  <View style={styles.loadingIcon}>
                    <ActivityIndicator size="small" color={theme.tint} />
                  </View>
                )}
              </View>
              {mateIdError ? (
                <Text style={[styles.helperText, { color: '#FF3B30' }]}>{mateIdError}</Text>
              ) : mateId && mateId !== originalMateId ? (
                <Text style={[styles.helperText, { color: '#34C759' }]}>このIDは利用可能です</Text>
              ) : null}
            </View>

            {/* メイト名 */}
            <View style={styles.inputContainer}>
              <ShabonInput
                label="メイト名 *"
                value={mateName}
                onChangeText={(text) => {
                  setMateName(text);
                  if (text.trim()) {
                    setSubmitMessage('');
                  }
                }}
              />
            </View>

            {/* 基本設定 */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              基本設定
            </Text>
            {basicSettings.map((attr) => renderInput(attr))}

            {/* 詳細設定 */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              詳細設定
            </Text>
            {advancedSettings.map((attr) => renderInput(attr))}

            {/* 公開設定 */}
            <View style={styles.publicSection}>
              <View style={styles.switchContainer}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>公開</Text>
                <ShabonSwitch value={isPublic} onValueChange={handlePublicToggle} />
              </View>
              <Text style={[styles.helperText, { color: theme.icon }]}>
                公開すると他のユーザーもこのメイトとチャットできます
              </Text>
            </View>

            {/* Padding for floating button */}
            <View style={{ height: 80 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* エラーメッセージ（ボタンの上） */}
        {submitMessage ? (
          <View style={styles.errorMessageContainer}>
            <Text style={styles.errorText}>
              {submitMessage}
            </Text>
          </View>
        ) : null}

        {/* 更新ボタン（画面下部中央） */}
        <View style={styles.floatingButtonContainer}>
          <Pressable onPress={handleSubmit} disabled={isSubmitting || !!mateIdError}>
            {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
              <GlassView style={styles.updateButtonGlass} isInteractive>
                <View style={[styles.updateButtonColorOverlay, { backgroundColor: isDark ? 'rgba(90, 200, 250, 0.25)' : 'rgba(0, 122, 255, 0.25)' }]}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#000000'} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
                      <Text style={[styles.updateButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>更新</Text>
                    </>
                  )}
                </View>
              </GlassView>
            ) : (
              <BlurView
                intensity={Platform.OS === 'ios' ? 28 : 18}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  styles.updateButtonBlur,
                  { backgroundColor: isDark ? 'rgba(90, 200, 250, 0.25)' : 'rgba(0, 122, 255, 0.25)' },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    <Text style={[styles.updateButtonText, { color: '#FFFFFF' }]}>更新</Text>
                  </>
                )}
              </BlurView>
            )}
          </Pressable>
        </View>

        {/* 公開設定モーダル */}
        <PublicSettingsModal
          visible={showDerivativeModal}
          onCancel={() => {
            setShowDerivativeModal(false);
            setTimeout(() => {
              setIsPublic(false);
            }, 200);
          }}
          onAgree={() => {
            setAgreedToDerivative(true);
            setShowDerivativeModal(false);
          }}
        />
      </View>
    </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  deleteButtonContainer: {
    width: 44,
    height: 44,
  },
  deleteButtonGlass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  deleteButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  deleteButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Image section styles
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  deleteImageButton: {
    marginTop: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  loadingIcon: {
    position: 'absolute',
    right: 12,
    top: 38,
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
  publicSection: {
    marginTop: 24,
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
  // Pill styles (for 6 or fewer options)
  pillSection: {
    marginBottom: 16,
  },
  pillLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  pillScrollContent: {
    paddingRight: 16,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  pillSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: '#5AC8FA',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Floating button styles
  floatingButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  updateButtonGlass: {
    width: 280,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  updateButtonBlur: {
    width: 280,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  updateButtonColorOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorMessageContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 150 : 130,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});
