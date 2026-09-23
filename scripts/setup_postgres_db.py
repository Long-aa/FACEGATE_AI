"""
Script to create the facegate_ai database in PostgreSQL on port 8000 if not exists.
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def setup_db():
    conn = psycopg2.connect(
        host="localhost",
        port=8000,
        user="postgres",
        password="Longdz19082005@",
        dbname="postgres",
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    cur.execute("SELECT 1 FROM pg_database WHERE datname = 'facegate_ai'")
    if not cur.fetchone():
        cur.execute("CREATE DATABASE facegate_ai ENCODING 'UTF8'")
        print("Database 'facegate_ai' created successfully.")
    else:
        print("Database 'facegate_ai' already exists.")
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    setup_db()
