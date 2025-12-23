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
#　ライブラリ追加時のビルド
eas build --profile development --platform ios
# 普通のローカルビルド
eas build --profile development --platform ios --local
cd /Users/ken/dev/shabon/shabon-app && eas build --profile development --platform ios --local

# ローカルビスタート
npx expo start --dev-client --clear 

# ローカルビルドを実行
npx expo run:ios

# ローカルビルドを実行
npx expo run:android

# 本番同様に動かす
cd /Users/ken/dev/shabon/shabon-app && npx expo run:ios --configuration Release

# XcodeのDerivedDataを削除
rm -rf ~/Library/Developer/Xcode/DerivedData

# 過去のアーカイブを削除
open ~/Library/Developer/Xcode/Archives