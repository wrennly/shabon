import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card, ActivityIndicator, IconButton, Appbar, useTheme } from 'react-native-paper';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { apiClient } from '@/services/api';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  message_text: string;
}

export default function ChatScreen() {
  const theme = useTheme();
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
      <Card 
        style={[
          item.role === 'user' ? styles.userCard : styles.modelCard,
          item.role === 'user' && { backgroundColor: theme.colors.primaryContainer }
        ]}
      >
        <Card.Content style={styles.cardContent}>
          <Text variant="bodyLarge">{item.text}</Text>
        </Card.Content>
      </Card>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: '読み込み中...' }} />
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: mateName }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={100}
      >
        <FlatList
          ref={flatListRef}
          data={[...history].reverse()}
          renderItem={renderMessage}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.messageList}
          inverted
        />

        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
          <TextInput
            mode="outlined"
            placeholder="メッセージを入力..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
            style={styles.input}
            outlineStyle={{ borderRadius: 24 }}
            disabled={isThinking}
            right={
              <TextInput.Icon
                icon="send"
                onPress={handleSend}
                disabled={!newMessage.trim() || isThinking}
              />
            }
          />
        </View>

        {isThinking && (
          <View style={[styles.thinkingContainer, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="small" />
            <Text variant="bodySmall" style={styles.thinkingText}>
              {mateName}が考え中...
            </Text>
          </View>
        )}
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
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  modelMessage: {
    alignItems: 'flex-start',
  },
  userCard: {
    maxWidth: '75%',
    borderRadius: 16,
  },
  modelCard: {
    maxWidth: '75%',
    borderRadius: 16,
  },
  cardContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  inputContainer: {
    padding: 16,
  },
  input: {
    maxHeight: 120,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  thinkingText: {
    marginLeft: 8,
  },
});
