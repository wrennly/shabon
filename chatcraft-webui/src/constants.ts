// src/constants.ts

// API エンドポイント
export const API_URL_DEV = 'http://127.0.0.1:8000';
export const API_URL_PROD = 'https://chatcraft-api-v3.onrender.com';

// LocalStorage キー
export const USERNAME_KEY = 'chatcraft_username';

// UI 設定
export const BOTTOM_NAV_HEIGHT_PX = 72;
export const BOTTOM_NAV_HEIGHT = `${BOTTOM_NAV_HEIGHT_PX}px`;

// Google Analytics
export const GA_MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID || '';

// Sentry
export const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN || '';
export const ENVIRONMENT = process.env.NODE_ENV || 'development';