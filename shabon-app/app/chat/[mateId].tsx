import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Text, TouchableOpacity, ActivityIndicator, Pressable, TextInput, Keyboard, Animated, Dimensions } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ShabonBackground } from '@/components/SUI/ShabonBackground';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

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
  const lastSentMessageRef = useRef<string>('');
  const [inputKey, setInputKey] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // 入力欄のアニメーション
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const baseBottom = 20; // キーボードなし時は画面下部から20px
  const inputBarAnim = useRef(new Animated.Value(baseBottom)).current;
  const inputBarWidthAnim = useRef(new Animated.Value(0)).current; // 0 = 280px, 1 = 100%
  const messageListMarginAnim = useRef(new Animated.Value(80)).current; // メッセージリストの下部マージン

  useEffect(() => {
    if (mateId) {
      loadChatHistory();
    }
  }, [mateId]);

  // キーボードの表示状態を監視してアニメーション
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        const kbHeight = e.endCoordinates.height;
        // キーボードの上 + 8px の位置にアニメーション
        const targetBottom = kbHeight + 8;
        Animated.parallel([
          Animated.timing(inputBarAnim, {
            toValue: targetBottom,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(inputBarWidthAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(messageListMarginAnim, {
            toValue: kbHeight + 70, // キーボード + 入力欄の高さ分
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        // 元の位置に戻るアニメーション
        Animated.parallel([
          Animated.timing(inputBarAnim, {
            toValue: baseBottom,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(inputBarWidthAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(messageListMarginAnim, {
            toValue: 80, // 入力欄の高さ + 余白
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [baseBottom]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/chat');
    }
  };

  const formatMessageSegments = (text: string): { text: string; bold?: boolean }[] => {
    const segments: { text: string; bold?: boolean }[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: text.slice(lastIndex, match.index) });
      }
      segments.push({ text: match[1], bold: true });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      segments.push({ text: text.slice(lastIndex) });
    }

    return segments;
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

    const currentText = newMessage;
    const userMessage: ChatMessage = { role: 'user', text: currentText };
    // 直前のユーザーメッセージは new_message として別途渡すので、
    // history には「それ以前」のみを送る
    const previousHistory: ChatMessage[] = history;
    const updatedHistory: ChatMessage[] = [...history, userMessage];
    lastSentMessageRef.current = currentText;
    setHistory(updatedHistory);
    setNewMessage('');
    setInputKey((prev) => prev + 1);
    setIsThinking(true);

    try {
      const response = await apiClient.post('/chat/', {
        mate_id: Number(mateId),
        new_message: newMessage,
        history: previousHistory,
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
      // 送信ボタン後にまれにテキストが残るケースを補正
      // まだ入力値が「最後に送ったテキスト」と同じなら、ここでもう一度空文字にする。
      setNewMessage((prev) => (prev === lastSentMessageRef.current ? '' : prev));
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
          item.role === 'user' ? styles.userBubble : styles.modelBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.role === 'user'
              ? { color: theme.glassText }
              : { color: theme.text },
          ]}
        >
          {formatMessageSegments(item.text).map((seg, idx) => (
            <Text
              key={idx}
              style={seg.bold ? styles.messageTextBold : undefined}
            >
              {seg.text}
            </Text>
          ))}
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

  // 幅のアニメーション
  const animatedWidth = inputBarWidthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [280, SCREEN_WIDTH - 32], // 280px から 画面幅-32px
  });

  return (
    <View style={styles.container}>
      <ShabonBackground />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButtonContainer}>
            {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
              <GlassView style={styles.backButtonGlass} isInteractive>
                <Ionicons name="chevron-back" size={24} color={theme.glassText} style={{ marginRight: 2 }} />
              </GlassView>
            ) : (
              <View style={[styles.backButtonFallback, { backgroundColor: colorScheme === 'dark' ? 'rgba(50,50,50,0.8)' : 'rgba(255,255,255,0.8)' }]}>
                <Ionicons name="chevron-back" size={24} color={theme.tint} style={{ marginRight: 2 }} />
              </View>
            )}
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{mateName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* メッセージリスト */}
      <Animated.View style={[styles.messageListContainer, { marginBottom: messageListMarginAnim }]}>
        <FlatList
          ref={flatListRef}
          data={[...history].reverse()}
          renderItem={renderMessage}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.messageList}
          inverted
        />
      </Animated.View>

      {isThinking && (
        <View style={[styles.thinkingContainer]}>
          <ActivityIndicator size="small" color={theme.icon} />
          <Text style={[styles.thinkingText, { color: theme.icon }]}>
            {mateName}が考え中...
          </Text>
        </View>
      )}

      {/* 入力欄（固定位置 + アニメーション） */}
      <Animated.View style={[
        styles.inputContainer,
        { 
          bottom: inputBarAnim,
          alignItems: isKeyboardVisible ? 'stretch' : 'center',
        }
      ]}>
        <Animated.View style={{ width: animatedWidth }}>
          {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
            <GlassView style={styles.inputGlassContainer}>
              <TextInput
                key={inputKey}
                placeholder="メッセージを入力..."
                placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                style={[styles.textInput, { color: theme.glassText }]}
                editable={!isThinking}
              />
              <Pressable
                onPress={handleSend}
                disabled={!newMessage.trim() || isThinking}
                accessibilityLabel="メッセージを送信"
                style={[
                  styles.sendButtonContainer,
                  { opacity: (!newMessage.trim() || isThinking) ? 0.4 : 1 },
                ]}
              >
                {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
                  <GlassView style={styles.sendButtonGlass} isInteractive>
                    {isThinking ? (
                      <ActivityIndicator size="small" color={theme.glassText} />
                    ) : (
                      <Ionicons name="arrow-up" size={20} color={theme.glassText} />
                    )}
                  </GlassView>
                ) : (
                  <View style={styles.sendButtonFallback}>
                    {isThinking ? (
                      <ActivityIndicator size="small" color={theme.glassText} />
                    ) : (
                      <Ionicons name="arrow-up" size={20} color={theme.glassText} />
                    )}
                  </View>
                )}
              </Pressable>
            </GlassView>
          ) : (
            <View style={styles.inputFallbackContainer}>
              <TextInput
                key={inputKey}
                placeholder="メッセージを入力..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                style={[styles.textInput, { color: '#FFFFFF' }]}
                editable={!isThinking}
              />
              <Pressable
                onPress={handleSend}
                disabled={!newMessage.trim() || isThinking}
                accessibilityLabel="メッセージを送信"
                style={[
                  styles.sendButtonContainer,
                  { opacity: (!newMessage.trim() || isThinking) ? 0.4 : 1 },
                ]}
              >
                <View style={styles.sendButtonFallbackDark}>
                  {isThinking ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                  )}
                </View>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </Animated.View>
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
    width: 40, // 戻るボタンと同じ幅でバランスを取る
  },
  messageListContainer: {
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
  userBubble: {
    backgroundColor: 'rgba(0,122,255,0.1)', // 薄い青
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
  },
  modelBubble: {
    backgroundColor: 'rgba(255,255,255,0.26)',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTextBold: {
    fontWeight: '700',
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  inputGlassContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', // 送信ボタンを下寄せ
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 5,
    minHeight: 44,
  },
  inputFallbackContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', // 送信ボタンを下寄せ
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 5,
    minHeight: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 80, // 約3行分
    minHeight: 34,
    paddingTop: 8,
    paddingBottom: 8,
    lineHeight: 18,
  },
  sendButtonContainer: {
    marginLeft: 8,
  },
  sendButtonGlass: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  sendButtonFallbackDark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
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
