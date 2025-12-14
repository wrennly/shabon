#!/bin/bash
echo "✨ ChatCraft 開発環境（かいはつかんきょう）をぜんぶ起動します！"

echo "✅ (1/4) Python venv を起動します..."
source .venv/bin/activate
cd shabon-api

echo "🚀 (2/4) DBを最新 (alembic upgrade head) にします..."
alembic upgrade head

echo "🧠 (3/4) APIをバックグラウンドで起動します..."
uvicorn main:app --host 0.0.0.0 --port 8000 &

# APIが起動するまで1秒だけ待つ（おまけ）
sleep 1 

echo "🎨 (4/4) EXPOを起動します..."
# 'chatcraft-api' フォルダから 1つ上の 'dev' フォルダを経由（けいゆ）して、
# 'MateCraftApp' フォルダに移動します
cd ../shabon-app
# --tunnel は ngrok のエラーが出やすいので、ローカル開発では外します
# スマホ実機で確認したい場合は --tunnel をつけてください
npx expo start

# ---
# React (npm start) を Ctrl+C で終了したときに、
# バックグラウンドの API (uvicorn) も一緒に終了させるおまじない
# ---
echo "EXPOを終了しました。バックグラウンドのAPIも停止します..."
if ps -p $! > /dev/null; then
    kill $!
    wait $! 2>/dev/null
fi
echo "クリーンアップ完了！またね (o^∀^o)b"