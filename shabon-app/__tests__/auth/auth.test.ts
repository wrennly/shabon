import { authService } from '@/services/auth';
import { supabase } from '@/lib/supabase';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
      signInWithIdToken: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));

describe('認証サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ログイン状態チェック', () => {
    it('セッションがある場合はログイン済みと判定', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            access_token: 'dummy-token',
            user: { id: '123' },
          },
        },
        error: null,
      });

      const isLoggedIn = await authService.isLoggedIn();
      expect(isLoggedIn).toBe(true);
    });

    it('セッションがない場合は未ログインと判定', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const isLoggedIn = await authService.isLoggedIn();
      expect(isLoggedIn).toBe(false);
    });

    it('エラーの場合は未ログインと判定', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: new Error('Auth error'),
      });

      const isLoggedIn = await authService.isLoggedIn();
      expect(isLoggedIn).toBe(false);
    });
  });

  describe('ログアウト', () => {
    it('Supabaseのサインアウトが呼ばれる', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });
      
      await authService.signOut();
      
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('セッションがない場合もエラーにならない', async () => {
      const error = new Error('Auth session missing');
      (error as any).name = 'AuthSessionMissingError';
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: error,
      });
      
      await expect(authService.signOut()).resolves.not.toThrow();
    });
  });
});

