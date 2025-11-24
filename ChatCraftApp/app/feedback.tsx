import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, Card, Button, useTheme, Appbar } from 'react-native-paper';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { analytics, AnalyticsEvents } from '@/services/analytics';

export default function FeedbackScreen() {
  const theme = useTheme();
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="フィードバック" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              フィードバック
            </Text>
            
            <Text variant="bodyMedium" style={styles.description}>
              ご意見・ご要望をお聞かせください。
              ChatCraftの改善にご協力をお願いします。
            </Text>

            <Button
              mode="contained"
              onPress={handleOpenForm}
              icon="open-in-new"
              style={styles.openButton}
            >
              フィードバックフォームを開く
            </Button>
            
            <Text variant="bodySmall" style={styles.note}>
              Googleフォームが開きます
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  description: {
    marginBottom: 24,
    lineHeight: 20,
  },
  openButton: {
    marginVertical: 16,
  },
  note: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
