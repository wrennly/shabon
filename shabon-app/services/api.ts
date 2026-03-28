// API client for Shabon React Native App
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { authService } from './auth';

// Constants
const API_URL_DEV = Constants.expoConfig?.extra?.apiUrlDev || 
                    process.env.EXPO_PUBLIC_API_URL_DEV || 
                    'http://localhost:8000';
const API_URL_PROD = Constants.expoConfig?.extra?.apiUrlProd || 
                     process.env.EXPO_PUBLIC_API_URL_PROD || 
                     'https://chatcraft-api-v3.onrender.com';

// Use development API for all platforms in dev, production API only for release builds
// This allows iPhone/Android to talk to your local backend via EXPO_PUBLIC_API_URL_DEV
const API_URL = __DEV__ ? API_URL_DEV : API_URL_PROD;

// Log API URL for debugging (development only)
if (__DEV__) {
  console.log('[API] Platform:', Platform.OS);
  console.log('[API] Using API:', API_URL);
  if (Platform.OS === 'web') {
    console.log('[API] Development mode - connecting to local server');
  } else {
    console.log('[API] Mobile mode - connecting to production server');
  }
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add Authorization header automatically using Supabase JWT
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (__DEV__) {
      console.log('[API] interceptor - session:', session);
    }

    if (session?.access_token) {
      config.headers['Authorization'] = `Bearer ${session.access_token}`;
      if (__DEV__) {
        console.log('[API] interceptor - set Authorization for', config.url);
      }
    } else if (__DEV__) {
      console.warn('[API] interceptor - no session when calling', config.url);
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
    if (__DEV__) {
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        console.error('[API Error] Network error - API server may be unreachable');
        console.error('[API Error] Check that:', 
          '\n1. Backend server is running on', API_URL,
          '\n2. On mobile: Use your computer\'s IP address instead of localhost',
          '\n3. Firewall allows connections on port 8000'
        );
      }
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

export { apiClient, API_URL, authService };
