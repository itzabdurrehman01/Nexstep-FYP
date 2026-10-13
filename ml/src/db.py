"""
ml/src/db.py
Real PostgreSQL Database Connection Manager using psycopg2.
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    """
    Establishes and returns a real PostgreSQL connection using environment variables.
    Fallback to local development database nexstep_db.
    """
    host = os.getenv("PG_HOST", "127.0.0.1")
    port = int(os.getenv("PG_PORT", "5432"))
    user = os.getenv("PG_USER", "postgres")
    password = os.getenv("PG_PASSWORD", "password")
    database = os.getenv("PG_DATABASE", "nexstep_db")

    conn = psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        cursor_factory=RealDictCursor,
    )
    return conn
