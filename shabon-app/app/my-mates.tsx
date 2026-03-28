import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native';
import { router, Stack } from 'expo-router';
import { apiClient, authService } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ShabonBackground } from '@/components/SUI/ShabonBackground';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/BackButton';

interface Mate {
  id: number;
  mate_name: string;
  mate_id: string;
  is_public?: boolean;
  image_url?: string | null;
}

export default function MyMatesScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [mates, setMates] = useState<Mate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const isLoggedIn = await authService.isLoggedIn();
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    loadMates();
  };

  const loadMates = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        setLoading(true);
      }
      
      const response = await apiClient.get('/mates/?filter=created_only');
      setMates(response.data);
    } catch (error: any) {
      console.error('Failed to load mates:', error);
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
    loadMates(true);
  };

  const handleMateSelect = (mate: Mate) => {
    router.push(`/mate-editor/${mate.id}`);
  };

  const handleBack = () => {
    router.back();
  };

  const renderMateItem = ({ item }: { item: Mate }) => (
    <TouchableOpacity 
      onPress={() => handleMateSelect(item)}
      activeOpacity={0.7}
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
            <Text style={[styles.listItemTitle, { color: theme.text }]}>{item.mate_name}</Text>
            <View style={styles.badgeContainer}>
              {item.is_public ? (
                <View style={styles.publicBadge}>
                  <Ionicons name="globe-outline" size={12} color="#34C759" />
                  <Text style={styles.publicBadgeText}>公開</Text>
                </View>
              ) : (
                <View style={styles.privateBadge}>
                  <Ionicons name="lock-closed-outline" size={12} color="#8E8E93" />
                  <Text style={styles.privateBadgeText}>非公開</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ShabonBackground />
      
      {/* ヘッダー */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton onPress={handleBack} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>マイメイト</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && !refreshing ? (
        <View style={[styles.centerContainer, { backgroundColor: 'transparent' }]}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.text }]}>読み込み中...</Text>
        </View>
      ) : (
        <FlatList
          data={mates}
          renderItem={renderMateItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContainer, { paddingTop: 5 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.icon }]}>
                まだメイトを作成していません
              </Text>
            </View>
          }
        />
      )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
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
  listItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  publicBadgeText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  privateBadgeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
});

