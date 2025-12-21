import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

// QueryClient設定
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // キャッシュ時間: 5分
      staleTime: 1000 * 60 * 5,
      // キャッシュ保持時間: 24時間
      gcTime: 1000 * 60 * 60 * 24,
      // リトライ設定
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // ネットワークエラー時も古いデータを表示
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      // Optimistic Updateのためのリトライ
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// AsyncStorageを使ったキャッシュ永続化
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'SHABON_QUERY_CACHE',
  throttleTime: 1000,
});

