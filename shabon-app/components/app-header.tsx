import React, { useRef, useState } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

// ログイン画面表示時にフラグをリセット（互換性のため残すが何もしない）
export function prepareHeaderAnimation() {
  // 何もしない
}

// ログイン後にアニメーションを再生するための関数（毎回再生するので不要だけど互換性のため残す）
export function resetHeaderAnimation() {
  // 何もしない（毎回アニメーション再生するので）
}

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  showLogo?: boolean; // ロゴを表示するかどうか（デフォルト: true）
}

export function AppHeader({ title, subtitle, children, showLogo = true }: AppHeaderProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const lottieRef = useRef<LottieView>(null);
  
  // 毎回アニメーション再生（シンプル！）
  const [shouldMount] = useState(true);



  // ロゴは少し上に、テキストタイトルは設定ボタンと揃える
  const headerPaddingTop = Platform.OS === 'web' ? 10 : showLogo ? insets.top + 0 : insets.top + 10;

  return (
    <View style={[styles.header, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingTop: headerPaddingTop }]}>
      <View style={[styles.headerContent, !showLogo && styles.headerContentLeft]}>
        {showLogo ? (
          <View style={styles.logoContainer}>
            {/* ロゴがマウントされる前でも同じ高さを確保 */}
            <View style={styles.logoPlaceholder}>
              {shouldMount && (
                <LottieView
                  ref={lottieRef}
                  source={require('@/assets/animations/logo.json')}
                  autoPlay={true}
                  loop={false}
                  speed={0.3}
                  style={styles.logo}
                />
              )}
            </View>
          </View>
        ) : (
          <View style={styles.titleContainer}>
            <Text style={[styles.titleText, { color: theme.text }]}>{title}</Text>
          </View>
        )}
      </View>
      
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48, // ロゴと同じ高さを確保
  },
  headerContentLeft: {
    justifyContent: 'flex-start',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 48,
    height: 48,
  },
  titleContainer: {
    height: 48, // ロゴと同じ高さ
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
  },
});
