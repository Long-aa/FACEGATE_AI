-- ============================================================
-- FaceGate AI — Access Logs Matrix Seed (24/10/2023 & 23/10/2023)
-- File: database/seeds/002_access_logs_matrix.sql
-- ============================================================

-- 1. Ensure required doors exist
INSERT INTO doors (door_code, name, door_type, location, status, lock_status, unlock_duration)
VALUES
    ('D-001', 'Cửa chính Lobby', 'entrance', 'Trụ sở chính', 'Online', 'Locked', 10),
    ('D-002', 'Cửa ra chính', 'exit', 'Trụ sở chính', 'Online', 'Locked', 10),
    ('D-003', 'Phòng Server B', 'restricted', 'Trụ sở chính', 'Online', 'Locked', 10),
    ('D-004', 'Sảnh phía Tây', 'hallway', 'Trụ sở chính', 'Online', 'Locked', 10),
    ('D-006', 'Phòng họp A', 'internal', 'Trụ sở chính', 'Online', 'Locked', 10),
    ('D-008', 'Cửa phân tầng TM', 'internal', 'Trụ sở chính', 'Online', 'Locked', 10),
    ('D-010', 'Phòng Server Kỹ thuật', 'restricted', 'Trụ sở chính', 'Online', 'Locked', 10),
    ('D-012', 'Cửa kho Thiết bị R&D', 'restricted', 'Trụ sở chính', 'Online', 'Locked', 10),
    ('D-013', 'Phòng Giám đốc', 'restricted', 'Trụ sở chính', 'Online', 'Locked', 10)
ON CONFLICT (door_code) DO NOTHING;

-- 2. Ensure required cameras exist
INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-01', 'Cửa chính Lobby', 'Trụ sở chính', 'entrance', 'Online', 'rtsp://edge.facegate.internal:8554/cam01', id FROM doors WHERE door_code = 'D-001'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-02', 'Cửa ra chính', 'Trụ sở chính', 'exit', 'Online', 'rtsp://edge.facegate.internal:8554/cam02', id FROM doors WHERE door_code = 'D-002'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-03', 'Phòng Server B', 'Trụ sở chính', 'restricted', 'Online', 'rtsp://edge.facegate.internal:8554/cam03', id FROM doors WHERE door_code = 'D-003'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-04', 'Sảnh phía Tây', 'Trụ sở chính', 'hallway', 'Online', 'rtsp://edge.facegate.internal:8554/cam04', id FROM doors WHERE door_code = 'D-004'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-05', 'Phòng Server Kỹ thuật', 'Trụ sở chính', 'restricted', 'rtsp://edge.facegate.internal:8554/cam05', id FROM doors WHERE door_code = 'D-010'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-06', 'Phòng họp A', 'Trụ sở chính', 'internal', 'rtsp://edge.facegate.internal:8554/cam06', id FROM doors WHERE door_code = 'D-006'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-07', 'Cửa kho Thiết bị R&D', 'Trụ sở chính', 'restricted', 'rtsp://edge.facegate.internal:8554/cam07', id FROM doors WHERE door_code = 'D-012'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-08', 'Cửa phân tầng TM', 'Trụ sở chính', 'internal', 'rtsp://edge.facegate.internal:8554/cam08', id FROM doors WHERE door_code = 'D-008'
ON CONFLICT (camera_code) DO NOTHING;

INSERT INTO cameras (camera_code, name, location, camera_type, status, rtsp_url, door_id)
SELECT 'CAM-09', 'Phòng Giám đốc', 'Trụ sở chính', 'restricted', 'rtsp://edge.facegate.internal:8554/cam09', id FROM doors WHERE door_code = 'D-013'
ON CONFLICT (camera_code) DO NOTHING;

-- 3. Ensure required users exist
INSERT INTO users (employee_id, full_name, email, department, position, role, status)
VALUES
    ('EMP-2045', 'Nguyễn Văn An', 'an.nguyen@facegate.ai', 'Khối KT & R&D', 'Kỹ sư AI cao cấp', 'STAFF', 'ACTIVE'),
    ('EMP-2042', 'Trần Minh Đức', 'duc.tran@facegate.ai', 'Kế toán', 'Chuyên viên Kế toán', 'STAFF', 'ACTIVE'),
    ('EMP-2105', 'Lê Hoàng Nam', 'nam.le@facegate.ai', 'Kinh doanh', 'Chuyên viên Kinh doanh', 'STAFF', 'ACTIVE'),
    ('EMP-1988', 'Phạm Quang Huy', 'huy.pham@facegate.ai', 'Khối Vận hành', 'Trưởng ca Vận hành', 'STAFF', 'ACTIVE'),
    ('EMP-2197', 'Võ Quốc Bảo', 'bao.vo@facegate.ai', 'IT', 'Chuyên viên Quản trị Mạng', 'STAFF', 'ACTIVE'),
    ('EMP-2210', 'Nguyễn Thu Hà', 'ha.nguyen@facegate.ai', 'Nhân sự', 'Chuyên viên Nhân sự', 'STAFF', 'ACTIVE')
ON CONFLICT (employee_id) DO UPDATE
SET full_name = EXCLUDED.full_name, department = EXCLUDED.department, status = 'ACTIVE';

-- 4. Insert 15 Access Log Records (Ngày 24/10/2023 & 23/10/2023)
-- Xóa các bản ghi cũ của 2 ngày này để đảm bảo dữ liệu chuẩn 100%
DELETE FROM access_logs 
WHERE timestamp >= '2023-10-23 00:00:00+07' AND timestamp <= '2023-10-24 23:59:59+07';

-- Ngày 24/10/2023 (10 bản ghi)
INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-24 10:42:15+07', u.id, 'EMP-2045', 'Nguyễn Văn An', 'Khối KT & R&D', d.id, d.name, c.id, c.name, 'Granted', 98.5, 0.985, 0.015, TRUE, 0.98, 32, 'Dlib ResNet-34 (512D)', FALSE, 'SUCCESS', 'Action: Entry'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-2045' AND c.name = 'Cửa chính Lobby' AND d.name = 'Cửa chính Lobby';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-24 10:38:02+07', u.id, 'EMP-2042', 'Trần Minh Đức', 'Kế toán', d.id, d.name, c.id, c.name, 'Manual Verify', 72.1, 0.721, 0.279, TRUE, 0.98, 35, 'Dlib ResNet-34 (512D)', FALSE, 'BLOCKED', 'Action: Entry'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-2042' AND c.name = 'Phòng Server B' AND d.name = 'Phòng Server B';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-24 10:15:45+07', NULL, NULL, 'Người lạ', '—', d.id, d.name, c.id, c.name, 'Denied', 15.0, 0.150, 0.850, FALSE, 0.45, 28, 'Dlib ResNet-34 (512D)', TRUE, 'BLOCKED', 'Action: Entry'
FROM cameras c, doors d WHERE c.name = 'Sảnh phía Tây' AND d.name = 'Sảnh phía Tây';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-24 09:55:10+07', u.id, 'EMP-2105', 'Lê Hoàng Nam', 'Kinh doanh', d.id, d.name, c.id, c.name, 'Granted', 99.2, 0.992, 0.008, TRUE, 0.98, 30, 'Dlib ResNet-34 (512D)', FALSE, 'SUCCESS', 'Action: Exit'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-2105' AND c.name = 'Cửa ra chính' AND d.name = 'Cửa ra chính';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-24 09:30:44+07', u.id, 'EMP-1988', 'Phạm Quang Huy', 'Khối Vận hành', d.id, d.name, c.id, c.name, 'Granted', 97.8, 0.978, 0.022, TRUE, 0.98, 33, 'Dlib ResNet-34 (512D)', FALSE, 'SUCCESS', 'Action: Entry'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-1988' AND c.name = 'Cửa chính Lobby' AND d.name = 'Cửa chính Lobby';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-24 09:15:22+07', u.id, 'EMP-2197', 'Võ Quốc Bảo', 'IT', d.id, d.name, c.id, c.name, 'Granted', 88.3, 0.883, 0.117, TRUE, 0.98, 31, 'Dlib ResNet-34 (512D)', FALSE, 'SUCCESS', 'Action: Entry'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-2197' AND c.name = 'Phòng họp A' AND d.name = 'Phòng họp A';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-24 08:54:03+07', u.id, 'EMP-2210', 'Nguyễn Thu Hà', 'Nhân sự', d.id, d.name, c.id, c.name, 'Granted', 95.1, 0.951, 0.049, TRUE, 0.98, 29, 'Dlib ResNet-34 (512D)', FALSE, 'SUCCESS', 'Action: Entry'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-2210' AND c.name = 'Cửa chính Lobby' AND d.name = 'Cửa chính Lobby';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-24 08:33:18+07', NULL, NULL, 'Người lạ', '—', d.id, d.name, c.id, c.name, 'Denied', 8.2, 0.082, 0.918, FALSE, 0.40, 27, 'Dlib ResNet-34 (512D)', TRUE, 'BLOCKED', 'Action: Entry'
FROM cameras c, doors d WHERE c.name = 'Cửa kho Thiết bị R&D' AND d.name = 'Cửa kho Thiết bị R&D';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-24 08:11:55+07', u.id, 'EMP-2042', 'Trần Minh Đức', 'Kế toán', d.id, d.name, c.id, c.name, 'Granted', 93.6, 0.936, 0.064, TRUE, 0.98, 34, 'Dlib ResNet-34 (512D)', FALSE, 'SUCCESS', 'Action: Entry'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-2042' AND c.name = 'Cửa chính Lobby' AND d.name = 'Cửa chính Lobby';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-24 07:58:40+07', u.id, 'EMP-2045', 'Nguyễn Văn An', 'Khối KT & R&D', d.id, d.name, c.id, c.name, 'Granted', 99.7, 0.997, 0.003, TRUE, 0.98, 28, 'Dlib ResNet-34 (512D)', FALSE, 'SUCCESS', 'Action: Entry'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-2045' AND c.name = 'Phòng Server Kỹ thuật' AND d.name = 'Phòng Server Kỹ thuật';

-- Ngày 23/10/2023 (5 bản ghi)
INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-23 17:45:12+07', u.id, 'EMP-2105', 'Lê Hoàng Nam', 'Kinh doanh', d.id, d.name, c.id, c.name, 'Granted', 98.4, 0.984, 0.016, TRUE, 0.98, 31, 'Dlib ResNet-34 (512D)', FALSE, 'SUCCESS', 'Action: Exit'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-2105' AND c.name = 'Cửa chính Lobby' AND d.name = 'Cửa chính Lobby';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-23 17:30:05+07', u.id, 'EMP-1988', 'Phạm Quang Huy', 'Khối Vận hành', d.id, d.name, c.id, c.name, 'Granted', 91.2, 0.912, 0.088, TRUE, 0.98, 33, 'Dlib ResNet-34 (512D)', FALSE, 'SUCCESS', 'Action: Exit'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-1988' AND c.name = 'Cửa phân tầng TM' AND d.name = 'Cửa phân tầng TM';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-23 14:22:16+07', u.id, 'EMP-2210', 'Nguyễn Thu Hà', 'Nhân sự', d.id, d.name, c.id, c.name, 'Denied', 0.0, 0.0, 1.0, TRUE, 0.98, 29, 'Dlib ResNet-34 (512D)', FALSE, 'BLOCKED', 'Action: Entry'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-2210' AND c.name = 'Phòng Giám đốc' AND d.name = 'Phòng Giám đốc';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-23 13:10:44+07', u.id, 'EMP-2045', 'Nguyễn Văn An', 'Khối KT & R&D', d.id, d.name, c.id, c.name, 'Granted', 99.1, 0.991, 0.009, TRUE, 0.98, 30, 'Dlib ResNet-34 (512D)', FALSE, 'SUCCESS', 'Action: Exit'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-2045' AND c.name = 'Cửa chính Lobby' AND d.name = 'Cửa chính Lobby';

INSERT INTO access_logs (timestamp, user_id, employee_id, user_name, department, door_id, door_name, camera_id, camera_name, result, confidence, cosine_score, face_distance, liveness_passed, liveness_score, latency_ms, ai_model, is_unknown, relay_status, notes)
SELECT '2023-10-23 11:05:30+07', u.id, 'EMP-2197', 'Võ Quốc Bảo', 'IT', d.id, d.name, c.id, c.name, 'Manual Verify', 67.4, 0.674, 0.326, TRUE, 0.98, 34, 'Dlib ResNet-34 (512D)', FALSE, 'BLOCKED', 'Action: Entry'
FROM users u, cameras c, doors d WHERE u.employee_id = 'EMP-2197' AND c.name = 'Phòng Server B' AND d.name = 'Phòng Server B';
