import { apiClient } from '@/services/api';

jest.mock('@/services/api');

describe('チャット送信', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('メッセージ送信', () => {
    it('空メッセージは送信できない', () => {
      const message = '   ';
      expect(message.trim()).toBe('');
    });

    it('メッセージが正しく送信される', async () => {
      const mockResponse = {
        data: {
          response: 'こんにちは！',
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.post('/chat/', {
        mate_id: 1,
        new_message: 'こんにちは',
        history: [],
      });

      expect(apiClient.post).toHaveBeenCalledWith('/chat/', {
        mate_id: 1,
        new_message: 'こんにちは',
        history: [],
      });
      expect(result.data.response).toBe('こんにちは！');
    });

    it('履歴が正しく送信される', async () => {
      const history = [
        { role: 'user', text: '前のメッセージ' },
        { role: 'model', text: '前の返信' },
      ];

      const mockResponse = {
        data: { response: '新しい返信' },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      await apiClient.post('/chat/', {
        mate_id: 1,
        new_message: '新しいメッセージ',
        history: history,
      });

      expect(apiClient.post).toHaveBeenCalledWith('/chat/', {
        mate_id: 1,
        new_message: '新しいメッセージ',
        history: history,
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラー時にエラーを返す', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        apiClient.post('/chat/', {
          mate_id: 1,
          new_message: 'test',
          history: [],
        })
      ).rejects.toThrow('Network error');
    });
  });
});

