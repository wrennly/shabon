import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { apiClient, authService } from '@/services/api';
import { AppHeader } from '@/components/app-header';
import { ShabonListItem } from '@/components/SUI/ShabonListItem';
import { ShabonInput } from '@/components/SUI/ShabonInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

import { FloatingSettingsButton } from '@/components/FloatingSettingsButton';

interface Mate {
  id: number;
  mate_name: string;
  mate_id: string;
  last_message?: string;
  is_public?: boolean;
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

  useEffect(() => {
    if (isFocused) {
      checkAuthAndLoad();
    }
  }, [isFocused]);

  const checkAuthAndLoad = async () => {
    const isLoggedIn = await authService.isLoggedIn();
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    loadMates();
  };

  const loadMates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/mates/?filter=chatted_only');
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
    loadMates();
  };

  const handleMateSelect = (mate: Mate) => {
    router.push(`/chat/${mate.id}`);
  };

  const filteredMates = mates.filter(mate =>
    mate.mate_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMateItem = ({ item }: { item: Mate }) => (
    <ShabonListItem
      title={item.mate_name}
      subtitle={item.last_message}
      additionalText={item.mate_id ? `@${item.mate_id}` : undefined}
      onPress={() => handleMateSelect(item)}
      chevron={true}
      style={{ marginHorizontal: 16, marginVertical: 4, width: 'auto' }}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
  searchBar: {
    // backgroundColor: '#f5f5f5', // Handled by component
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    // color: '#888', // Handled inline
  },
});
