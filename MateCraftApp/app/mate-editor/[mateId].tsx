import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api';
import { ShabonInput } from '@/components/SUI/ShabonInput';
import { ShabonButton } from '@/components/SUI/ShabonButton';
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

interface MateDetails {
  mate_name: string;
  mate_id: string;
  is_public: boolean;
  settings: Array<{ key: string; value: string }>;
}

export default function MateEditorScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
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

  const basicSettings = schema.filter((attr) => attr.display_order < 5);
  const advancedSettings = schema.filter((attr) => attr.display_order >= 5);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>メイトを編集</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.inputContainer}>
            <ShabonInput
              label="メイト名 *"
              value={mateName}
              onChangeText={setMateName}
            />
          </View>

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

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            基本設定
          </Text>
          {basicSettings.map((attr) => renderInput(attr))}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            詳細設定
          </Text>
          {advancedSettings.map((attr) => renderInput(attr))}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.switchContainer}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>公開設定</Text>
            <ShabonSwitch value={isPublic} onValueChange={setIsPublic} />
          </View>
          <Text style={[styles.helperText, { color: theme.icon }]}>
            公開すると他のユーザーもこのメイトとチャットできます
          </Text>

          {submitMessage ? (
            <Text style={styles.errorText}>
              {submitMessage}
            </Text>
          ) : null}

          <View style={styles.submitButtonContainer}>
            <ShabonButton
              title="更新する"
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
  header: {
    height: Platform.OS === 'ios' ? 44 + 48 : 56,
    paddingTop: Platform.OS === 'ios' ? 48 : 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 8,
    width: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
    width: 44,
    alignItems: 'flex-end',
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
