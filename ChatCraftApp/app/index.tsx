import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

export default function RootIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 初期表示時にチャットタブへリダイレクト
    const timeout = setTimeout(() => {
      router.replace('/(tabs)/chat');
    }, 100);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
