import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ShabonTabButtons } from '@/components/SUI/ShabonTabButtons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TABS: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'chat', icon: 'chatbubbles', label: 'Chat' },
  { key: 'craft', icon: 'sparkles', label: 'Craft' },
  { key: 'explore', icon: 'search', label: 'Search' },
];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <Tabs
      tabBar={(props) => {
        const activeRouteName = props.state.routes[props.state.index].name;
        
        return (
          <ShabonTabButtons
            tabs={TABS}
            activeTab={activeRouteName}
            onTabPress={(key) => {
              const route = props.state.routes.find((r) => r.name === key);
              if (route) {
                const event = props.navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!event.defaultPrevented) {
                  props.navigation.navigate(route.name, route.params);
                }
              }
            }}
          />
        );
      }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' }, // For React Navigation 7 / Expo Router
        // @ts-ignore
        sceneContainerStyle: { backgroundColor: 'transparent' }, // For React Navigation 6
        // @ts-ignore
        animationEnabled: false,
        lazy: true,
        tabBarStyle: Platform.OS === 'web' ? {
          height: 65,
        } : undefined,
      }}>
      <Tabs.Screen
        name="chat"
        options={{
          title: 'チャット',
          // @ts-ignore
          unmountOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '検索',
          // @ts-ignore
          unmountOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="craft"
        options={{
          title: 'メイト作成',
          // @ts-ignore
          unmountOnBlur: true,
        }}
      />
    </Tabs>
  );
}
