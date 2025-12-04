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
# pool_recycle=300 prevents connection timeout on Render
engine = create_engine(
    DATABASE_URL,
    pool_recycle=300,        # avoid stale connections
    pool_pre_ping=True       # auto test & reconnect dropped connections
)

# Session factory for database connections
def get_session():
    with Session(engine) as session:
        yield session