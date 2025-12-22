import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity, Alert, Modal, Pressable, Image } from 'react-native';
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
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { FloatingSettingsButton } from '@/components/FloatingSettingsButton';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ShabonBackground } from '@/components/SUI/ShabonBackground';
import { PublicSettingsModal } from '@/components/PublicSettingsModal';
import { getSchema, saveSchema } from '@/lib/database';
import { logToDiscord, logSuccessToDiscord, logErrorToDiscord } from '@/services/discord_logger';

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
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [currentMateId, setCurrentMateId] = useState<number | null>(null);
  
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
    console.log('🔍 [Craft] loadSchema START');
    try {
      console.log('🔍 [Craft] Calling logToDiscord...');
      await logToDiscord('📋 [Craft] スキーマ読み込み開始');
      console.log('🔍 [Craft] logToDiscord done');
      
      // 1. SQLiteキャッシュから即座に表示
      const cachedSchemaData = await getSchema();
      if (cachedSchemaData) {
        console.log('🔍 [Craft] Using SQLite cache:', cachedSchemaData?.length);
        await logToDiscord('💾 [Craft] SQLiteキャッシュから読み込み', { attributesCount: cachedSchemaData.length });
        setSchema(cachedSchemaData);
        setLoading(false);
        
        // メモリキャッシュにも保存
        cachedSchema = cachedSchemaData;
      }
      
      // 2. メモリキャッシュチェック（既にSQLiteから読み込んでいる場合はスキップ）
      if (cachedSchema && !cachedSchemaData) {
        console.log('🔍 [Craft] Using memory cache:', cachedSchema?.length);
        await logToDiscord('💾 [Craft] メモリキャッシュから読み込み', { attributesCount: cachedSchema.length });
        setSchema(cachedSchema);
        setLoading(false);
        return;
      }
      
      // 3. APIから最新データを取得（バックグラウンドで更新）
      console.log('🔍 [Craft] Fetching from API...');
      await logToDiscord('📡 [Craft] /settings/schema API呼び出し');
      const response = await apiClient.get('/settings/schema');
      await logSuccessToDiscord('✅ [Craft] スキーマ取得成功', { attributesCount: response.data.attributes.length });
      
      const sortedAttributes = response.data.attributes.sort(
        (a: SchemaAttribute, b: SchemaAttribute) => a.display_order - b.display_order
      );
      
      // 4. キャッシュに保存（メモリ＋SQLite）
      cachedSchema = sortedAttributes;
      await saveSchema(sortedAttributes);
      setSchema(sortedAttributes);
    } catch (error: any) {
      console.log('🔍 [Craft] ERROR:', error);
      // 502/503エラー（サーバー一時的ダウン）の場合は静かに処理
      if (error.response?.status === 502 || error.response?.status === 503) {
        console.log('⚠️ Server temporarily unavailable, using cache');
      } else {
        await logErrorToDiscord('🔴 [Craft] スキーマ読み込みエラー', error);
        console.error('Failed to load schema:', error);
        if (error.response?.status === 401) {
          router.replace('/login');
          return;
        }
        setSubmitMessage('スキーマの読み込みに失敗しました');
      }
    } finally {
      console.log('🔍 [Craft] loadSchema FINALLY');
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
      setCurrentMateId(newMate.id);
      
      // Upload image if selected
      if (imageUri) {
        await uploadImage(imageUri, newMate.id);
      }
      
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

  const optimizeImage = async (uri: string): Promise<string> => {
    try {
      // 画像を512x512にリサイズして圧縮
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 512, height: 512 } }],
        { 
          compress: 0.7, 
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      return manipResult.uri;
    } catch (error) {
      console.error('Image optimization failed:', error);
      return uri; // 最適化失敗時は元のURIを返す
    }
  };

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', 'ギャラリーへのアクセス権限を許可してください');
      return;
    }

    // Pick image with optimization
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8, // Image Pickerでの初期品質
      exif: false, // EXIF情報を削除してサイズ削減
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      // 画像を最適化（512x512にリサイズ＋圧縮）
      const optimizedUri = await optimizeImage(asset.uri);
      setImageUri(optimizedUri);
      
      // If we have a mate ID (after creation), upload immediately
      if (currentMateId) {
        await uploadImage(optimizedUri, currentMateId);
      }
    }
  };

  const uploadImage = async (uri: string, mateId: number) => {
    setImageUploading(true);
    try {
      // Create form data
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type,
      } as any);

      // Upload to backend
      const response = await apiClient.post(
        `/mates/${mateId}/upload-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        Alert.alert('成功', '画像をアップロードしました');
      }
    } catch (error: any) {
      console.error('Image upload failed:', error);
      Alert.alert('エラー', '画像のアップロードに失敗しました');
    } finally {
      setImageUploading(false);
    }
  };

  const deleteImage = async () => {
    if (!currentMateId) return;

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
              await apiClient.delete(`/mates/${currentMateId}/image`);
              setImageUri(null);
              Alert.alert('成功', '画像を削除しました');
            } catch (error) {
              console.error('Image deletion failed:', error);
              Alert.alert('エラー', '画像の削除に失敗しました');
            }
          },
        },
      ]
    );
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
                          { color: selected ? theme.glassText : '#8E8E93' },
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
          
          {/* 画像アップロード */}
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
              onChangeText={(text) => {
                setMateName(text);
                if (text.trim()) {
                  setSubmitMessage('');
                }
              }}
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

          {/* Padding for floating button */}
          <View style={{ height: 80 }} />
          </View>
        </ScrollView>

        {/* エラーメッセージ（ボタンの上） */}
        {submitMessage ? (
          <View style={styles.errorMessageContainer}>
            <Text style={styles.errorText}>
              {submitMessage}
            </Text>
          </View>
        ) : null}

        {/* メイト作成ボタン（画面下部中央の横長ガラスボタン） */}
        <View style={styles.floatingButtonContainer}>
          <Pressable onPress={handleSubmit} disabled={isSubmitting || !!mateIdError}>
            {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
              <GlassView style={styles.craftButtonGlass} isInteractive>
                <View style={[styles.craftButtonColorOverlay, { backgroundColor: isDark ? 'rgba(90, 200, 250, 0.25)' : 'rgba(0, 122, 255, 0.25)' }]}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#000000'} />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
                      <Text style={[styles.craftButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>メイト追加</Text>
                    </>
                  )}
                </View>
              </GlassView>
            ) : (
              <BlurView
                intensity={Platform.OS === 'ios' ? 28 : 18}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  styles.floatingBlurBar,
                  { backgroundColor: isDark ? 'rgba(90, 200, 250, 0.25)' : 'rgba(0, 122, 255, 0.25)' },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#000000'} />
                ) : (
                  <>
                    <Ionicons name="add" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
                    <Text style={[styles.craftButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>メイト追加</Text>
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
  },
  errorMessageContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 195 : 151,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#FF3B30',
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
    borderColor: '#5AC8FA',
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
    overflow: 'hidden',
  },
  craftButtonColorOverlay: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: 22,
  },
  addIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  craftButtonText: {
    fontSize: 17,
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
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  modalButtonCancelGlass: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalButtonCancelSimple: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalButtonAgree: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  imageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
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
});
