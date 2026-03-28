/**
 * アプリ起動時のプリロード処理
 * スプラッシュ画面表示中やバックグラウンドで先読みする
 */

import { apiClient } from './api';
import { saveSchema, getSchema } from '@/lib/database';

/**
 * スキーマをプリロード（バックグラウンドで実行）
 */
export async function preloadSchema() {
  try {
    console.log('[Preload] Schema preload started');
    
    // キャッシュがあるかチェック
    const cachedSchema = await getSchema();
    if (cachedSchema) {
      console.log('[Preload] Schema already cached, skipping API call');
      return;
    }
    
    // APIから取得
    const response = await apiClient.get('/settings/schema');
    const sortedAttributes = response.data.attributes.sort(
      (a: any, b: any) => a.display_order - b.display_order
    );
    
    // SQLiteに保存
    await saveSchema(sortedAttributes);
    console.log('[Preload] Schema preloaded successfully');
  } catch (error) {
    // エラーは無視（次回画面表示時に再取得される）
    console.log('[Preload] Schema preload failed (will retry later):', error);
  }
}

