import * as SQLite from 'expo-sqlite';

const DB_NAME = 'shabon.db';

let db: SQLite.SQLiteDatabase | null = null;

// データベースを開く
export async function openDatabase() {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await initializeTables();
  return db;
}

// テーブルを初期化
async function initializeTables() {
  if (!db) return;

  // チャット履歴テーブル
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY,
      mate_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      message_text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_chat_mate_id ON chat_history(mate_id);
    CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_history(created_at);
  `);

  // メイト一覧テーブル
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS mates (
      id INTEGER PRIMARY KEY,
      mate_name TEXT NOT NULL,
      mate_id TEXT,
      last_message TEXT,
      is_public INTEGER,
      image_url TEXT,
      last_chat_time TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mates_updated_at ON mates(updated_at);
  `);

  // 公開メイト一覧テーブル
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS public_mates (
      id INTEGER PRIMARY KEY,
      mate_name TEXT NOT NULL,
      mate_id TEXT,
      profile_preview TEXT,
      image_url TEXT,
      created_at TEXT,
      updated_at TEXT NOT NULL,
      display_order INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_public_mates_updated_at ON public_mates(updated_at);
    CREATE INDEX IF NOT EXISTS idx_public_mates_display_order ON public_mates(display_order);
  `);

  // スキーマキャッシュテーブル（メイト作成画面の項目）
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schema_data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // マイグレーション: display_orderカラムを追加（既存DBのため）
  try {
    await db.execAsync(`
      ALTER TABLE public_mates ADD COLUMN display_order INTEGER DEFAULT 0;
    `);
    console.log('[Database] Migration: Added display_order column to public_mates');
  } catch (error: any) {
    // カラムが既に存在する場合はエラーを無視
    if (!error.message.includes('duplicate column name')) {
      console.log('[Database] display_order column already exists or migration skipped');
    }
  }

  console.log('[Database] Tables initialized');
}

// チャット履歴を保存
export async function saveChatHistory(mateId: number, messages: any[]) {
  const database = await openDatabase();
  
  // 既存の履歴を削除
  await database.runAsync('DELETE FROM chat_history WHERE mate_id = ?', [mateId]);
  
  // 新しい履歴を保存（idは自動採番）
  for (const msg of messages) {
    await database.runAsync(
      'INSERT INTO chat_history (mate_id, role, message_text, created_at) VALUES (?, ?, ?, ?)',
      [mateId, msg.role, msg.message_text, msg.created_at]
    );
  }
  
  console.log(`[Database] Saved ${messages.length} messages for mate ${mateId}`);
}

// チャット履歴を取得
export async function getChatHistory(mateId: number) {
  const database = await openDatabase();
  
  const result = await database.getAllAsync(
    'SELECT * FROM chat_history WHERE mate_id = ? ORDER BY created_at ASC',
    [mateId]
  );
  
  console.log(`[Database] Loaded ${result.length} messages for mate ${mateId}`);
  return result;
}

// メイト一覧を保存
export async function saveMates(mates: any[]) {
  const database = await openDatabase();
  const now = new Date().toISOString();
  
  // 既存のメイトを削除
  await database.runAsync('DELETE FROM mates');
  
  // 新しいメイトを保存
  for (const mate of mates) {
    await database.runAsync(
      'INSERT INTO mates (id, mate_name, mate_id, last_message, is_public, image_url, last_chat_time, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [mate.id, mate.mate_name, mate.mate_id, mate.last_message, mate.is_public ? 1 : 0, mate.image_url, mate.last_chat_time, now]
    );
  }
  
  console.log(`[Database] Saved ${mates.length} mates`);
}

// メイト一覧を取得
export async function getMates() {
  const database = await openDatabase();
  
  const result = await database.getAllAsync('SELECT * FROM mates ORDER BY last_chat_time DESC');
  
  console.log(`[Database] Loaded ${result.length} mates`);
  return result.map((row: any) => ({
    ...row,
    is_public: row.is_public === 1,
  }));
}

// 公開メイト一覧を保存
export async function savePublicMates(mates: any[]) {
  const database = await openDatabase();
  const now = new Date().toISOString();
  
  // 既存の公開メイトを削除
  await database.runAsync('DELETE FROM public_mates');
  
  // 新しい公開メイトを保存（APIから取得した順番を保持するため、display_orderを追加）
  for (let i = 0; i < mates.length; i++) {
    const mate = mates[i];
    await database.runAsync(
      'INSERT INTO public_mates (id, mate_name, mate_id, profile_preview, image_url, created_at, updated_at, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [mate.id, mate.mate_name, mate.mate_id, mate.profile_preview, mate.image_url, mate.created_at, now, i]
    );
  }
  
  console.log(`[Database] Saved ${mates.length} public mates`);
}

// 公開メイト一覧を取得
export async function getPublicMates() {
  const database = await openDatabase();
  
  // display_orderでソート（APIから取得した順番を保持）
  const result = await database.getAllAsync('SELECT * FROM public_mates ORDER BY display_order ASC');
  
  console.log(`[Database] Loaded ${result.length} public mates`);
  return result;
}

// スキーマを保存
export async function saveSchema(schema: any[]) {
  const database = await openDatabase();
  
  // 既存のスキーマを削除
  await database.execAsync('DELETE FROM schema_cache');
  
  // 新しいスキーマを保存
  await database.runAsync(
    'INSERT INTO schema_cache (schema_data, updated_at) VALUES (?, ?)',
    [JSON.stringify(schema), new Date().toISOString()]
  );
  
  console.log(`[Database] Saved schema with ${schema.length} attributes`);
}

// スキーマを取得
export async function getSchema() {
  const database = await openDatabase();
  
  const result = await database.getFirstAsync('SELECT schema_data FROM schema_cache ORDER BY id DESC LIMIT 1');
  
  if (result && (result as any).schema_data) {
    const schema = JSON.parse((result as any).schema_data);
    console.log(`[Database] Loaded schema with ${schema.length} attributes`);
    return schema;
  }
  
  console.log('[Database] No cached schema found');
  return null;
}

// データベースをクリア（デバッグ用）
export async function clearDatabase() {
  const database = await openDatabase();
  
  await database.execAsync(`
    DELETE FROM chat_history;
    DELETE FROM mates;
    DELETE FROM public_mates;
    DELETE FROM schema_cache;
  `);
  
  console.log('[Database] Cleared all data');
}

