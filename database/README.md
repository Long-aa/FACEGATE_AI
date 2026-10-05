# FaceGate AI — Database System

Thư mục quản lý toàn bộ cấu trúc dữ liệu, lược đồ CSDL PostgreSQL, tệp migration, dữ liệu mẫu (seeds) và các kịch bản kiểm thử độc lập cho hệ thống FaceGate AI.

---

## 📁 Cấu trúc Thư mục `database/`

```text
database/
├── schema.sql                           # Lược đồ CSDL tổng thể (Master PostgreSQL DDL)
├── test_access_logs_matrix.py           # Bộ kiểm thử độc lập 20 Unit Test Cases (Camera & Status Filter)
├── README.md                            # Hướng dẫn quản trị & vận hành CSDL
│
├── migrations/                          # Các bản cập nhật cấu trúc bảng (DDL Migrations)
│   ├── 001_init_schema.sql              # Khởi tạo 12 bảng thực thể cốt lõi, index & sequences
│   └── 002_access_logs_matrix.sql       # Đồng bộ dữ liệu kiểm thử Access Logs
│
├── seeds/                               # Dữ liệu khởi tạo & Dữ liệu mẫu (Data Seeds)
│   ├── 001_initial_seeds.sql            # Vai trò (Roles), Admin mặc định, Thiết bị, Cài đặt
│   ├── 002_access_logs_matrix.sql       # 15 bản ghi Access Logs chuẩn ngày 24/10 & 23/10/2023
│   └── seed_runner.py                   # Script Python nạp & đồng bộ CSDL tự động
│
├── functions/                           # Stored procedures & triggers (nếu có)
└── views/                               # Database Views thống kê báo cáo (nếu có)
```

---

## 📋 Danh sách 12 Bảng Thực thể

1. **`roles`**: Phân quyền hệ thống (`ADMIN`, `OPERATOR`, `SECURITY`, `STAFF`).
2. **`users`**: Danh mục tài khoản nhân sự và thông tin nhận diện.
3. **`user_roles`**: Bảng liên kết quan hệ N-N giữa người dùng và vai trò.
4. **`face_profiles`**: Dữ liệu sinh trắc học khuôn mặt (vector đặc trưng 128-D / 512-D).
5. **`doors`**: Danh mục thiết bị cửa kiểm soát truy cập và rơ-le khóa.
6. **`cameras`**: Danh mục camera giám sát AI và luồng RTSP.
7. **`access_rules`**: Luật phân quyền ra vào theo khu vực, thời gian và ngày trong tuần.
8. **`access_logs`**: Nhật ký lịch sử quẹt thẻ và nhận diện khuôn mặt ra vào cửa.
9. **`alerts`**: Danh sách cảnh báo an ninh thời gian thực (người lạ, sai ngưỡng, giả mạo).
10. **`system_settings`**: Cấu hình tham số hệ thống (ngưỡng nhận diện, anti-spoofing).
11. **`notifications`**: Thông báo sự kiện tới người dùng.
12. **`audit_logs`**: Nhật ký kiểm toán thao tác quản trị viên.

---

## 🚀 Hướng dẫn Vận hành & Kiểm thử

### 1. Đồng bộ dữ liệu CSDL tự động qua Python
```bash
# Từ thư mục gốc dự án:
backend\.venv\Scripts\python.exe database/seeds/seed_runner.py
```

### 2. Chạy bộ Unit Test Case ma trận độc lập (20 Cases)
```bash
# Kiểm thử độc lập 2 bảng ma trận (Camera Filter & Status Filter):
backend\.venv\Scripts\python.exe database/test_access_logs_matrix.py
```

### 3. Nạp SQL trực tiếp bằng psql (Docker hoặc Native)
```bash
# Nạp lược đồ
psql -U postgres -d facegate_ai -f database/schema.sql

# Nạp dữ liệu mẫu
psql -U postgres -d facegate_ai -f database/seeds/001_initial_seeds.sql
psql -U postgres -d facegate_ai -f database/seeds/002_access_logs_matrix.sql
```
