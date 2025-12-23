# database.py

from sqlmodel import create_engine, Session
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL or SUPABASE_DATABASE_URL must be set in environment.")

# Database engine configuration
# 対策: Supabaseの60分アイドルタイムアウトに対する防御
# 参考: https://docs.sqlalchemy.org/en/20/core/pooling.html
engine = create_engine(
    DATABASE_URL,
    # 接続プール設定
    pool_size=10,            # プール内の常時接続数
    max_overflow=20,         # プールを超えて作成可能な接続数
    pool_timeout=60,         # プールから接続取得時のタイムアウト（秒）
    
    # 【重要】1時間エラー対策の核心設定
    pool_recycle=1800,       # 30分ごとに接続をリサイクル（Supabaseの60分タイムアウトより前に更新）
    pool_pre_ping=True,      # 使用前に接続の生死確認（死んだ接続は自動破棄）
    
    # TCP Keep-Alive設定（サイレント切断防止）
    connect_args={
        "keepalives": 1,           # TCP Keep-Alive有効化
        "keepalives_idle": 60,     # 60秒間通信なしでACKパケット送信開始
        "keepalives_interval": 10, # 応答なければ10秒ごとに再送
        "keepalives_count": 5,     # 5回失敗したら切断とみなす
        "connect_timeout": 10,     # 初期接続タイムアウト
    },
    
    echo=False               # SQL クエリログ（デバッグ時は True）
)

# Session factory for database connections
def get_session():
    with Session(engine) as session:
        yield session