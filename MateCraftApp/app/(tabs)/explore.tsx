import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '@/services/api';
import { AppHeader } from '@/components/app-header';
import { ShabonListItem } from '@/components/SUI/ShabonListItem';
import { ShabonInput } from '@/components/SUI/ShabonInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Mate {
  id: number;
  mate_name: string;
  mate_id: string | null;
  is_public: boolean;
  last_message: string | null;
}

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [publicMates, setPublicMates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPublicMates();
  }, []);

  const loadPublicMates = async () => {
    try {
      const response = await apiClient.get('/mates/public');
      setPublicMates(response.data);
    } catch (error) {
      console.error('Failed to load public mates:', error);
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

  const renderMateItem = ({ item }: { item: Mate }) => (
    <ShabonListItem
      title={item.mate_name}
      subtitle={item.last_message || 'No messages yet'}
      additionalText={item.mate_id ? `@${item.mate_id}` : undefined}
      onPress={() => handleMateSelect(item)}
      chevron={true}
      style={{ marginHorizontal: 16, marginVertical: 4 }}
    />
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
      <AppHeader title="検索">
        <ShabonInput
          placeholder="メイトを検索"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          leftIcon={<Ionicons name="search" size={20} color="#8E8E93" />}
          height={40}
          containerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        />
      </AppHeader>

      <FlatList
        data={filteredMates}
        renderItem={renderMateItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.icon }]}>
              {searchQuery ? '検索結果がありません' : '公開メイトがありません'}
            </Text>
          </View>
        }
      />
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
    // elevation: 0,
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});

