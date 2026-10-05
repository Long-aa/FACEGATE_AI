-- ============================================================
-- FaceGate AI — Base Database Seeds (PostgreSQL)
-- File: database/seeds/001_initial_seeds.sql
-- ============================================================

-- 1. Roles
INSERT INTO roles (code, name, description, permissions)
VALUES
    ('ADMIN', 'Quản trị viên tối cao', 'Toàn quyền quản trị hệ thống FaceGate AI', '["*"]'::jsonb),
    ('OPERATOR', 'Vận hành hệ thống', 'Giám sát camera, điều khiển cửa và xử lý cảnh báo', '["users:read", "doors:control", "cameras:view", "alerts:manage", "access_logs:read"]'::jsonb),
    ('SECURITY', 'Nhân viên an ninh', 'Trực phòng bảo vệ, theo dõi nhật ký và sự cố ra vào', '["doors:view", "cameras:view", "alerts:read", "access_logs:read"]'::jsonb),
    ('STAFF', 'Nhân viên tiêu chuẩn', 'Nhân viên văn phòng đăng ký ra vào cửa', '["profile:read"]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 2. Master Admin User (Password: Admin@123)
INSERT INTO users (employee_id, full_name, email, phone, department, position, role, status, is_superuser, hashed_password)
VALUES
    ('EMP-0001', 'Admin Quản Trị', 'admin@facegate.ai', '0901234567', 'Ban Quản Trị Hệ Thống', 'Trưởng ban Công nghệ', 'ADMIN', 'ACTIVE', TRUE, '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW')
ON CONFLICT (employee_id) DO NOTHING;

-- Assign Admin Role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.employee_id = 'EMP-0001' AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- 3. Base Doors
INSERT INTO doors (door_code, name, location, door_type, status, lock_status, unlock_duration)
VALUES
    ('D-001', 'Cửa chính Lobby', 'Sảnh chính Tầng 1', 'entrance', 'Online', 'Locked', 10),
    ('D-002', 'Cửa ra chính', 'Sảnh chính Tầng 1', 'exit', 'Online', 'Locked', 10),
    ('D-003', 'Phòng Server B', 'Tầng hầm B1 - Khu IT', 'restricted', 'Online', 'Locked', 5),
    ('D-004', 'Sảnh phía Tây', 'Hành lang phía Tây', 'hallway', 'Online', 'Locked', 10),
    ('D-006', 'Phòng họp A', 'Tầng 2 - Khu văn phòng', 'internal', 'Online', 'Locked', 10),
    ('D-008', 'Cửa phân tầng TM', 'Tầng 3 - Thang máy', 'internal', 'Online', 'Locked', 10),
    ('D-010', 'Phòng Server Kỹ thuật', 'Tầng 4 - Trung tâm dữ liệu', 'restricted', 'Online', 'Locked', 5),
    ('D-012', 'Cửa kho Thiết bị R&D', 'Tầng 5 - Phòng Lab R&D', 'restricted', 'Online', 'Locked', 5),
    ('D-013', 'Phòng Giám đốc', 'Tầng 6 - Ban Giám đốc', 'restricted', 'Online', 'Locked', 5)
ON CONFLICT (door_code) DO NOTHING;

-- 4. Base Cameras
INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-01', 'Cửa chính Lobby', 'Sảnh chính Tầng 1', 'entrance', 'Online', 'rtsp://edge.facegate.internal:8554/cam01', id FROM doors WHERE door_code = 'D-001'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-02', 'Cửa ra chính', 'Sảnh chính Tầng 1', 'exit', 'Online', 'rtsp://edge.facegate.internal:8554/cam02', id FROM doors WHERE door_code = 'D-002'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-03', 'Phòng Server B', 'Tầng hầm B1 - Khu IT', 'restricted', 'Online', 'rtsp://edge.facegate.internal:8554/cam03', id FROM doors WHERE door_code = 'D-003'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-04', 'Sảnh phía Tây', 'Hành lang phía Tây', 'hallway', 'Online', 'rtsp://edge.facegate.internal:8554/cam04', id FROM doors WHERE door_code = 'D-004'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-05', 'Phòng Server Kỹ thuật', 'Tầng 4 - Trung tâm dữ liệu', 'restricted', 'Online', 'rtsp://edge.facegate.internal:8554/cam05', id FROM doors WHERE door_code = 'D-010'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-06', 'Phòng họp A', 'Tầng 2 - Khu văn phòng', 'internal', 'Online', 'rtsp://edge.facegate.internal:8554/cam06', id FROM doors WHERE door_code = 'D-006'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-07', 'Cửa kho Thiết bị R&D', 'Tầng 5 - Phòng Lab R&D', 'restricted', 'Online', 'rtsp://edge.facegate.internal:8554/cam07', id FROM doors WHERE door_code = 'D-012'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-08', 'Cửa phân tầng TM', 'Tầng 3 - Thang máy', 'internal', 'Online', 'rtsp://edge.facegate.internal:8554/cam08', id FROM doors WHERE door_code = 'D-008'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-09', 'Phòng Giám đốc', 'Tầng 6 - Ban Giám đốc', 'restricted', 'Online', 'rtsp://edge.facegate.internal:8554/cam09', id FROM doors WHERE door_code = 'D-013'
ON CONFLICT (camera_code) DO NOTHING;

-- 5. System Settings
INSERT INTO system_settings (key, value, description, category)
VALUES
    ('recognition_threshold', '{"value": 0.60, "min": 0.40, "max": 0.99, "step": 0.01}'::jsonb, 'Ngưỡng tin cậy nhận diện khuôn mặt', 'recognition'),
    ('liveness_detection', '{"enabled": true, "threshold": 0.60}'::jsonb, 'Chống giả mạo ảnh/video 2D Liveness Detection', 'security'),
    ('anti_spoofing_threshold', '{"value": 0.60}'::jsonb, 'Ngưỡng phát hiện giả mạo Anti-Spoofing', 'security'),
    ('door_unlock_duration', '{"seconds": 10}'::jsonb, 'Thời gian mở khóa relay khi nhận diện thành công (giây)', 'device'),
    ('auto_lock_delay', '{"seconds": 10}'::jsonb, 'Độ trễ tự động khóa lại sau khi cửa mở', 'device'),
    ('multi_face_mode', '{"mode": "reject_multi"}'::jsonb, 'Chế độ xử lý nhiều khuôn mặt trong 1 khung hình', 'recognition'),
    ('alert_unknown_faces', '{"enabled": true, "interval_sec": 5}'::jsonb, 'Phát cảnh báo khi phát hiện người lạ', 'notification')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;
