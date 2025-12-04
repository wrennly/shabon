import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api';
import { ShabonInput } from '@/components/SUI/ShabonInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
  const navigation = useNavigation();
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

  const handleBack = () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/chat');
    }
  };

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
    <LinearGradient
      colors={colorScheme === 'dark' ? ['#1a1a2e', '#16213e'] : ['#D0E8F2', '#D9D2E9']}
      style={styles.container}
    >
      <View style={[styles.header, { borderBottomWidth: 0, height: Platform.OS === 'ios' ? 100 : 80 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButtonContainer}>
            <BlurView intensity={20} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.backButtonBlur}>
                <Ionicons name="chevron-back" size={24} color={theme.tint} style={{ marginRight: 2 }} />
            </BlurView>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{mateName}</Text>
        </View>
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
          <View style={[styles.thinkingContainer]}>
            <ActivityIndicator size="small" color={theme.icon} />
            <Text style={[styles.thinkingText, { color: theme.icon }]}>
              {mateName}が考え中...
            </Text>
          </View>
        )}

        <View style={[styles.inputContainer, { borderTopWidth: 0 }]}>
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
            style={[
                styles.sendButton, 
                (!newMessage.trim() || isThinking) && { opacity: 0.5 },
                { backgroundColor: theme.tint }
            ]}
          >
            <Ionicons name="paper-plane" size={20} color="#FFF" style={{ marginLeft: -2, marginTop: 1 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'flex-end', // Align items to bottom of header area
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButtonContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 101,
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  titleContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 18, // Adjust to align with back button
      alignItems: 'center',
      zIndex: 100,
      pointerEvents: 'none', // Allow clicks to pass through to back button if overlapping (though they shouldn't)
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 100 : 80, // Add padding to content to avoid overlap with absolute header
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
    backgroundColor: 'rgba(255,255,255,0.2)', // Transparent bubble
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0, // Align with input
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
