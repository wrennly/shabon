// metro.config.js
// Expo SDK 54 + React Native Skia 対応設定
// TestFlightクラッシュ対策：インポート順序を保証

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Skia & JSI libraries のための設定
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      // ★ 重要：インポート順序を保証（Skiaのクラッシュ対策）
      // experimentalImportSupport を無効化することで、
      // Metro が勝手に import 文を並べ替えるのを防ぎ、
      // JSI バインディング（C++層）の初期化順序を保証する
      experimentalImportSupport: false,
      
      // パフォーマンス最適化：必要な時だけモジュールを読み込む
      inlineRequires: true,
    },
  }),
};

module.exports = config;

