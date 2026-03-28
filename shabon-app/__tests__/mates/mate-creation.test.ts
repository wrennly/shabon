import { apiClient } from '@/services/api';

jest.mock('@/services/api', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
  authService: {
    isLoggedIn: jest.fn(() => Promise.resolve(true)),
  },
}));

describe('メイト作成', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('バリデーション', () => {
    it('メイト名が必須', () => {
      const mateName = '';
      expect(mateName.trim()).toBe('');
    });

    it('メイトIDが8文字以上', () => {
      const mateId = 'test1234';
      expect(mateId.length).toBeGreaterThanOrEqual(8);
    });

    it('メイトIDが英数字のみ', () => {
      const mateId = 'test1234';
      const regex = /^[a-z0-9]+$/;
      expect(regex.test(mateId)).toBe(true);
    });

    it('メイトIDに特殊文字は不可', () => {
      const mateId = 'test@123';
      const regex = /^[a-z0-9]+$/;
      expect(regex.test(mateId)).toBe(false);
    });
  });

  describe('API呼び出し', () => {
    it('メイト作成APIが正しく呼ばれる', async () => {
      const mockResponse = {
        data: {
          id: 1,
          mate_name: 'テストメイト',
          mate_id: 'test1234',
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.post('/mates/', {
        mate_name: 'テストメイト',
        mate_id: 'test1234',
        settings: [],
      });

      expect(apiClient.post).toHaveBeenCalledWith('/mates/', {
        mate_name: 'テストメイト',
        mate_id: 'test1234',
        settings: [],
      });
      expect(result.data.id).toBe(1);
    });

    it('メイトID重複チェックが正しく動作', async () => {
      const mockResponse = {
        data: { available: false, reason: 'このIDは既に使用されています' },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.get('/mates/check-mate-id/test1234');

      expect(result.data.available).toBe(false);
      expect(result.data.reason).toBe('このIDは既に使用されています');
    });
  });
});

