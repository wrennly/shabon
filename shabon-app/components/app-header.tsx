import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Text, AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

// イベント名
const PLAY_ANIMATION_EVENT = 'PLAY_HEADER_ANIMATION';

// グローバルフラグ: アニメーションが既に再生されたか（タブ切り替えでリセットされない）
let hasPlayedGlobal = false;

// ログイン画面表示時にフラグをリセット（イベントは発火しない）
export function prepareHeaderAnimation() {
  hasPlayedGlobal = false;
}

// ログイン後にアニメーションを再生するための関数
export function resetHeaderAnimation() {
  console.log('[resetHeaderAnimation] Called - resetting hasPlayedGlobal');
  hasPlayedGlobal = false; // リセットして次回再生可能に
  // 少し遅延させてから発火（画面遷移完了を待つ）
  setTimeout(() => {
    console.log('[resetHeaderAnimation] Emitting PLAY_ANIMATION_EVENT');
    DeviceEventEmitter.emit(PLAY_ANIMATION_EVENT);
  }, 500);
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
  const lastAppStateRef = useRef(AppState.currentState);
  
  // 再生済みなら最終フレームで表示、未再生なら初回マウント時に再生
  const [shouldMount, setShouldMount] = useState(hasPlayedGlobal);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const hasInitializedRef = useRef(false);

  console.log('[AppHeader] Render:', { hasPlayedGlobal, shouldMount, showLogo, title });

  // 初回マウント時の処理
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    console.log('[AppHeader] Initial mount:', { hasPlayedGlobal, showLogo });
    if (showLogo) {
      if (hasPlayedGlobal) {
        // 既に再生済み → 最終フレームで表示
        console.log('[AppHeader] Showing final frame (already played)');
        setShouldMount(true);
      } else {
        // 未再生 → 自動再生
        console.log('[AppHeader] Auto-playing animation (first time)');
        hasPlayedGlobal = true;
        setShouldAutoPlay(true);
        setShouldMount(true);
      }
    }
  }, [showLogo]);

  // アニメーション再生イベントを受け取る（ログイン後のみ）
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(PLAY_ANIMATION_EVENT, () => {
      console.log('[AppHeader] PLAY_ANIMATION_EVENT received', { showLogo });
      if (showLogo) {
        console.log('[AppHeader] Playing animation from event');
        hasPlayedGlobal = true;
        hasInitializedRef.current = false; // リセットして再初期化
        // 一度アンマウントして再マウント（autoPlay で最初から再生）
        setShouldMount(false);
        setShouldAutoPlay(true);
        setTimeout(() => {
          setShouldMount(true);
          hasInitializedRef.current = true;
        }, 50);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [showLogo]);

  // フォアグラウンド復帰時にアニメーションを再生
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        lastAppStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        showLogo
      ) {
        // 一度アンマウントして再マウント（autoPlay で最初から再生）
        setShouldMount(false);
        setShouldAutoPlay(true);
        setTimeout(() => {
          setShouldMount(true);
        }, 50);
      }
      lastAppStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [showLogo]);
  
  // アニメーション完了後は autoPlay を false に
  const handleAnimationFinish = () => {
    setShouldAutoPlay(false);
  };

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
                  autoPlay={shouldAutoPlay}
                  loop={false}
                  speed={0.3}
                  style={styles.logo}
                  onAnimationFinish={handleAnimationFinish}
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
