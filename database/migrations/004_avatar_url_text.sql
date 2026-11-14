-- ============================================================
-- Migration 004: Expand avatar_url and master_photo_url to TEXT
-- Allows storing high-resolution Base64 data URLs without StringDataRightTruncation
-- ============================================================

ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;
ALTER TABLE face_profiles ALTER COLUMN master_photo_url TYPE TEXT;

