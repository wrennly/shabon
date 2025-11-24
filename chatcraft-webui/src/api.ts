// src/api.ts

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_URL_DEV, API_URL_PROD, USERNAME_KEY } from './constants';

const isDevelopment = process.env.NODE_ENV === 'development';

const API_URL = isDevelopment ? API_URL_DEV : API_URL_PROD;

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター：Authorization ヘッダーを自動付与
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const username = localStorage.getItem(USERNAME_KEY);
    
    if (username) {
      config.headers['Authorization'] = `Bearer ${username}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 認証管理サービス
const authService = {
  /**
   * ログイン/登録後に呼び出す
   */
  login: (username: string): void => {
    localStorage.setItem(USERNAME_KEY, username);
  },

  /**
   * Google OAuth でログイン
   */
  loginWithGoogle: async (idToken: string): Promise<any> => {
    try {
      const response = await apiClient.post('/login/google', {
        id_token: idToken,
      });
      
      // 初回ユーザーの場合はまだローカルストレージに保存しない
      // フロントエンドで利用規約の同意と表示名設定後に保存される
      if (!response.data.is_new_user) {
        // 既存ユーザーの場合、すぐに保存
        localStorage.setItem(USERNAME_KEY, response.data.username);
      }
      
      return response.data;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  },

  /**
   * ログアウト時に呼び出す
   */
  logout: (): void => {
    localStorage.removeItem(USERNAME_KEY);
  },

  /**
   * 現在ログイン中かどうかをチェック
   */
  getCurrentUser: (): string | null => {
    return localStorage.getItem(USERNAME_KEY);
  }
};

export { authService };
export default apiClient;
