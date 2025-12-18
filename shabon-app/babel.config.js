module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4はBabelプラグイン不要
      // 'react-native-reanimated/plugin',
    ],
  };
};

