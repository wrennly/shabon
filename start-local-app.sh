#!/bin/bash
cd shabon-app
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