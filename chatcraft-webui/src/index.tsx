import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { initializeGA } from './analytics';
import { SENTRY_DSN, ENVIRONMENT } from './constants';

// Sentry 初期化
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  });
}

// Google Analytics 初期化
initializeGA();

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

// パフォーマンス計測
reportWebVitals();

// サービスワーカー登録：新しいバージョンリリース時に更新確認を表示
serviceWorkerRegistration.register({
  onUpdate: (registration: ServiceWorkerRegistration) => {
    // 自動で更新ダイアログを表示（確認不要で自動更新）
    if (registration.waiting) {
      // 新しいワーカーに制御権を譲る
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // ワーカーが切り替わったときにページをリロード
      let refreshing: boolean;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        // キャッシュをクリアしてからリロード
        if ('caches' in window) {
          caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
              caches.delete(cacheName);
            });
          });
        }
        window.location.reload();
        refreshing = true;
      });
    }
  },
});

// 起動時にもキャッシュチェック
window.addEventListener('load', () => {
  // ローカルストレージにバージョンを保存して、古いバージョンなら強制リロード
  const appVersion = '1.0.0'; // Build時に自動インクリメント推奨
  const storedVersion = localStorage.getItem('app_version');
  
  if (storedVersion && storedVersion !== appVersion) {
    localStorage.setItem('app_version', appVersion);
    // 強制リロード
    window.location.reload();
  } else if (!storedVersion) {
    localStorage.setItem('app_version', appVersion);
  }
});
