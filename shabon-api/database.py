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
    pool_size=10,            # Maximum number of connections to keep in the pool
    max_overflow=20,         # Maximum number of connections that can be created beyond pool_size
    pool_timeout=60,         # Timeout for getting a connection from the pool (seconds)
    pool_recycle=300,        # Recycle connections after 5 minutes to avoid stale connections
    pool_pre_ping=True,      # Test connections before using them
    echo=False               # Set to True for SQL query logging (debugging)
)

# Session factory for database connections
def get_session():
    with Session(engine) as session:
        yield session