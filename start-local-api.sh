#!/bin/bash
echo "Python venv を起動します..."
source .venv/bin/activate
cd shabon-api

echo "DBを最新 (alembic upgrade head) にします..."
alembic upgrade head

echo "APIをバックグラウンドで起動します..."
uvicorn main:app --host 0.0.0.0 --port 8000 
# ---
echo "EXPOを終了しました。バックグラウンドのAPIも停止します..."
if ps -p $! > /dev/null; then
    kill $!
    wait $! 2>/dev/null
fi
echo "クリーンアップ完了！"