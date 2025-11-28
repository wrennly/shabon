import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/api';
import { analytics } from '@/services/analytics';
import { ShabonButton } from '@/components/SUI/ShabonButton';
import { ShabonInput } from '@/components/SUI/ShabonInput';
import { ShabonCard } from '@/components/SUI/ShabonCard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
    analytics.logScreenView('Profile');
  }, []);

  const loadProfile = async () => {
    try {
      const user = await authService.getCurrentUsername();
      setUsername(user || '');
      // TODO: Load email from API when available
      setEmail('');
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // TODO: Implement profile update API
      console.log('Saving profile:', { username, email });
      router.back();
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>プロフィール</Text>
        <View style={styles.rightSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <ShabonCard>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            アカウント情報
          </Text>

          <ShabonInput
            label="ユーザー名"
            value={username}
            onChangeText={setUsername}
            editable={false}
            style={styles.input}
          />

          <ShabonInput
            label="メールアドレス"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            placeholder="未設定"
          />
        </ShabonCard>

        <View style={styles.buttonContainer}>
          <ShabonButton
            title="保存"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            variant="primary"
          />
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
  rightSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    fontSize: 17,
  },
  input: {
    marginBottom: 12,
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
});
