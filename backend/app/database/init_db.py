"""
Database initialization script for FaceGate AI.
Creates all tables, constraints, and indexes.
"""
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_path = Path(__file__).resolve().parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from sqlalchemy import text
from app.database.session import Base, engine
import app.models  # Ensure all models are registered in Base.metadata


def init_db():
    print(f"Connecting to database: {engine.url.database} at {engine.url.host}:{engine.url.port}...")
    
    # Try creating uuid-ossp or pgcrypto if available
    with engine.begin() as conn:
        try:
            conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
            print("Extension 'uuid-ossp' is ready.")
        except Exception as e:
            print(f"Note: uuid-ossp extension check: {e}")
            
        try:
            conn.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto";'))
            print("Extension 'pgcrypto' is ready.")
        except Exception as e:
            print(f"Note: pgcrypto extension check: {e}")

    # Create all tables
    print("Creating all tables in database...")
    Base.metadata.create_all(bind=engine)
    print("All tables created successfully:")
    for table_name in Base.metadata.tables.keys():
        print(f"  - {table_name}")


if __name__ == "__main__":
    init_db()
