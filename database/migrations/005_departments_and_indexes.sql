-- ============================================================
-- Migration 005: Departments synchronization, Soft-Delete & Composite Indexes
-- ============================================================

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    manager_name VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(50),
    location VARCHAR(100),
    access_level VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
    allowed_doors JSONB NOT NULL DEFAULT '[]'::jsonb,
    color VARCHAR(30) NOT NULL DEFAULT '#00D4AA',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);

-- 2. Soft-delete columns for core entities
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE doors ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);
CREATE INDEX IF NOT EXISTS idx_doors_is_deleted ON doors(is_deleted);
CREATE INDEX IF NOT EXISTS idx_cameras_is_deleted ON cameras(is_deleted);

-- 3. Composite Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_access_logs_ts_res ON access_logs(timestamp DESC, result);
CREATE INDEX IF NOT EXISTS idx_access_logs_emp_ts ON access_logs(employee_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_door_ts ON access_logs(door_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_rules_door_active ON access_rules(door_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
