import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, Searchbar, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { apiClient } from '@/services/api';
import { AppHeader } from '@/components/app-header';

interface Mate {
  id: number;
  mate_name: string;
  mate_id: string;
  last_message?: string;
  is_public?: boolean;
}

export default function MatesScreen() {
  const theme = useTheme();
  const [mates, setMates] = useState<Mate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMates();
  }, []);

  const loadMates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/mates/?filter=chatted_only');
      setMates(response.data);
    } catch (error) {
      console.error('Failed to load mates:', error);
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
    <Card 
      style={styles.mateCard} 
      onPress={() => handleMateSelect(item)}
    >
      <Card.Content>
        <Text variant="titleMedium" style={styles.mateName}>
          {item.mate_name}
        </Text>
        {item.mate_id && (
          <Text variant="bodySmall" style={styles.mateId}>
            @{item.mate_id}
          </Text>
        )}
        {item.last_message && (
          <Text variant="bodySmall" numberOfLines={2} style={styles.lastMessage}>
            {item.last_message}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="チャット">
        <Searchbar
          placeholder="メイトを検索"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </AppHeader>

      <FlatList
        data={filteredMates}
        renderItem={renderMateItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              まだチャット履歴がありません
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
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  mateCard: {
    marginBottom: 12,
  },
  mateName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mateId: {
    color: '#666',
    marginBottom: 8,
  },
  lastMessage: {
    color: '#888',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#888',
  },
});
