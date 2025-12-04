# Supabase への Postgres 移行ガイド

Render 無料プラン Postgres は 90 日で破棄されるため、長期運用・拡張性確保・コスト安定化を目的として Supabase へ移行します。本ガイドは ChatCraft の既存 FastAPI + SQLModel + Alembic + pgvector 構成を前提とします。

---
## 目的
- 永続運用: 自動失効リスクを排除
- 拡張性: Supabase Auth / Storage / Edge Functions 活用余地
- 安定性 & 可視性: Web コンソールで接続・ログ・ロール管理が容易
- 機能継続: pgvector / 既存 RAG 機能をそのまま保持

---
## 移行戦略選択肢
| 戦略 | 概要 | 利点 | 注意点 |
|------|------|------|--------|
| A. フルダンプ復元 | Render DB を丸ごと pg_dump → Supabase に復元 | 最短移行・既存データ完全保持 | Alembic version 履歴の整合が必要 (stamp)
| B. スキーマ再構築 + データ抽出 | Alembic で新規スキーマ → 必要テーブルのみ COPY/INSERT | クリーンな履歴保持 | 初期データ選別が必要
| C. 初期化 (データ移行なし) | スキーマのみ再構築 | 新規スタートが最も簡単 | 過去履歴を失う

推奨: 初期ユーザーデータとメイト/チャット履歴を保持したい前提で A を採用。

---
## 事前準備
1. Supabase プロジェクト作成 (Region は低レイテンシの近接リージョン選択)
2. Database パスワード / Service Role Key の保護 (Service Role Key はバックエンドのみで使用し、フロントには渡さない)
3. pgvector 拡張有効化
```sql
create extension if not exists vector;
```
4. RDS と同様に接続は SSL 必須: 接続文字列に `?sslmode=require` が付与されていることを確認。
5. ロール: デフォルトの `postgres` ではなく専用アプリ用ロールを作成 (不要なら後回し可)

---
## Render 側データエクスポート
環境変数 `RENDER_DATABASE_URL` などを使用してダンプ。

```bash
# スキーマ+データを圧縮形式で取得
pg_dump -Fc "$RENDER_DATABASE_URL" -f render_dump.pg

# もしくはテキスト形式
pg_dump "$RENDER_DATABASE_URL" > render_dump.sql
```

ベクトル型 (pgvector) を使用しているため、復元先で拡張を先に有効化しておく。

---
## Supabase 復元
### 1. 拡張確認
```sql
select * from pg_available_extensions where name = 'vector';
create extension if not exists vector;
```

### 2. 復元実行
```bash
# 圧縮形式 dump の復元
pg_restore -d "$SUPABASE_DATABASE_URL" --clean --if-exists render_dump.pg

# テキスト形式の場合
psql "$SUPABASE_DATABASE_URL" -f render_dump.sql
```

`--clean --if-exists` は既存オブジェクトがあれば削除して再作成。初期状態なら外しても可。

---
## Alembic バージョン整合
ダンプは既に最新スキーマを含むため Alembic の `versions/` との差異が発生する場合がある。

1. Supabase へ接続できる `.env` を設定
2. `alembic current` で現在の revision を確認 (エラーになる場合は未 stamp)
3. 履歴が最新と一致するなら:
```bash
alembic stamp head
```
4. 以後、新規マイグレーションは通常通り `alembic revision --autogenerate -m "..."` → `alembic upgrade head`

---
## 環境変数設定
`.env` 例:
```
# Render 旧URL (退避用)
# DATABASE_URL=postgresql://user:pass@render-host:5432/db

# Supabase 本番接続 (サービスロールパスワード使用)
SUPABASE_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres?sslmode=require
```
`database.py` は `DATABASE_URL` が存在しない場合 `SUPABASE_DATABASE_URL` をフォールバック使用するよう更新。

---
## 接続動作確認チェックリスト
| チェック | コマンド / 方法 | 期待結果 |
|----------|-----------------|----------|
| 接続確認 | `psql $SUPABASE_DATABASE_URL -c "select 1"` | `?column? = 1` |
| pgvector 有効 | `\dx` / `select * from pg_extension;` | `vector` が表示 |
| Alembic 整合 | `alembic current` | 最新 revision が表示 |
| API 起動 | `uvicorn main:app --reload` | /health 正常 |
| RAG 検索 | チャットで既存記憶呼び出し | 過去 summary/記憶が利用される |
| 書き込み | 新規メイト作成 / チャット送信 | DB に反映 |

---
## プール設定 / 接続最適化
`create_engine()` 例:
```python
engine = create_engine(DB_URL, pool_recycle=300, pool_pre_ping=True)
```
- `pool_pre_ping=True`: アイドル接続切断時の自動再接続
- `pool_recycle=300`: 長時間放置による切断緩和

必要に応じて接続数調整 (Supabase スケールプランに依存)。

---
## セキュリティ注意点
- Service Role Key をフロントに絶対含めない
- DB 接続情報は `DATABASE_URL` ではなく `SUPABASE_DATABASE_URL` に分離
- 将来的に Row Level Security (RLS) を使う場合は Supabase Auth 連携を別設計※現在は FastAPI 側で認証
- 不要な拡張を有効化しない

---
## トラブルシュート
| 症状 | 原因 | 対処 |
|------|------|------|
| pg_restore で vector 型エラー | 拡張未作成 | `create extension vector;` 実行後再試行 |
| Alembic stamp 失敗 | DB内に `alembic_version` テーブルなし | `alembic stamp head` 前に正しい接続URL確認 |
| 接続遅延 | ネットワーク/SSL設定 | `sslmode=require` は維持、不要な DNS 遅延確認 |
| RAG で記憶 0 件 | データ移行漏れ | Render dump に ConversationMemory 含まれているか再確認 |

---
## 今後の拡張への影響
- Supabase Storage: メイト画像生成機能の格納候補
- Edge Functions: 軽量 webhook / 非同期要約バッチ
- Realtime: チャット更新の push 通知への転用

---
## 実行まとめ (最短コマンドセット)
```bash
# 1. Render ダンプ
pg_dump -Fc "$RENDER_DATABASE_URL" -f render_dump.pg

# 2. Supabase 拡張
psql "$SUPABASE_DATABASE_URL" -c "create extension if not exists vector;"

# 3. 復元
pg_restore -d "$SUPABASE_DATABASE_URL" --clean --if-exists render_dump.pg

# 4. Alembic 整合
alembic stamp head

# 5. 動作確認
psql "$SUPABASE_DATABASE_URL" -c "select 1" && alembic current
```

---
## 次アクション
1. `.env` へ SupabaseURL 設定
2. ダンプ取得＆復元
3. Alembic stamp
4. API 起動・RAG 検証
5. Render DB を Read-Only 化 (切替期間一時並行運用も可)

---
更新日: 2025-11-23
