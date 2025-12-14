module.exports = ({ config }) => {
  const isWeb = process.env.EXPO_PUBLIC_PLATFORM === 'web';
  
  return {
    ...config,
    extra: {
      ...config.extra,
      eas: {
        projectId: "a8629c36-0e43-4cd8-b2f2-f8d4bcbe5ca1"
      },
      apiUrlDev: process.env.EXPO_PUBLIC_API_URL_DEV || 'http://localhost:8000',
      apiUrlProd: process.env.EXPO_PUBLIC_API_URL_PROD || 'https://chatcraft-api-v3.onrender.com',
      feedbackFormUrl: process.env.EXPO_PUBLIC_FEEDBACK_FORM_URL || 'https://forms.gle/bWYV5a5iGiqabK289',
      privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || 'https://shabon.app/privacy',
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
      environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',
      gaMeasurementId: process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID || '',
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
    },
    plugins: [
      ...(config.plugins || []),
      "expo-secure-store",
      "expo-web-browser",
      // expo-image-picker: ネイティブビルド時のみ必要（Webでは不要）
      ...(!isWeb ? [
        [
          "expo-image-picker",
          {
            photosPermission: "メイトの画像を選択するためにギャラリーへのアクセスが必要です",
          },
        ],
      ] : []),
      // iOS 17+ デプロイメントターゲット設定（Liquid Glass 用）
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: '17.0',
          },
        },
      ],
      // ローカルモジュール（虹色タブバー用）
      require('./modules/liquid-glass/app.plugin.js'),
    ],
  };
};
