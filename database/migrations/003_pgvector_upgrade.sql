-- ============================================================
-- FaceGate AI — Database Migration 003: pgvector Upgrade
-- Enables pgvector extension, adds 512-D ArcFace embedding column,
-- and builds HNSW index for sub-10ms biometric search at scale.
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add 512-dimensional vector column to face_profiles
ALTER TABLE face_profiles 
ADD COLUMN IF NOT EXISTS embedding vector(512);

-- 3. Create HNSW index for fast Cosine Distance search (vector_cosine_ops)
-- m = 16: bi-directional links per node
-- ef_construction = 64: size of dynamic candidate list during construction
CREATE INDEX IF NOT EXISTS idx_face_embedding_hnsw 
ON face_profiles 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Comment metadata
COMMENT ON COLUMN face_profiles.embedding IS '512-dimensional ArcFace L2-normalized embedding vector for fast pgvector similarity queries';

