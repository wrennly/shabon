import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Text, TouchableOpacity, ActivityIndicator, Pressable, TextInput, Keyboard, Animated, Dimensions, Image, Modal } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ShabonBackground } from '@/components/SUI/ShabonBackground';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { BackButton } from '@/components/BackButton';
import { MateDetailModal } from '@/components/MateDetailModal';
import { SettingsMenu } from '@/components/SettingsMenu';
import { getChatHistory, saveChatHistory } from '@/lib/database';

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
  const params = useLocalSearchParams<{ mateId: string; mateName?: string; mateImageUrl?: string }>();
  const { mateId, mateName: initialMateName, mateImageUrl: initialMateImageUrl } = params;
  const navigation = useNavigation();
  const [newMessage, setNewMessage] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [mateName, setMateName] = useState(initialMateName || '...');
  const [mateImageUrl, setMateImageUrl] = useState<string | null>(initialMateImageUrl || null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const lastSentMessageRef = useRef<string>('');
  const [inputKey, setInputKey] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMateDetailModal, setShowMateDetailModal] = useState(false);
  const [mateDisplayProfile, setMateDisplayProfile] = useState<string | null>(null);
  const [mateMateId, setMateMateId] = useState<string | null>(null);
  
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
    // 常にチャット一覧に戻る
    router.replace('/(tabs)/chat');
  };

  const handleSettingsButtonPress = () => {
    setShowSettingsModal(true);
  };

  const handleShowProfile = () => {
    setShowSettingsModal(false);
    setShowMateDetailModal(true);
  };

  const handleShowReport = () => {
    setShowSettingsModal(false);
    setShowReportModal(true);
  };

  const handleReportConfirm = async () => {
    setShowReportModal(false);
    
    try {
      // 直近10件の会話を取得
      const recentMessages = history.slice(-10).map((msg, index) => ({
        role: msg.role,
        text: msg.text.substring(0, 200) // 最大200文字に制限
      }));

      // Discord Webhookに送信
      const webhookUrl = 'https://discord.com/api/webhooks/1449759517007941673/Jtj6lzs7jmgzqvRBXIztddQoUoHgVle4nf6HAd9HBYbihr3s74wTppvvZo4bfEvHxVdH';
      
      const payload = {
        embeds: [{
          title: '🚨 迷惑レポート',
          color: 0xFF3B30,
          fields: [
            {
              name: 'メイトID',
              value: mateId || 'unknown',
              inline: true
            },
            {
              name: 'メイト名',
              value: mateName,
              inline: true
            },
            {
              name: '直近の会話',
              value: recentMessages.map((msg, i) => 
                `**${msg.role === 'user' ? 'ユーザー' : 'メイト'}**: ${msg.text}`
              ).join('\n\n') || '会話履歴なし'
            }
          ],
          timestamp: new Date().toISOString()
        }]
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      alert('レポートを送信しました。ご協力ありがとうございます。');
    } catch (error) {
      console.error('Failed to send report:', error);
      alert('レポートの送信に失敗しました。');
    }
  };

  const handleReportCancel = () => {
    setShowReportModal(false);
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
      
      // 1. SQLiteキャッシュから即座に表示
      const cachedHistory = await getChatHistory(parseInt(mateId as string));
      if (cachedHistory.length > 0) {
        console.log(`[Chat] Loaded ${cachedHistory.length} messages from SQLite cache`);
        const formattedCached = cachedHistory.map((log: any) => ({
          role: log.role === 'user' ? 'user' : 'model',
          text: log.message_text,
        }));
        setHistory(formattedCached);
        setLoading(false);
      }
      
      // 2. APIから最新データを取得
      console.log('[Chat] Fetching mate details and history...', { mateId });
      const [mateResponse, historyResponse] = await Promise.all([
        apiClient.get(`/mates/${mateId}/details`).catch((err) => {
          console.log('[Chat] Private mate details failed, trying public...', err.message);
          return apiClient.get(`/mates/public-details/${mateId}`);
        }),
        apiClient.get(`/chat/history/${mateId}`)
      ]);
      console.log('[Chat] API responses received');
      
      // Set mate details
      console.log('[Chat] Mate details:', {
        mate_name: mateResponse.data.mate_name,
        has_display_profile: !!mateResponse.data.display_profile,
        has_base_prompt: !!mateResponse.data.base_prompt,
        display_profile_preview: mateResponse.data.display_profile?.substring(0, 50)
      });
      
      setMateName(mateResponse.data.mate_name || 'Unknown');
      setMateImageUrl(mateResponse.data.image_url || null);
      setMateDisplayProfile(mateResponse.data.display_profile || mateResponse.data.base_prompt || null);
      setMateMateId(mateResponse.data.mate_id || null);

      // Set chat history
      const formattedHistory = historyResponse.data.map((log: ChatHistoryEntry) => ({
        role: log.role === 'user' ? 'user' : 'model',
        text: log.message_text,
      }));
      setHistory(formattedHistory || []);
      
      // 3. SQLiteに保存
      await saveChatHistory(parseInt(mateId as string), historyResponse.data);
    } catch (error: any) {
      console.error('[Chat] Failed to load chat history:', error);
      console.error('[Chat] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // エラー時でもローディングを解除
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    console.log('🔍 [Chat] handleSend START', { hasMessage: !!newMessage.trim(), isThinking });
    if (!newMessage.trim() || isThinking) return;

    const currentText = newMessage;
    const userMessage: ChatMessage = { role: 'user', text: currentText };
    const previousHistory: ChatMessage[] = history;
    
    console.log('🔍 [Chat] Sending message:', { text: currentText.substring(0, 50), historyLength: previousHistory.length });
    
    // 1. ユーザーメッセージを即座に表示（Optimistic UI）
    lastSentMessageRef.current = currentText;
    const updatedHistory = [...previousHistory, userMessage];
    setHistory(updatedHistory);
    setNewMessage('');
    setInputKey((prev) => prev + 1);
    setIsThinking(true);

    // 2. バックグラウンドでAIに送信
    try {
      console.log('🔍 [Chat] Calling API...');
      const response = await apiClient.post('/chat/', {
        mate_id: Number(mateId),
        new_message: currentText,
        history: previousHistory,
      });
      console.log('🔍 [Chat] API response received:', { replyLength: response.data.reply_text?.length });

      // 3. AIの返信を追加
      const modelMessage: ChatMessage = {
        role: 'model',
        text: response.data.reply_text,
      };
      const finalHistory = [...updatedHistory, modelMessage];
      setHistory(finalHistory);
      
      // 4. SQLiteに保存（最新の履歴を即座に保存）
      const historyForSave = finalHistory.map((msg, idx) => ({
        id: idx + 1,
        mate_id: parseInt(mateId as string),
        role: msg.role === 'user' ? 'user' : 'assistant',
        message_text: msg.text,
        created_at: new Date().toISOString(),
      }));
      await saveChatHistory(parseInt(mateId as string), historyForSave);
    } catch (error) {
      console.log('🔍 [Chat] ERROR:', error);
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        role: 'model',
        text: 'エラーが発生しました。もう一度お試しください。',
      };
      setHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
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
          // ダークモードでAI側の枠を消す
          item.role === 'model' && colorScheme === 'dark' && {
            borderWidth: 0,
          }
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
        <BackButton onPress={handleBack} />
        <TouchableOpacity 
          style={styles.headerCenter}
          onPress={() => setShowMateDetailModal(true)}
          activeOpacity={0.7}
        >
          {/* メイト画像 */}
          <View style={styles.headerAvatar}>
            {mateImageUrl ? (
              <Image 
                source={{ uri: mateImageUrl }} 
                style={styles.headerAvatarImage}
                defaultSource={require('@/assets/images/icon.png')}
              />
            ) : (
              <Ionicons name="person" size={20} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            )}
          </View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{mateName}</Text>
        </TouchableOpacity>
        {/* 設定ボタン */}
        <TouchableOpacity onPress={handleSettingsButtonPress} style={styles.settingsButtonContainer}>
          {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
            <GlassView style={styles.settingsButtonGlass} isInteractive>
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.glassText} />
            </GlassView>
          ) : (
            <View style={[
              styles.settingsButtonFallback,
              {
                backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }
            ]}>
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
            </View>
          )}
        </TouchableOpacity>
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
                    <Ionicons name="arrow-up" size={20} color={theme.glassText} />
                  </GlassView>
                ) : (
                  <View style={styles.sendButtonFallback}>
                    <Ionicons name="arrow-up" size={20} color={theme.glassText} />
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
                  <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </Animated.View>

      {/* 設定メニュー */}
      <SettingsMenu
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        buttonTop={Platform.OS === 'ios' ? 105 : 65}
        buttonRight={16}
        actions={[
          {
            title: 'プロフィールを見る',
            onPress: handleShowProfile,
          },
          {
            title: '不適切なコンテンツを報告',
            onPress: handleShowReport,
            isDestructive: true,
          },
        ]}
      />

      {/* メイト詳細モーダル */}
      <MateDetailModal
        isVisible={showMateDetailModal}
        onClose={() => setShowMateDetailModal(false)}
        mate={mateId ? {
          id: parseInt(mateId),
          mate_name: mateName,
          mate_id: mateMateId || undefined,
          image_url: mateImageUrl,
          display_profile: mateDisplayProfile
        } : null}
        showChatButton={false}
      />

      {/* 迷惑レポート確認モーダル */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={handleReportCancel}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={handleReportCancel}
        >
          <Pressable 
            style={styles.modalContentWrapper}
            onPress={(e) => e.stopPropagation()}
          >
            {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
              <GlassView style={styles.modalGlass} isInteractive>
                <View style={styles.modalContent}>
                  <Ionicons name="flag" size={38} color="#FF3B30" style={styles.modalIcon} />
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    不適切なコンテンツを報告しますか？
                  </Text>
                  <Text style={[styles.modalMessage, { color: theme.icon }]}>
                    このメイトとの会話履歴が運営に送信されます。
                  </Text>
                  <View style={styles.modalButtons}>
                    <Pressable 
                      onPress={handleReportCancel}
                      style={styles.modalButton}
                    >
                      <Text style={[styles.modalButtonText, { color: theme.text }]}>
                        キャンセル
                      </Text>
                    </Pressable>
                    <Pressable 
                      onPress={handleReportConfirm}
                      style={[styles.modalButton, styles.modalButtonReport]}
                    >
                      <Text style={[styles.modalButtonText, { color: '#FF3B30' }]}>
                        報告する
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </GlassView>
            ) : (
              <BlurView
                intensity={Platform.OS === 'ios' ? 28 : 18}
                tint={colorScheme === 'dark' ? 'dark' : 'light'}
                style={styles.modalBlur}
              >
                <View style={styles.modalContent}>
                  <Ionicons name="flag" size={48} color="#FF3B30" style={styles.modalIcon} />
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    不適切なコンテンツを報告しますか？
                  </Text>
                  <Text style={[styles.modalMessage, { color: theme.icon }]}>
                    このメイトとの会話履歴が運営に送信されます。
                  </Text>
                  <View style={styles.modalButtons}>
                    <Pressable 
                      onPress={handleReportCancel}
                      style={styles.modalButton}
                    >
                      <Text style={[styles.modalButtonText, { color: theme.text }]}>
                        キャンセル
                      </Text>
                    </Pressable>
                    <Pressable 
                      onPress={handleReportConfirm}
                      style={[styles.modalButton, styles.modalButtonReport]}
                    >
                      <Text style={[styles.modalButtonText, { color: '#FF3B30' }]}>
                        報告する
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </BlurView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  headerAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  settingsButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  settingsButtonGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 0,
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
  // Report Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentWrapper: {
    width: '80%',
    maxWidth: 340,
  },
  modalGlass: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: 'center',
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  modalButtonReport: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
