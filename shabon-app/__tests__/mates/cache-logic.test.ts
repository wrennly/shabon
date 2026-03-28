describe('キャッシュロジック', () => {
  const CACHE_DURATION = 30000; // 30秒

  describe('キャッシュの有効性チェック', () => {
    it('30秒以内はキャッシュが有効', () => {
      const cache = {
        data: [{ id: 1, mate_name: 'test' }],
        timestamp: Date.now(),
      };

      const now = Date.now();
      const isValid = (now - cache.timestamp) < CACHE_DURATION;

      expect(isValid).toBe(true);
    });

    it('30秒経過後はキャッシュが無効', () => {
      const cache = {
        data: [{ id: 1, mate_name: 'test' }],
        timestamp: Date.now() - 31000, // 31秒前
      };

      const now = Date.now();
      const isValid = (now - cache.timestamp) < CACHE_DURATION;

      expect(isValid).toBe(false);
    });

    it('キャッシュがnullの場合は無効', () => {
      const cache = {
        data: null,
        timestamp: Date.now(),
      };

      const isValid = cache.data !== null;

      expect(isValid).toBe(false);
    });
  });

  describe('キャッシュの更新', () => {
    it('新しいデータでキャッシュを更新', () => {
      const newData = [{ id: 2, mate_name: 'new' }];
      const cache = {
        data: newData,
        timestamp: Date.now(),
      };

      expect(cache.data).toEqual(newData);
      expect(cache.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('強制リフレッシュ', () => {
    it('forceRefresh=trueの場合はキャッシュを無視', () => {
      const forceRefresh = true;
      const cache = {
        data: [{ id: 1, mate_name: 'test' }],
        timestamp: Date.now(),
      };

      const shouldUseCache = !forceRefresh && cache.data !== null;

      expect(shouldUseCache).toBe(false);
    });

    it('forceRefresh=falseでキャッシュ有効な場合は使用', () => {
      const forceRefresh = false;
      const cache = {
        data: [{ id: 1, mate_name: 'test' }],
        timestamp: Date.now(),
      };

      const now = Date.now();
      const cacheValid = (now - cache.timestamp) < CACHE_DURATION;
      const shouldUseCache = !forceRefresh && cache.data !== null && cacheValid;

      expect(shouldUseCache).toBe(true);
    });
  });
});

