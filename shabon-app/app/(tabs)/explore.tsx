import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Platform, Pressable, TextInput, Dimensions, Keyboard, Animated, Image } from 'react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { apiClient, authService } from '@/services/api';
import { AppHeader } from '@/components/app-header';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ShabonBackground } from '@/components/SUI/ShabonBackground';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingSettingsButton } from '@/components/FloatingSettingsButton';
import { useIsFocused } from '@react-navigation/native';
import { logToDiscord, logErrorToDiscord, logSuccessToDiscord } from '@/utils/discord-logger';

interface Mate {
  id: number;
  mate_name: string;
  mate_id: string | null;
  is_public: boolean;
  last_message: string | null;
  image_url: string | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

export default function ExploreScreen() {
  const isFocused = useIsFocused();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [publicMates, setPublicMates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const searchInputRef = useRef<TextInput>(null);
  
  // 検索バーの位置アニメーション（初期値は baseBottom）
  const baseBottomInit = Platform.OS === 'ios' ? 140 : 96;
  const searchBarAnim = useRef(new Animated.Value(baseBottomInit)).current;
  const searchBarWidthAnim = useRef(new Animated.Value(0)).current; // 0 = 280px, 1 = 100%

  useEffect(() => {
    if (isFocused) {
      checkAuthAndLoad();
    }
  }, [isFocused]);

  // 検索バーの基本位置（キーボードなし時）
  const baseBottom = Platform.OS === 'ios' ? 140 : 96;

  // キーボードの高さを監視してアニメーション
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const kbHeight = e.endCoordinates.height;
        setKeyboardHeight(kbHeight);
        // キーボードの上 + 8px の位置にアニメーション
        const targetBottom = kbHeight + 8;
        Animated.parallel([
          Animated.timing(searchBarAnim, {
            toValue: targetBottom,
            duration: 180,
            useNativeDriver: false,
          }),
          Animated.timing(searchBarWidthAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: false,
          }),
        ]).start();
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        // 元の位置に戻るアニメーション
        Animated.parallel([
          Animated.timing(searchBarAnim, {
            toValue: baseBottom,
            duration: 180,
            useNativeDriver: false,
          }),
          Animated.timing(searchBarWidthAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: false,
          }),
        ]).start();
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const checkAuthAndLoad = async () => {
    const isLoggedIn = await authService.isLoggedIn();
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    loadPublicMates();
  };

  const loadPublicMates = async () => {
    try {
      await logToDiscord('🌍 公開メイト取得開始');
      
      const response = await apiClient.get('/mates/public');
      
      await logSuccessToDiscord('✅ 公開メイト取得成功', {
        count: response.data.length,
        mates: response.data.map((m: any) => ({ id: m.id, name: m.mate_name, is_public: m.is_public }))
      });
      
      setPublicMates(response.data);
    } catch (error: any) {
      await logErrorToDiscord('🔴 ERROR: 公開メイト取得失敗', error);
      console.error('Failed to load public mates:', error);
      if (error.response?.status === 401) {
        router.replace('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPublicMates();
  };

  const handleMateSelect = (mate: Mate) => {
    router.push(`/chat/${mate.id}`);
  };

  const filteredMates = publicMates.filter((mate) =>
    mate.mate_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setSearchQuery('');
  };

  const renderMateCard = ({ item, index }: { item: Mate; index: number }) => (
    <Pressable 
      onPress={() => handleMateSelect(item)}
      style={[
        styles.mateCard,
        { 
          marginLeft: index % 2 === 0 ? CARD_PADDING : CARD_GAP / 2,
          marginRight: index % 2 === 1 ? CARD_PADDING : CARD_GAP / 2,
        }
      ]}
    >
      <View style={styles.mateCardInner}>
        {/* メイト画像 */}
        <View style={styles.avatarPlaceholder}>
          {item.image_url ? (
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.avatarImage}
              defaultSource={require('@/assets/images/icon.png')}
            />
          ) : (
            <Ionicons name="person" size={32} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
          )}
        </View>
        <Text style={[styles.mateName, { color: theme.glassText }]} numberOfLines={1}>{item.mate_name}</Text>
        {item.mate_id && (
          <Text style={[styles.mateId, { color: colorScheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]} numberOfLines={1}>@{item.mate_id}</Text>
        )}
      </View>
    </Pressable>
  );

  // 幅のアニメーション
  const animatedWidth = searchBarWidthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [280, SCREEN_WIDTH - 32], // 280px から 画面幅-32px
  });

  return (
    <View style={styles.container}>
      <ShabonBackground />
      <FloatingSettingsButton />
      
      {/* ヘッダー */}
      <AppHeader title="検索" showLogo={false} />

      {/* メインコンテンツ */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.tint} />
            <Text style={[styles.loadingText, { color: theme.text }]}>読み込み中...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredMates}
            renderItem={renderMateCard}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={[
              styles.gridContainer,
              { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 60 : 160 }
            ]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.icon }]}>
                  {searchQuery ? '検索結果がありません' : '公開メイトがありません'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* 検索バー（キーボードの上に固定、アニメーション付き） */}
      <Animated.View style={[
        styles.searchBarContainer, 
        { bottom: searchBarAnim },
        keyboardHeight > 0 && styles.searchBarContainerExpanded
      ]}>
        <Animated.View style={[
          styles.searchBarWrapper,
          { width: animatedWidth },
        ]}>
          {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
            <GlassView style={[
              styles.searchBarGlass,
              keyboardHeight > 0 && styles.searchBarGlassExpanded
            ]}>
              <Ionicons name="search" size={18} color={theme.glassText} style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                placeholder="メイト検索"
                placeholderTextColor={theme.glassText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, keyboardHeight > 0 && styles.searchInputExpanded]}
                returnKeyType="search"
              />
              {/* ×ボタン（入力があるときのみ表示） */}
              {(searchQuery.length > 0 || keyboardHeight > 0) && (
                <Pressable onPress={dismissKeyboard} style={styles.closeButton}>
                  <GlassView style={styles.closeButtonGlass} isInteractive>
                    <Ionicons name="close" size={16} color={theme.glassText} />
                  </GlassView>
                </Pressable>
              )}
            </GlassView>
          ) : (
            <View style={[
              styles.searchBarFallback, 
              { backgroundColor: 'rgba(255,255,255,0.8)' },
              keyboardHeight > 0 && styles.searchBarFallbackExpanded
            ]}>
              <Ionicons name="search" size={18} color="#8E8E93" style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                placeholder="メイトを検索"
                placeholderTextColor={theme.glassText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: theme.glassText }, keyboardHeight > 0 && styles.searchInputExpanded]}
                returnKeyType="search"
              />
              {/* ×ボタン（入力があるときのみ表示） */}
              {(searchQuery.length > 0 || keyboardHeight > 0) && (
                <Pressable onPress={dismissKeyboard} style={styles.closeButton}>
                  <View style={styles.closeButtonFallback}>
                    <Ionicons name="close" size={16} color="#8E8E93" />
                  </View>
                </Pressable>
              )}
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
  content: {
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
  gridContainer: {
    paddingTop: 8,
  },
  // 検索バー
  searchBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  searchBarContainerExpanded: {
    left: 16,
    right: 16,
    alignItems: 'stretch',
  },
  searchBarWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  searchBarGlass: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // キーボードなし時は中央寄せ
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
  },
  searchBarGlassExpanded: {
    justifyContent: 'flex-start', // キーボードあり時は左寄せ
    paddingLeft: 14,
    paddingRight: 4,
  },
  searchBarFallback: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // キーボードなし時は中央寄せ
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchBarFallbackExpanded: {
    justifyContent: 'flex-start', // キーボードあり時は左寄せ
    paddingLeft: 14,
    paddingRight: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    fontSize: 16,
    height: '100%',
  },
  searchInputExpanded: {
    flex: 1, // キーボードあり時のみ幅いっぱいに広がる
  },
  // ×ボタン
  closeButton: {
    marginLeft: 4,
  },
  closeButtonGlass: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  // メイトカード
  mateCard: {
    width: CARD_WIDTH,
    marginBottom: CARD_GAP,
  },
  mateCardInner: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  mateName: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  mateId: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
