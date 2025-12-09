/**
 * Expo Config Plugin for LiquidGlass Module
 * iOS 17+ のデプロイメントターゲットを自動設定
 */

const { withPlugins, createRunOncePlugin } = require('@expo/config-plugins');

const pkg = require('./package.json');

const withLiquidGlass = (config) => {
  // このモジュールはネイティブコードを含むため、
  // prebuild 時に自動的に ios/ ディレクトリにリンクされる
  return config;
};

module.exports = createRunOncePlugin(withLiquidGlass, pkg.name, pkg.version);

