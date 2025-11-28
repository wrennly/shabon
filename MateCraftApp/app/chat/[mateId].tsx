import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api';
import { ShabonInput } from '@/components/SUI/ShabonInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  message_text: string;
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { mateId } = useLocalSearchParams<{ mateId: string }>();
  const [newMessage, setNewMessage] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [mateName, setMateName] = useState('...');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (mateId) {
      loadChatHistory();
    }
  }, [mateId]);

  const loadChatHistory = async () => {
    try {
      setLoading(true);
      
      // Load mate details
      const mateResponse = await apiClient.get(`/mates/${mateId}/details`).catch(() =>
        apiClient.get(`/mates/public-details/${mateId}`)
      );
      setMateName(mateResponse.data.mate_name || 'Unknown');

      // Load chat history
      const historyResponse = await apiClient.get(`/chat/history/${mateId}`);
      const formattedHistory = historyResponse.data.map((log: ChatHistoryEntry) => ({
        role: log.role === 'user' ? 'user' : 'model',
        text: log.message_text,
      }));
      setHistory(formattedHistory || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || isThinking) return;

    const userMessage: ChatMessage = { role: 'user', text: newMessage };
    setHistory((prev) => [...prev, userMessage]);
    setNewMessage('');
    setIsThinking(true);

    try {
      const response = await apiClient.post('/chat/', {
        mate_id: mateId,
        new_message: newMessage,
      });

      const modelMessage: ChatMessage = {
        role: 'model',
        text: response.data.reply_text,
      };
      setHistory((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        role: 'model',
        text: 'エラーが発生しました。もう一度お試しください。',
      };
      setHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => (
    <View
      style={[
        styles.messageContainer,
        item.role === 'user' ? styles.userMessage : styles.modelMessage,
      ]}
    >
      <View 
        style={[
          styles.bubble,
          item.role === 'user' 
            ? { backgroundColor: theme.tint, borderBottomRightRadius: 4 } 
            : { backgroundColor: theme.card, borderBottomLeftRadius: 4 }
        ]}
      >
        <Text style={[
          styles.messageText,
          item.role === 'user' ? { color: '#fff' } : { color: theme.text }
        ]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={[styles.loadingText, { color: theme.text }]}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{mateName}</Text>
        <View style={styles.rightSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={[...history].reverse()}
          renderItem={renderMessage}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.messageList}
          inverted
        />

        {isThinking && (
          <View style={[styles.thinkingContainer, { backgroundColor: theme.background }]}>
            <ActivityIndicator size="small" color={theme.icon} />
            <Text style={[styles.thinkingText, { color: theme.icon }]}>
              {mateName}が考え中...
            </Text>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <View style={styles.inputWrapper}>
            <ShabonInput
              placeholder="メッセージを入力..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              style={styles.input}
              editable={!isThinking}
              height={40}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
          <TouchableOpacity 
            onPress={handleSend} 
            disabled={!newMessage.trim() || isThinking}
            style={[styles.sendButton, (!newMessage.trim() || isThinking) && { opacity: 0.5 }]}
          >
            <Ionicons name="arrow-up-circle" size={32} color={theme.tint} />
          </TouchableOpacity>
        </View>
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
    zIndex: 10,
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
  chatContainer: {
    flex: 1,
  },
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    width: '100%',
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  modelMessage: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    padding: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrapper: {
    flex: 1,
    marginRight: 8,
  },
  input: {
    maxHeight: 100,
    minHeight: 36,
  },
  sendButton: {
    padding: 4,
    marginBottom: 4,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  thinkingText: {
    marginLeft: 8,
    fontSize: 12,
  },
});
