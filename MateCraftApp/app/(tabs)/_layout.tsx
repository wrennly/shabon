import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ShabonTabBar } from '@/components/SUI/ShabonTabBar';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TABS: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'chat', icon: 'chatbubbles', label: 'Chat' },
  { key: 'explore', icon: 'search', label: 'Search' },
  { key: 'craft', icon: 'sparkles', label: 'Craft' },
];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <Tabs
      tabBar={(props) => {
        const activeRouteName = props.state.routes[props.state.index].name;
        
        return (
          <ShabonTabBar
            tabs={TABS}
            activeTab={activeRouteName}
            onTabPress={(key) => router.push(`/(tabs)/${key}` as any)}
          />
        );
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: Platform.OS === 'web' ? {
          height: 65,
        } : undefined,
      }}>
      <Tabs.Screen
        name="chat"
        options={{
          title: 'チャット',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '検索',
        }}
      />
      <Tabs.Screen
        name="craft"
        options={{
          title: 'メイト作成',
        }}
      />
    </Tabs>
  );
}
