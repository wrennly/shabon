// API client for ChatCraft React Native App
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const API_URL = 'https://chatcraft-api-v3.onrender.com';
const USERNAME_KEY = '@chatcraft_username';

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
