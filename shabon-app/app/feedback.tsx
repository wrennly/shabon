import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Linking, Text, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { analytics, AnalyticsEvents } from '@/services/analytics';
import { ShabonCard } from '@/components/SUI/ShabonCard';
import { ShabonButton } from '@/components/SUI/ShabonButton';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function FeedbackScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const feedbackUrl = Constants.expoConfig?.extra?.feedbackFormUrl || 
                      process.env.EXPO_PUBLIC_FEEDBACK_FORM_URL ||
                      'https://docs.google.com/forms';

  useEffect(() => {
    analytics.logScreenView('Feedback');
  }, []);

  const handleOpenForm = async () => {
    analytics.logEvent(AnalyticsEvents.FEEDBACK_OPEN);
    try {
      const supported = await Linking.canOpenURL(feedbackUrl);
      if (supported) {
        await Linking.openURL(feedbackUrl);
      } else {
        console.error('Cannot open URL:', feedbackUrl);
      }
    } catch (error) {
      console.error('Failed to open feedback form:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>フィードバック</Text>
        <View style={styles.rightSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <ShabonCard>
          <Text style={[styles.title, { color: theme.text }]}>
            フィードバック
          </Text>
          
          <Text style={[styles.description, { color: theme.text }]}>
            ご意見・ご要望をお聞かせください。
            MateCraftの改善にご協力をお願いします。
          </Text>

          <ShabonButton
            title="フィードバックフォームを開く"
            onPress={handleOpenForm}
            variant="primary"
            style={styles.openButton}
          />
          
          <Text style={[styles.note, { color: theme.icon }]}>
            Googleフォームが開きます
          </Text>
        </ShabonCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
    fontSize: 20,
  },
  description: {
    marginBottom: 24,
    lineHeight: 24,
    fontSize: 16,
  },
  openButton: {
    marginVertical: 16,
  },
  note: {
    textAlign: 'center',
    fontSize: 12,
  },
});
