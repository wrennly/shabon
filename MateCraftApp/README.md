# MateCraft Mobile App 👋

MateCraftのReact Native (Expo)版モバイルアプリです。

## セットアップ

1. 依存関係のインストール

   ```bash
   npm install
   ```

2. 環境変数の設定

   `.env.example`をコピーして`.env`ファイルを作成し、必要な値を設定してください。

   ```bash
   cp .env.example .env
   ```

   **必須の環境変数:**
   - `EXPO_PUBLIC_API_URL`: バックエンドAPIのURL
     - **Web開発**: `http://localhost:8000`
     - **モバイル開発**: お使いのコンピュータのローカルIPアドレスを使用（例: `http://192.168.1.100:8000`）
     - **本番環境**: `https://chat-craft-api.onrender.com`
   - `EXPO_PUBLIC_FEEDBACK_FORM_URL`: フィードバックフォームのURL

   **ローカルIPアドレスの確認方法:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

   **オプションの環境変数:**
   - `EXPO_PUBLIC_GA_MEASUREMENT_ID`: Google Analytics 4測定ID（アクセス解析）
   - `EXPO_PUBLIC_SENTRY_DSN`: Sentryのプロジェクト識別子（エラー監視）
   - `EXPO_PUBLIC_ENVIRONMENT`: 環境名（development/staging/production）
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuthクライアントID（将来の実装用）

3. アプリの起動

   ```bash
   npx expo start
   ```

   **モバイルデバイスでのテスト:**
   
   モバイルデバイス（実機またはエミュレータ）でテストする場合、`localhost`では接続できません。
   詳しくは [MOBILE_SETUP.md](./MOBILE_SETUP.md) を参照してください。

## 開発

以下の方法でアプリを実行できます:

- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [Expo Go](https://expo.dev/go) (物理デバイス)

**app**ディレクトリ内のファイルを編集することで開発を開始できます。このプロジェクトは[file-based routing](https://docs.expo.dev/router/introduction)を使用しています。

## 機能

- ✅ ユーザー認証
- ✅ チャット機能（AI応答）
- ✅ メイト管理（作成・編集・削除）
- ✅ 公開メイトの探索
- ✅ ダークモード対応
- ✅ プロフィール設定
- ✅ フィードバック送信
- ✅ Google Analytics 4統合（Web/Native）
- ✅ Sentryエラー監視

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
