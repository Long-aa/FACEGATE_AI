-- ============================================================
-- FaceGate AI — Automated Database Bootstrap
-- Initializes pgvector, applies migrations 001-003, and seeds initial data.
-- ============================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Migrations
\i /docker-entrypoint-initdb.d/database/migrations/001_init_schema.sql
\i /docker-entrypoint-initdb.d/database/migrations/002_access_logs_matrix.sql
\i /docker-entrypoint-initdb.d/database/migrations/003_pgvector_upgrade.sql

-- 3. Base Seeds (Admin user, Default roles, Doors, Cameras)
\i /docker-entrypoint-initdb.d/database/seeds/001_initial_seeds.sql
