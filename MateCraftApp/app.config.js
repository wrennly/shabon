module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      apiUrlDev: process.env.EXPO_PUBLIC_API_URL_DEV || 'http://localhost:8000',
      apiUrlProd: process.env.EXPO_PUBLIC_API_URL_PROD || 'https://chatcraft-api-v3.onrender.com',
      feedbackFormUrl: process.env.EXPO_PUBLIC_FEEDBACK_FORM_URL || 'https://forms.gle/bWYV5a5iGiqabK289',
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
      environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',
      gaMeasurementId: process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID || '',
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
    },
  };
};
