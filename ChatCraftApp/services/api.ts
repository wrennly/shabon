// API client for ChatCraft React Native App
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

// Constants
const API_URL_DEV = Constants.expoConfig?.extra?.apiUrlDev || 
                    process.env.EXPO_PUBLIC_API_URL_DEV || 
                    'http://localhost:8000';
const API_URL_PROD = Constants.expoConfig?.extra?.apiUrlProd || 
                     process.env.EXPO_PUBLIC_API_URL_PROD || 
                     'https://chatcraft-api-v3.onrender.com';

// Use production API on mobile (iOS/Android), development API on web
const API_URL = Platform.OS === 'web' ? API_URL_DEV : API_URL_PROD;
const USERNAME_KEY = '@chatcraft_username';

// Log API URL for debugging
console.log('[API] Platform:', Platform.OS);
console.log('[API] Using API:', API_URL);
if (Platform.OS === 'web') {
  console.log('[API] Development mode - connecting to local server');
} else {
  console.log('[API] Mobile mode - connecting to production server');
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add Authorization header automatically
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const username = await AsyncStorage.getItem(USERNAME_KEY);
    
    if (username) {
      config.headers['Authorization'] = `Bearer ${username}`;
    }
    
    return config;
  },
  (error) => {
    // Log errors to Sentry (native platforms only)
    if (Platform.OS !== 'web') {
      Sentry.captureException(error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor: Log errors to Sentry
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error logging
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      console.error('[API Error] Network error - API server may be unreachable');
      console.error('[API Error] Check that:', 
        '\n1. Backend server is running on', API_URL,
        '\n2. On mobile: Use your computer\'s IP address instead of localhost',
        '\n3. Firewall allows connections on port 8000'
      );
    }
    
    // Log API errors to Sentry (native platforms only)
    if (Platform.OS !== 'web') {
      Sentry.captureException(error, {
        contexts: {
          api: {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            baseURL: API_URL,
            platform: Platform.OS,
          },
        },
      });
    }
    return Promise.reject(error);
  }
);

// Auth service
const authService = {
  /**
   * Login/Register
   */
  login: async (username: string): Promise<void> => {
    await AsyncStorage.setItem(USERNAME_KEY, username);
  },

  /**
   * Google OAuth login (not implemented yet for mobile)
   */
  loginWithGoogle: async (idToken: string): Promise<any> => {
    try {
      const response = await apiClient.post('/login/google', {
        id_token: idToken,
      });
      
      if (response.data && response.data.username) {
        await authService.login(response.data.username);
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout
   */
  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem(USERNAME_KEY);
  },

  /**
   * Get current username
   */
  getCurrentUsername: async (): Promise<string | null> => {
    return await AsyncStorage.getItem(USERNAME_KEY);
  },

  /**
   * Check if logged in
   */
  isLoggedIn: async (): Promise<boolean> => {
    const username = await AsyncStorage.getItem(USERNAME_KEY);
    return username !== null;
  },
};

export { apiClient, authService, API_URL, USERNAME_KEY };
