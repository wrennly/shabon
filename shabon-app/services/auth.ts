import { supabase } from '@/lib/supabase';
import { logToDiscord, logErrorToDiscord } from '@/utils/discord-logger';

const isLoggedIn = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (__DEV__) {
      console.log('[Auth] isLoggedIn - session:', data.session);
    }
    return !!data.session;
  } catch (error) {
    console.error('Auth status check failed:', error);
    return false;
  }
};

const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Password sign-in error:', error);
    throw error;
  }

  if (__DEV__) {
    console.log('[Auth] signInWithPassword - result:', {
      user: data.user,
      session: data.session,
    });
  }

  return data;
};

export const authService = {
  /**
   * Sign in with Google ID Token
   */
  signInWithGoogle: async (idToken: string) => {
    try {
      await logToDiscord('[authService] signInWithGoogle呼び出し', {
        tokenLength: idToken.length,
        tokenPreview: idToken.substring(0, 30) + '...',
      });

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        await logErrorToDiscord('[authService] Supabase認証エラー（Google）', error);
        throw error;
      }
      
      await logToDiscord('[authService] Supabase認証成功（Google）', {
        userId: data.user?.id,
        email: data.user?.email,
        provider: data.user?.app_metadata?.provider,
      });
      
      return data;
    } catch (error) {
      await logErrorToDiscord('[authService] Google Sign-in例外', error);
      throw error;
    }
  },

  /**
   * Sign in with Apple Identity Token
   * @param identityToken - The identity token from Apple
   * @param nonce - The raw (unhashed) nonce that was used to generate the hashed nonce sent to Apple
   */
  signInWithApple: async (identityToken: string, nonce: string) => {
    try {
      await logToDiscord('[authService] signInWithApple呼び出し', {
        tokenLength: identityToken.length,
        rawNonce: nonce,
        tokenPreview: identityToken.substring(0, 30) + '...',
      });

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
        nonce: nonce, // Pass the RAW nonce to Supabase
      });

      if (error) {
        await logErrorToDiscord('[authService] Supabase認証エラー', error);
        throw error;
      }
      
      await logToDiscord('[authService] Supabase認証成功', {
        userId: data.user?.id,
        email: data.user?.email,
        provider: data.user?.app_metadata?.provider,
      });
      
      return data;
    } catch (error) {
      await logErrorToDiscord('[authService] Apple Sign-in例外', error);
      throw error;
    }
  },

  /**
   * Sign out
   */
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // セッションが既に無い場合などは AuthSessionMissingError になることがある
        const message = (error as any)?.message || '';
        const name = (error as any)?.name || '';
        if (name === 'AuthSessionMissingError' || message.includes('Auth session missing')) {
          if (__DEV__) {
            console.warn('[Auth] signOut called with no active session - ignoring');
          }
          return;
        }
        throw error;
      }
    } catch (err: any) {
      const message = err?.message || '';
      const name = err?.name || '';
      if (name === 'AuthSessionMissingError' || message.includes('Auth session missing')) {
        if (__DEV__) {
          console.warn('[Auth] signOut threw AuthSessionMissingError - ignoring');
        }
        return;
      }
      console.error('Sign-out error:', err);
      throw err;
    }
  },

  /**
   * Get current session
   */
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Get current user
   */
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  /**
   * Check login state
   */
  isLoggedIn,

  /**
   * Development helper: sign in with Supabase email/password
   */
  signInWithPassword,
};
