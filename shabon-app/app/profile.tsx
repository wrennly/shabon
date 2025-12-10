import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, Pressable, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService, apiClient } from '@/services/api';
import { authService as authServiceLogout } from '@/services/auth';
import { analytics } from '@/services/analytics';
import { ShabonInput } from '@/components/SUI/ShabonInput';
import { ShabonBackground } from '@/components/SUI/ShabonBackground';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProfile();
    analytics.logScreenView('Profile');
  }, []);

  const loadProfile = async () => {
    try {
      // バックエンドからユーザー情報を取得（display_name, profileはここに保存されている）
      const response = await apiClient.get('/users/me');
      const backendUser = response.data;
      setUsername(backendUser.display_name || '');
      setProfile(backendUser.profile || '');
      
      // メールアドレスはSupabaseから取得
      const supabaseUser = await authService.getUser();
      setEmail(supabaseUser?.email || backendUser.username || '');
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiClient.put('/users/me', {
        display_name: username,
        profile: profile,
      });
      router.back();
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('エラー', 'プロフィールの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      // Web環境ではwindow.confirmを使用
      const confirmed = window.confirm(
        '本当に退会しますか？\n\n退会すると、あなたのメイトやチャット履歴はすべて削除されます。この操作は取り消せません。'
      );
      if (confirmed) {
        confirmDeleteAccount();
      }
    } else {
      // ネイティブ環境ではAlert.alertを使用
      Alert.alert(
        '退会確認',
        '本当に退会しますか？\n\n退会すると、あなたのメイトやチャット履歴はすべて削除されます。この操作は取り消せません。',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
          },
          {
            text: '退会する',
            style: 'destructive',
            onPress: confirmDeleteAccount,
          },
        ]
      );
    }
  };

  const confirmDeleteAccount = async () => {
    try {
      setDeleting(true);
      // バックエンドで論理削除
      await apiClient.delete('/users/me');
      // Supabaseからサインアウト
      await authServiceLogout.signOut();
      // ログイン画面へ
      router.replace('/login');
    } catch (error) {
      console.error('Failed to delete account:', error);
      Alert.alert('エラー', '退会処理に失敗しました。もう一度お試しください。');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ShabonBackground />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ShabonBackground />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButtonContainer}>
          {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
            <GlassView style={styles.backButtonGlass} isInteractive>
              <Ionicons name="chevron-back" size={24} color="#000000" style={{ marginRight: 2 }} />
            </GlassView>
          ) : (
            <View style={[styles.backButtonFallback, { backgroundColor: colorScheme === 'dark' ? 'rgba(50,50,50,0.8)' : 'rgba(255,255,255,0.8)' }]}>
              <Ionicons name="chevron-back" size={24} color={theme.tint} style={{ marginRight: 2 }} />
            </View>
          )}
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>プロフィール</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <ShabonInput
          label="ニックネーム"
          value={username}
          onChangeText={setUsername}
          placeholder="メイトが呼ぶ名前"
        />

        <ShabonInput
          label="メールアドレス"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="未設定"
          editable={false}
        />

        <ShabonInput
          label="自己紹介"
          value={profile}
          onChangeText={setProfile}
          placeholder="メイトに伝えたいこと（趣味、仕事、好きなことなど）"
          multiline
          numberOfLines={4}
          style={styles.profileTextArea}
        />

        {/* 保存ボタン（ガラス） */}
        <View style={styles.buttonContainer}>
          <Pressable onPress={handleSave} disabled={saving}>
            {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
              <GlassView style={[styles.saveButtonGlass, { opacity: saving ? 0.5 : 1 }]} isInteractive>
                {saving ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.saveButtonText}>保存</Text>
                )}
              </GlassView>
            ) : (
              <View style={[styles.saveButtonFallback, { opacity: saving ? 0.5 : 1 }]}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonTextFallback}>保存</Text>
                )}
              </View>
            )}
          </Pressable>
        </View>

        {/* 退会セクション */}
        <View style={styles.dangerSection}>
          <Text style={[styles.dangerSectionTitle, { color: theme.icon }]}>アカウント</Text>
          <Pressable 
            onPress={handleDeleteAccount} 
            disabled={deleting}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={styles.deleteButtonText}>
              {deleting ? '処理中...' : '退会する'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 16,
    paddingBottom: 8,
  },
  backButtonContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  buttonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  saveButtonGlass: {
    width: 200,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonFallback: {
    width: 200,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  saveButtonTextFallback: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerSection: {
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  dangerSectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 22,
    gap: 8,
    alignSelf: 'center',
    width: 200,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
  },
  profileTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
});
