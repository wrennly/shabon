describe('検索機能', () => {
  const mockMates = [
    { id: 1, mate_name: 'テストメイト', mate_id: 'test1234' },
    { id: 2, mate_name: 'サンプル', mate_id: 'sample123' },
    { id: 3, mate_name: 'デモキャラ', mate_id: 'demo5678' },
  ];

  describe('メイト名での検索', () => {
    it('部分一致で検索できる', () => {
      const query = 'テスト';
      const filtered = mockMates.filter(mate =>
        mate.mate_name.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].mate_name).toBe('テストメイト');
    });

    it('大文字小文字を区別しない', () => {
      const query = 'SAMPLE';
      const filtered = mockMates.filter(mate =>
        mate.mate_name.toLowerCase().includes(query.toLowerCase()) ||
        mate.mate_id?.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].mate_id).toBe('sample123');
    });

    it('空文字の場合は全件表示', () => {
      const query = '';
      const filtered = query
        ? mockMates.filter(mate =>
            mate.mate_name.toLowerCase().includes(query.toLowerCase())
          )
        : mockMates;

      expect(filtered).toHaveLength(3);
    });
  });

  describe('メイトIDでの検索', () => {
    it('メイトIDで検索できる', () => {
      const query = 'demo';
      const filtered = mockMates.filter(mate =>
        mate.mate_id?.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].mate_id).toBe('demo5678');
    });
  });

  describe('複合検索', () => {
    it('メイト名とメイトIDの両方を検索', () => {
      const query = 'test';
      const filtered = mockMates.filter(mate =>
        mate.mate_name.toLowerCase().includes(query.toLowerCase()) ||
        mate.mate_id?.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].mate_name).toBe('テストメイト');
    });
  });

  describe('検索結果なし', () => {
    it('該当なしの場合は空配列', () => {
      const query = 'notfound';
      const filtered = mockMates.filter(mate =>
        mate.mate_name.toLowerCase().includes(query.toLowerCase()) ||
        mate.mate_id?.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered).toHaveLength(0);
    });
  });
});

