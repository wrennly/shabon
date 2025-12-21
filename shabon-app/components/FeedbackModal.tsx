import React, { useState } from 'react';
import { View, StyleSheet, Modal, Text, TextInput, TouchableOpacity, Platform, Alert, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

const FEEDBACK_WEBHOOK_URL = 'https://discord.com/api/webhooks/1452275604253835379/8HgzzLahSaOTjHjXMoIJRIzRKIr_QLWBl644j_A5d2bcnhq9LlcoGftfMoSo8sfA-8pV';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!feedback.trim()) {
      Alert.alert('エラー', 'フィードバックを入力してください');
      return;
    }

    try {
      setSending(true);
      
      const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      const content = `**📣 新しいフィードバック**\n\`\`\`\n${feedback.trim()}\n\`\`\`\n*送信日時: ${timestamp}*`;
      
      const response = await fetch(FEEDBACK_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          username: 'Shabon Feedback',
        }),
      });

      if (response.ok) {
        Alert.alert('送信完了', 'フィードバックをありがとうございます！\n今後の開発の参考にさせていただきます。');
        setFeedback('');
        onClose();
      } else {
        throw new Error('Failed to send feedback');
      }
    } catch (error) {
      console.error('Failed to send feedback:', error);
      Alert.alert('エラー', 'フィードバックの送信に失敗しました。\nもう一度お試しください。');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (feedback.trim() && !sending) {
      Alert.alert(
        '確認',
        '入力中のフィードバックが破棄されます。よろしいですか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '破棄', style: 'destructive', onPress: () => {
            setFeedback('');
            onClose();
          }},
        ]
      );
    } else {
      setFeedback('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={handleClose}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.modalContentWrapper}
            onPress={(e) => e.stopPropagation()}
          >
            {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
              <GlassView style={styles.modalGlass} isInteractive>
                <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>フィードバック</Text>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                      <Ionicons name="close" size={24} color={theme.text} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.description, { color: theme.icon }]}>
                    ご意見・ご要望・不具合報告など、お気軽にお送りください！
                  </Text>

                  <TextInput
                    style={[
                      styles.textInput,
                      { 
                        color: theme.text,
                        backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      }
                    ]}
                    placeholder="フィードバックを入力してください"
                    placeholderTextColor={theme.icon}
                    value={feedback}
                    onChangeText={setFeedback}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                    maxLength={1000}
                  />

                  <Text style={[styles.charCount, { color: theme.icon }]}>
                    {feedback.length}/1000
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      { backgroundColor: theme.tint },
                      (sending || !feedback.trim()) && styles.sendButtonDisabled
                    ]}
                    onPress={handleSend}
                    disabled={sending || !feedback.trim()}
                  >
                    {sending ? (
                      <Text style={styles.sendButtonText}>送信中...</Text>
                    ) : (
                      <>
                        <Ionicons name="send" size={20} color="#FFFFFF" style={styles.sendIcon} />
                        <Text style={styles.sendButtonText}>送信</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </GlassView>
            ) : (
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>フィードバック</Text>
                  <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.description, { color: theme.icon }]}>
                  ご意見・ご要望・不具合報告など、お気軽にお送りください！
                </Text>

                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      color: theme.text,
                      backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    }
                  ]}
                  placeholder="フィードバックを入力してください"
                  placeholderTextColor={theme.icon}
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                  maxLength={1000}
                />

                <Text style={[styles.charCount, { color: theme.icon }]}>
                  {feedback.length}/1000
                </Text>

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: theme.tint },
                    (sending || !feedback.trim()) && styles.sendButtonDisabled
                  ]}
                  onPress={handleSend}
                  disabled={sending || !feedback.trim()}
                >
                  {sending ? (
                    <Text style={styles.sendButtonText}>送信中...</Text>
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="#FFFFFF" style={styles.sendIcon} />
                      <Text style={styles.sendButtonText}>送信</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentWrapper: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGlass: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    borderRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    minHeight: 150,
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 16,
  },
  sendButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    marginRight: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

