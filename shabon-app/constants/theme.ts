/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#F5F8FF', // Grok提案: ほんのり青みがかった明るい背景
    card: '#F2F2F7', // iOS grouped background color or card color
    border: '#C6C6C8',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    glassText: '#000000', // GlassView用の文字色（ライトモード）
  },
  dark: {
    text: '#E6E0FF', // Grok提案: 薄紫がかった白（超可愛い）
    background: '#0D1117', // Grok提案: GitHub風の深い青黒（夜空）
    card: '#161B22', // 少し明るめのカード背景
    border: 'rgba(140, 180, 255, 0.3)', // Grok提案: 淡いオーロラ風の境界線
    tint: '#A78BFA', // Grok提案: 紫寄りのアクセント
    icon: '#B0A8E0', // Grok提案: 薄紫のアイコン
    tabIconDefault: '#B0A8E0',
    tabIconSelected: '#E6E0FF',
    glassText: '#E6E0FF', // Grok提案: 薄紫がかった白で統一
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
