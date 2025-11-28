import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '@/services/api';
import { AppHeader } from '@/components/app-header';
import { ShabonButton } from '@/components/SUI/ShabonButton';
import { ShabonInput } from '@/components/SUI/ShabonInput';
import { ShabonSwitch } from '@/components/SUI/ShabonSwitch';
import { ShabonSelect } from '@/components/SUI/ShabonSelect';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

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

export default function MateBuilderScreen() {
  const colorScheme = useColorScheme();
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
  
  // Menu state for select inputs (No longer needed for ShabonSelect)
  // const [menuVisible, setMenuVisible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSchema();
  }, []);

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
      setLoading(true);
      const response = await apiClient.get('/settings/schema');
      const sortedAttributes = response.data.attributes.sort(
        (a: SchemaAttribute, b: SchemaAttribute) => a.display_order - b.display_order
      );
      setSchema(sortedAttributes);
    } catch (error) {
      console.error('Failed to load schema:', error);
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
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={[styles.loadingText, { color: theme.text }]}>読み込み中...</Text>
      </View>
    );
  }

  // 基本設定（display_order < 5）と詳細設定に分割
  const basicSettings = schema.filter((attr) => attr.display_order < 5);
  const advancedSettings = schema.filter((attr) => attr.display_order >= 5);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title="作成" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
            <ShabonSwitch value={isPublic} onValueChange={setIsPublic} />
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

          {/* 送信ボタン */}
          <View style={styles.submitButtonContainer}>
            <ShabonButton
              title="メイトを作成"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || !!mateIdError}
              variant="primary"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: 16,
    paddingBottom: 40,
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
  },
  errorText: {
    color: '#FF3B30',
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
  },
});
