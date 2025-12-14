# Shabon App - テスト

## 概要

このプロジェクトには、高ROIと中ROIの機能に対する自動テストが実装されています。

## テストの実行

### 全テストを実行

```bash
npm test
```

### ウォッチモードで実行（開発時）

```bash
npm run test:watch
```

### カバレッジレポートを生成

```bash
npm run test:coverage
```

## テストカバレッジ

### 高ROI（High Return on Investment）

これらのテストは、ビジネスクリティカルな機能をカバーしています：

1. **認証テスト** (`__tests__/auth/auth.test.ts`)
   - ログイン状態チェック
   - セッション管理
   - ログアウト機能

2. **メイト作成テスト** (`__tests__/mates/mate-creation.test.ts`)
   - バリデーション（メイト名、メイトID）
   - API呼び出し
   - メイトID重複チェック

3. **チャット送信テスト** (`__tests__/chat/chat-send.test.ts`)
   - メッセージ送信
   - 履歴管理
   - エラーハンドリング

4. **キャッシュロジックテスト** (`__tests__/mates/cache-logic.test.ts`)
   - キャッシュの有効性チェック（30秒）
   - キャッシュの更新
   - 強制リフレッシュ

### 中ROI（Medium Return on Investment）

これらのテストは、ユーザー体験に重要な機能をカバーしています：

1. **検索機能テスト** (`__tests__/search/search.test.ts`)
   - メイト名での検索
   - メイトIDでの検索
   - 複合検索
   - 大文字小文字の区別なし

2. **画像機能テスト** (`__tests__/images/image-validation.test.ts`)
   - ファイルタイプチェック
   - ファイルサイズチェック（5MB制限）
   - 画像最適化パラメータ（512x512, JPEG 70%）
   - ファイル名生成

3. **UI表示テスト** (`__tests__/mates/mate-display.test.tsx`)
   - メイトカード表示
   - デフォルト画像表示

4. **チャット履歴テスト** (`__tests__/chat/chat-history.test.ts`)
   - 履歴取得
   - 並行取得（Promise.all）
   - 履歴の整形

## テスト結果

```
Test Suites: 8 passed, 8 total
Tests:       46 passed, 46 total
Snapshots:   0 total
Time:        ~1s
```

## テスト構成

### Jest設定 (`jest.config.js`)

- **Preset**: `jest-expo`
- **Transform Ignore Patterns**: React Native、Expo、Supabaseモジュールを変換対象に含む
- **Setup**: `jest.setup.js`でモックを設定
- **Module Name Mapper**: `@/` エイリアスをサポート

### モック設定 (`jest.setup.js`)

以下のモジュールがモックされています：

- `expo-router`
- `expo-font`, `expo-asset`, `expo-constants`
- `react-native-safe-area-context`
- `@react-navigation/native`
- `@shopify/react-native-skia`
- `expo-glass-effect`
- `expo-blur`
- `@sentry/react-native`
- Expo Winter (`__ExpoImportMetaRegistry`)
- `structuredClone`

### 環境変数

テスト実行時に以下の環境変数が設定されます：

- `EXPO_PUBLIC_SUPABASE_URL`: `https://test.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: `test-anon-key`

## テストの追加

新しいテストを追加する場合は、`__tests__/` ディレクトリ内に以下の命名規則でファイルを作成してください：

```
__tests__/
  ├── auth/
  │   └── *.test.ts
  ├── mates/
  │   └── *.test.ts
  ├── chat/
  │   └── *.test.ts
  ├── search/
  │   └── *.test.ts
  └── images/
      └── *.test.ts
```

## CI/CD統合

このテストスイートは、CI/CDパイプラインに統合できます：

```yaml
# .github/workflows/test.yml の例
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage
```

## トラブルシューティング

### テストが失敗する場合

1. 依存関係を再インストール：
   ```bash
   rm -rf node_modules
   npm install --legacy-peer-deps
   ```

2. Jestキャッシュをクリア：
   ```bash
   npx jest --clearCache
   ```

3. 特定のテストファイルのみ実行：
   ```bash
   npm test __tests__/auth/auth.test.ts
   ```

### モックの問題

`jest.setup.js`でモックが正しく設定されているか確認してください。新しいモジュールを使用する場合は、適切なモックを追加する必要があります。

## 参考資料

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [jest-expo](https://docs.expo.dev/develop/unit-testing/)

