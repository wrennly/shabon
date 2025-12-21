import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Animated, TouchableOpacity, Alert, Image } from 'react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { apiClient, authService } from '@/services/api';
import { AppHeader } from '@/components/app-header';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ShabonBackground } from '@/components/SUI/ShabonBackground';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { logToDiscord, logErrorToDiscord } from '@/utils/discord-logger';

import { FloatingSettingsButton } from '@/components/FloatingSettingsButton';

interface Mate {
  id: number;
  mate_name: string;
  mate_id: string;
  last_message?: string;
  is_public?: boolean;
  image_url?: string | null;
  last_chat_time?: string;
}

import { useIsFocused } from '@react-navigation/native';

export default function MatesScreen() {
  const isFocused = useIsFocused();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [mates, setMates] = useState<Mate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // キャッシュ用ref
  const cacheRef = useRef<{ data: Mate[] | null; timestamp: number }>({ 
    data: null, 
    timestamp: 0 
  });
  const CACHE_DURATION = 30000; // 30秒間キャッシュ有効

  const previousFocusedRef = useRef(false);

  useEffect(() => {
    if (isFocused) {
      // 初回表示時はキャッシュを使う、チャット詳細から戻った時はキャッシュを古くする
      if (previousFocusedRef.current) {
        // チャット詳細から戻ってきた = キャッシュを古くして次回更新させる
        cacheRef.current.timestamp = 0;
      }
      checkAuthAndLoad(false);
      previousFocusedRef.current = true;
    }
  }, [isFocused]);

  const checkAuthAndLoad = async (forceRefresh = false) => {
    const isLoggedIn = await authService.isLoggedIn();
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    loadMates(forceRefresh);
  };

  const loadMates = async (forceRefresh = false) => {
    try {
      await logToDiscord('📋 loadMates開始', { forceRefresh });
      
      // キャッシュチェック
      const now = Date.now();
      const cacheValid = cacheRef.current.data && 
                        (now - cacheRef.current.timestamp) < CACHE_DURATION;
      
      if (cacheValid && !forceRefresh) {
        // キャッシュから即座に表示（ローディングなし）
        await logToDiscord('💾 キャッシュから表示', { matesCount: cacheRef.current.data!.length });
        setMates(cacheRef.current.data!);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // キャッシュがない、または古い場合のみローディング表示
      if (!cacheRef.current.data) {
        setLoading(true);
      }
      
      await logToDiscord('📡 /mates/ APIコール開始');
      const response = await apiClient.get('/mates/?filter=chatted_only');
      
      await logToDiscord('✅ /mates/ APIレスポンス取得', { matesCount: response.data.length });
      
      // Sort by last_chat_time (newest first)
      const sortedMates = response.data.sort((a: Mate, b: Mate) => {
        if (!a.last_chat_time) return 1;
        if (!b.last_chat_time) return -1;
        return new Date(b.last_chat_time).getTime() - new Date(a.last_chat_time).getTime();
      });
      
      setMates(sortedMates);
      
      // キャッシュを更新
      cacheRef.current = {
        data: sortedMates,
        timestamp: now
      };
    } catch (error: any) {
      await logErrorToDiscord('❌ loadMatesでエラー', error);
      if (error.response?.status === 401) {
        await logToDiscord('🔐 401エラー - ログイン画面へ');
        router.replace('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMates(true); // 強制リフレッシュ
  };

  const handleMateSelect = (mate: Mate) => {
    router.push(`/chat/${mate.id}`);
  };

  const handleDeleteMate = async (mateId: number) => {
    try {
      // 論理削除API呼び出し（チャット履歴を削除）
      await apiClient.delete(`/chat/history/${mateId}`);
      // リストから削除
      setMates(prev => prev.filter(m => m.id !== mateId));
    } catch (error) {
      console.error('Failed to delete chat:', error);
      Alert.alert('エラー', 'チャットの削除に失敗しました');
    }
  };

  const filteredMates = mates.filter(mate =>
    mate.mate_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderRightActions = (mateId: number) => (
    <View style={styles.deleteActionContainer}>
      <TouchableOpacity 
        style={styles.deleteAction}
        onPress={() => handleDeleteMate(mateId)}
      >
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  const renderMateItem = ({ item }: { item: Mate }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.id)}
      overshootRight={false}
    >
      <TouchableOpacity 
        onPress={() => handleMateSelect(item)}
        activeOpacity={1}
        style={styles.listItemContainer}
      >
        <View style={[styles.listItemInner, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)' }]}>
          <View style={styles.listItemContent}>
            {/* メイト画像 */}
            <View style={styles.mateAvatar}>
              {item.image_url ? (
                <Image 
                  source={{ uri: item.image_url }} 
                  style={styles.mateAvatarImage}
                  defaultSource={require('@/assets/images/icon.png')}
                />
              ) : (
                <Ionicons name="person" size={24} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
              )}
            </View>
            <View style={styles.listItemTextContainer}>
              <View style={styles.listItemTitleRow}>
                <Text style={[styles.listItemTitle, { color: theme.text }]}>{item.mate_name}</Text>
                {item.is_public !== undefined && (
                  <View style={[styles.publicBadge, { backgroundColor: item.is_public ? 'rgba(52, 199, 89, 0.15)' : 'rgba(142, 142, 147, 0.15)' }]}>
                    <Text style={[styles.publicBadgeText, { color: item.is_public ? '#34C759' : '#8E8E93' }]}>
                      {item.is_public ? '公開' : '非公開'}
                    </Text>
                  </View>
                )}
              </View>
              {item.last_message && (
                <Text style={styles.listItemSubtitle} numberOfLines={1}>
                  {item.last_message}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
      <ShabonBackground />
      <FloatingSettingsButton />
      {loading && !refreshing ? (
        <View style={{ flex: 1 }}>
            <View style={{ paddingVertical: 8 }}>
                <AppHeader title="チャット" />
            </View>
            <View style={[styles.centerContainer, { backgroundColor: 'transparent' }]}>
                <ActivityIndicator size="large" color={theme.tint} />
                <Text style={[styles.loadingText, { color: theme.text }]}>読み込み中...</Text>
            </View>
        </View>
      ) : (
      <FlatList
        data={filteredMates}
        renderItem={renderMateItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <AppHeader title="チャット" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.icon }]}>
              まだチャット履歴がありません
            </Text>
          </View>
        }
      />
      )}
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
  listContainer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {},
  // リストアイテム
  listItemContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  listItemInner: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mateAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  mateAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  listItemTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  listItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  publicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  publicBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  // 削除アクション
  deleteActionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingRight: 16,
  },
  deleteAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.15)',
  },
});
