import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Appbar,
  ActivityIndicator,
  HelperText,
  Switch,
  Divider,
  Chip,
  Menu,
  Card,
  useTheme,
} from 'react-native-paper';
import { router } from 'expo-router';
import { apiClient } from '@/services/api';
import { AppHeader } from '@/components/app-header';

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
  const theme = useTheme();
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
  
  // Menu state for select inputs
  const [menuVisible, setMenuVisible] = useState<Record<string, boolean>>({});

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

  const toggleMenu = (key: string) => {
    setMenuVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectOption = (key: string, value: string) => {
    handleInputChange(key, value);
    setMenuVisible((prev) => ({ ...prev, [key]: false }));
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
      const selectedOption = attr.options.find((opt) => opt.value === value);
      return (
        <View key={attr.key} style={styles.inputContainer}>
          <Text variant="labelLarge" style={styles.label}>
            {attr.display_name}
          </Text>
          <Menu
            visible={menuVisible[attr.key] || false}
            onDismiss={() => toggleMenu(attr.key)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => toggleMenu(attr.key)}
                style={styles.selectButton}
              >
                {selectedOption ? selectedOption.display_name : '選択してください'}
              </Button>
            }
          >
            {attr.options.map((option) => (
              <Menu.Item
                key={option.value}
                onPress={() => handleSelectOption(attr.key, option.value)}
                title={option.display_name}
              />
            ))}
          </Menu>
        </View>
      );
    }

    if (attr.type === 'textarea') {
      return (
        <View key={attr.key} style={styles.inputContainer}>
          <TextInput
            label={attr.display_name}
            value={value}
            onChangeText={(text) => handleInputChange(attr.key, text)}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.textArea}
            outlineStyle={styles.inputOutline}
          />
        </View>
      );
    }

    return (
      <View key={attr.key} style={styles.inputContainer}>
        <TextInput
          label={attr.display_name}
          value={value}
          onChangeText={(text) => handleInputChange(attr.key, text)}
          mode="outlined"
          outlineStyle={styles.inputOutline}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // 基本設定（display_order < 5）と詳細設定に分割
  const basicSettings = schema.filter((attr) => attr.display_order < 5);
  const advancedSettings = schema.filter((attr) => attr.display_order >= 5);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="作成" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* メイトID */}
          <View style={styles.mateIdContainer}>
            <TextInput
              label="メイトID *"
              value={mateId}
              onChangeText={setMateId}
              mode="outlined"
              error={!!mateIdError}
              disabled={mateIdChecking}
              outlineStyle={styles.inputOutline}
              style={styles.compactInput}
              dense
              right={
                mateIdChecking ? (
                  <TextInput.Icon icon={() => <ActivityIndicator size={20} />} />
                ) : undefined
              }
            />
            {mateIdError && <HelperText type="error">{mateIdError}</HelperText>}
            {!mateIdError && mateId && (
              <HelperText type="info">このIDは利用可能です</HelperText>
            )}
          </View>

          {/* メイト名 */}
          <View style={styles.inputContainer}>
            <TextInput
              label="メイト名 *"
              value={mateName}
              onChangeText={setMateName}
              mode="outlined"
              outlineStyle={styles.inputOutline}
            />
          </View>

          {/* 基本設定 */}
          <Text variant="titleMedium" style={styles.sectionTitle}>
            基本設定
          </Text>
          {basicSettings.map((attr) => renderInput(attr))}

          <Divider style={styles.divider} />

          {/* 詳細設定 */}
          <Text variant="titleMedium" style={styles.sectionTitle}>
            詳細設定
          </Text>
          {advancedSettings.map((attr) => renderInput(attr))}

          <Divider style={styles.divider} />

          {/* 公開設定 */}
          <View style={styles.switchContainer}>
            <Text variant="bodyLarge">公開設定</Text>
            <Switch value={isPublic} onValueChange={setIsPublic} />
          </View>
          <HelperText type="info">
            公開すると他のユーザーもこのメイトとチャットできます
          </HelperText>

          {/* エラーメッセージ */}
          {submitMessage && (
            <Text variant="bodyMedium" style={styles.errorText}>
              {submitMessage}
            </Text>
          )}

          {/* 送信ボタン */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || !!mateIdError}
            style={styles.submitButton}
          >
            メイトを作成
          </Button>
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
  },
  inputContainer: {
    marginBottom: 16,
  },
  mateIdContainer: {
    marginBottom: 12,
  },
  compactInput: {
    height: 30,
  },
  label: {
    marginBottom: 8,
  },
  selectButton: {
    justifyContent: 'center',
  },
  textArea: {
    minHeight: 100,
  },
  inputOutline: {
    borderRadius: 12,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 16,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 24,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 32,
  },
  errorText: {
    color: '#d32f2f',
    marginTop: 16,
    textAlign: 'center',
  },
});
