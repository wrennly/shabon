import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth設定
const GOOGLE_CLIENT_ID = Constants.expoConfig?.extra?.googleClientId || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

// Expo Auth Sessionのリダイレクトスキーム
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'matecraft',
  path: 'auth',
});

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export interface GoogleAuthResult {
  idToken: string | null;
  accessToken: string | null;
  error?: string;
}

export const useGoogleAuth = () => {
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID || '',
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
    },
    discovery
  );

  return {
    request,
    response,
    promptAsync,
  };
};

export const exchangeCodeForToken = async (code: string): Promise<GoogleAuthResult> => {
  try {
    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId: GOOGLE_CLIENT_ID || '',
        code,
        redirectUri,
      },
      discovery
    );

    return {
      idToken: tokenResponse.idToken || null,
      accessToken: tokenResponse.accessToken || null,
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    return {
      idToken: null,
      accessToken: null,
      error: 'トークン取得に失敗しました',
    };
  }
};

// Web用の簡易実装（expo-web-browserを使用）
export const promptGoogleLoginWeb = async (): Promise<GoogleAuthResult> => {
  try {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=openid%20profile%20email`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const code = url.searchParams.get('code');

      if (code) {
        return await exchangeCodeForToken(code);
      }
    }

    return {
      idToken: null,
      accessToken: null,
      error: '認証がキャンセルされました',
    };
  } catch (error) {
    console.error('Google login error:', error);
    return {
      idToken: null,
      accessToken: null,
      error: 'Googleログインに失敗しました',
    };
  }
};
