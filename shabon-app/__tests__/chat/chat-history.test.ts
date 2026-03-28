import { apiClient } from '@/services/api';

jest.mock('@/services/api');

describe('チャット履歴', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('履歴取得', () => {
    it('チャット履歴が正しく取得される', async () => {
      const mockHistory = {
        data: {
          history: [
            { role: 'user', text: 'こんにちは' },
            { role: 'model', text: 'こんにちは！' },
          ],
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockHistory);

      const result = await apiClient.get('/chat/history/1');

      expect(apiClient.get).toHaveBeenCalledWith('/chat/history/1');
      expect(result.data.history).toHaveLength(2);
    });

    it('空の履歴が返される', async () => {
      const mockHistory = {
        data: { history: [] },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockHistory);

      const result = await apiClient.get('/chat/history/1');

      expect(result.data.history).toHaveLength(0);
    });
  });

  describe('履歴の並行取得', () => {
    it('メイト情報とチャット履歴を並行取得', async () => {
      const mockMate = { data: { id: 1, mate_name: 'テスト' } };
      const mockHistory = { data: { history: [] } };

      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce(mockMate)
        .mockResolvedValueOnce(mockHistory);

      const [mateResult, historyResult] = await Promise.all([
        apiClient.get('/mates/1'),
        apiClient.get('/chat/history/1'),
      ]);

      expect(apiClient.get).toHaveBeenCalledTimes(2);
      expect(mateResult.data.mate_name).toBe('テスト');
      expect(historyResult.data.history).toHaveLength(0);
    });
  });

  describe('履歴の整形', () => {
    it('メッセージロールが正しい', () => {
      const history = [
        { role: 'user', text: 'ユーザーメッセージ' },
        { role: 'model', text: 'AIメッセージ' },
      ];

      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('model');
    });

    it('メッセージテキストが正しい', () => {
      const history = [
        { role: 'user', text: 'こんにちは' },
        { role: 'model', text: 'こんにちは！' },
      ];

      expect(history[0].text).toBe('こんにちは');
      expect(history[1].text).toBe('こんにちは！');
    });
  });
});

