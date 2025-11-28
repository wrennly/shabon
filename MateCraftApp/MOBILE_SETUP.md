# モバイル開発セットアップガイド

## 問題: モバイルデバイスからローカルAPIに接続できない

モバイルデバイス（実機またはエミュレータ）から`localhost:8000`にアクセスしようとすると、`Network Error`や`AxiosError`が発生します。

### 原因

`localhost`はデバイス自身を指すため、開発マシン上で動作しているAPIサーバーにはアクセスできません。

## 解決方法

### 方法1: ローカルIPアドレスを使用（推奨）

1. **コンピュータのIPアドレスを確認**

   macOS/Linux:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

   Windows:
   ```cmd
   ipconfig
   ```

   例: `192.168.1.100`

2. **`.env`ファイルを更新**

   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
   ```

3. **バックエンドサーバーを再起動**

   FastAPIサーバーが全てのネットワークインターフェースでリッスンするように設定:

   ```bash
   cd chatcraft-api
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Expoアプリを再起動**

   ```bash
   cd ChatCraftApp
   npx expo start -c
   ```

### 方法2: ngrokを使用（外部ネットワークからもアクセス可能）

1. **ngrokをインストール**

   ```bash
   brew install ngrok  # macOS
   # または https://ngrok.com/ からダウンロード
   ```

2. **ngrokでトンネルを作成**

   ```bash
   ngrok http 8000
   ```

3. **表示されたHTTPS URLを`.env`に設定**

   ```env
   EXPO_PUBLIC_API_URL=https://xxxx-xx-xxx-xxx-xxx.ngrok-free.app
   ```

### 方法3: 本番APIを使用

開発中でも本番APIを使用する場合:

```env
EXPO_PUBLIC_API_URL=https://chat-craft-api.onrender.com
```

## トラブルシューティング

### エラー: "Network Error" または "AxiosError"

**確認事項:**

1. ✅ バックエンドサーバーが起動しているか
   ```bash
   curl http://localhost:8000/health  # または /docs
   ```

2. ✅ モバイルデバイスとPCが同じWi-Fiネットワークに接続されているか

3. ✅ ファイアウォールがポート8000をブロックしていないか
   - macOS: システム設定 > ネットワーク > ファイアウォール
   - Windows: Windowsファイアウォールの設定

4. ✅ `.env`ファイルが正しく読み込まれているか
   - アプリのコンソールログで `[API] Base URL:` を確認

5. ✅ CORSが正しく設定されているか（`chatcraft-api/main.py`）
   ```python
   origins = [
       "http://localhost:3000",
       "http://localhost:8081",
       "http://192.168.1.100:8081",  # あなたのIPアドレス
       # ...
   ]
   ```

### ログの確認

開発ツールのコンソールで以下を確認:

```
[API] Base URL: http://192.168.1.100:8000
[API Warning] Using localhost on mobile device...  # ← このWarningが出たら設定が必要
```

## ベストプラクティス

1. **開発時**: ローカルIPアドレスを使用
2. **デモ/テスト時**: ngrokを使用
3. **本番時**: 本番APIのURL（環境変数で切り替え）

## 環境変数の管理

複数の環境に対応するため、`.env`ファイルを使い分ける:

```bash
# 開発用
cp .env.development .env

# 本番用
cp .env.production .env
```

`.env.development`:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
EXPO_PUBLIC_ENVIRONMENT=development
```

`.env.production`:
```env
EXPO_PUBLIC_API_URL=https://chat-craft-api.onrender.com
EXPO_PUBLIC_ENVIRONMENT=production
```
