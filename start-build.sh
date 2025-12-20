cd /Users/ken/dev/shabon/shabon-app
npx eas build --platform ios --profile production --auto-submit

# コード変更後
cd /Users/ken/dev/shabon/shabon-app

# プロダクション環境に即座に反映
npm run update:production

# または
npx eas update --branch production --message "Fix: シェーダーの調整"

# 1. Updateを配信（メッセージ付き）
npm run update:production -- --message "Fix: シェーダー調整"

# 2. Update履歴を確認（最新10件）
npm run update:list

# 3. 特定のUpdateの詳細を確認
npm run update:view -- <update-id>

# 4. 問題があったら前のバージョンに戻す
npm run update:rollback

# サブミット
cd /Users/ken/dev/shabon/shabon-app
npx eas submit --platform ios --latest

# ローカルビルド
cd /Users/ken/dev/shabon/shabon-app
eas build --profile development --platform ios --local


# ローカルビルドを実行
npx expo start --dev-client

# ローカルビルドを実行
npx expo run:ios

# ローカルビルドを実行
npx expo run:android