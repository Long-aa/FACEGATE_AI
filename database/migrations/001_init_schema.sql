-- ============================================================
-- FaceGate AI — Database Schema (PostgreSQL)
-- Database Name: facegate_ai
-- Generated: 2026-09-16
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- 1. Roles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);

-- ------------------------------------------------------------
-- 2. Users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'STAFF',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    hashed_password VARCHAR(255),
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    card_number VARCHAR(100),
    avatar_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ------------------------------------------------------------
-- 3. User Roles (Association)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(36) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ------------------------------------------------------------
-- 4. Face Profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS face_profiles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    encoding DOUBLE PRECISION[],
    face_encoding_json JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    quality_score FLOAT,
    samples_count INTEGER NOT NULL DEFAULT 1,
    master_photo_url VARCHAR(500),
    registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    registered_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_face_profiles_employee_id ON face_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_face_profiles_status ON face_profiles(status);

-- ------------------------------------------------------------
-- 5. Doors
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doors (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    door_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    door_type VARCHAR(50) NOT NULL DEFAULT 'entrance',
    status VARCHAR(50) NOT NULL DEFAULT 'Online',
    lock_status VARCHAR(50) NOT NULL DEFAULT 'Locked',
    relay_pin INTEGER,
    controller_ip VARCHAR(100),
    mqtt_topic VARCHAR(255),
    unlock_duration INTEGER NOT NULL DEFAULT 5,
    last_activity TIMESTAMPTZ,
    last_user_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_doors_door_code ON doors(door_code);
CREATE INDEX IF NOT EXISTS idx_doors_name ON doors(name);

-- ------------------------------------------------------------
-- 6. Cameras
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cameras (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    camera_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    camera_type VARCHAR(50) NOT NULL DEFAULT 'entrance',
    status VARCHAR(50) NOT NULL DEFAULT 'Online',
    rtsp_url VARCHAR(500),
    ip_address VARCHAR(100),
    port INTEGER NOT NULL DEFAULT 554,
    fps INTEGER NOT NULL DEFAULT 30,
    latency INTEGER NOT NULL DEFAULT 15,
    resolution VARCHAR(50) NOT NULL DEFAULT '1920x1080',
    res_label VARCHAR(50) NOT NULL DEFAULT '1080p',
    door_id VARCHAR(36) REFERENCES doors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cameras_camera_code ON cameras(camera_code);
CREATE INDEX IF NOT EXISTS idx_cameras_door_id ON cameras(door_id);

-- ------------------------------------------------------------
-- 7. Access Rules
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_rules (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    door_id VARCHAR(36) NOT NULL REFERENCES doors(id) ON DELETE CASCADE,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(100),
    start_time VARCHAR(8) NOT NULL DEFAULT '00:00:00',
    end_time VARCHAR(8) NOT NULL DEFAULT '23:59:59',
    allowed_days JSONB NOT NULL DEFAULT '[1, 2, 3, 4, 5, 6, 7]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_access_rules_door_id ON access_rules(door_id);
CREATE INDEX IF NOT EXISTS idx_access_rules_user_id ON access_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_access_rules_dept ON access_rules(department);

-- ------------------------------------------------------------
-- 8. Access Logs
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS access_log_number_seq START 1000 INCREMENT 1;

CREATE TABLE IF NOT EXISTS access_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    log_number BIGINT DEFAULT nextval('access_log_number_seq'),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    employee_id VARCHAR(50),
    user_name VARCHAR(255),
    department VARCHAR(100),
    card_type VARCHAR(100),
    door_id VARCHAR(36) REFERENCES doors(id) ON DELETE SET NULL,
    door_name VARCHAR(255),
    camera_id VARCHAR(36) REFERENCES cameras(id) ON DELETE SET NULL,
    camera_name VARCHAR(255),
    result VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL DEFAULT 0.0,
    cosine_score FLOAT,
    face_distance FLOAT,
    liveness_passed BOOLEAN,
    liveness_score FLOAT,
    latency_ms INTEGER,
    ai_model VARCHAR(100) DEFAULT 'ArcFace r100 v1',
    live_photo_url TEXT,
    master_photo_url TEXT,
    is_unknown BOOLEAN NOT NULL DEFAULT FALSE,
    is_masked BOOLEAN NOT NULL DEFAULT FALSE,
    relay_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_access_logs_log_number ON access_logs(log_number);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_employee_id ON access_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_result ON access_logs(result);

-- ------------------------------------------------------------
-- 9. Alerts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    alert_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    camera_id VARCHAR(36) REFERENCES cameras(id) ON DELETE SET NULL,
    camera_name VARCHAR(255),
    door_id VARCHAR(36) REFERENCES doors(id) ON DELETE SET NULL,
    door_name VARCHAR(255),
    severity VARCHAR(50) NOT NULL DEFAULT 'WARNING',
    status VARCHAR(50) NOT NULL DEFAULT 'UNRESOLVED',
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    snapshot_url TEXT,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_alerts_alert_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);

-- ------------------------------------------------------------
-- 10. System Settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description VARCHAR(255),
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- ------------------------------------------------------------
-- 11. Notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ------------------------------------------------------------
-- 12. Audit Logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(36),
    user_name VARCHAR(255),
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
