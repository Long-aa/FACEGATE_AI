<div align="center">

# 🔐 FaceGate AI

### Hệ Thống Kiểm Soát Ra Vào Thông Minh Bằng AI

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=flat-square&logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

> Hệ thống nhận diện khuôn mặt thời gian thực để kiểm soát ra vào cửa, tích hợp AI, camera RTSP và điều khiển thiết bị phần cứng.

</div>

---

## 📋 Mục Lục

- [Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống)
- [Yêu Cầu Hệ Thống](#-yêu-cầu-hệ-thống)
- [Cài Đặt & Chạy Dự Án](#-cài-đặt--chạy-dự-án)
  - [Chạy Local (Development)](#1-chạy-local-development)
  - [Chạy bằng Docker Compose](#2-chạy-bằng-docker-compose)
- [Biến Môi Trường](#-biến-môi-trường)
- [Quy Cách Commit](#-quy-cách-commit)
- [Quy Cách Trình Bày Code](#-quy-cách-trình-bày-code)
- [Branching Strategy](#-branching-strategy)
- [Những Điều Cần Lưu Ý](#-những-điều-cần-lưu-ý)
- [Các Lệnh Thường Dùng](#-các-lệnh-thường-dùng)

---

## 🏗 Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────┐
│                        Nginx Proxy                       │
└──────┬────────────────────┬───────────────────┬─────────┘
       │                    │                   │
  ┌────▼────┐         ┌─────▼──────┐     ┌─────▼──────┐
  │Frontend │         │  Backend   │     │ AI Service │
  │Next.js  │◄───────►│  FastAPI   │◄───►│ InsightFace│
  │:3000    │         │  :8000     │     │  :8001     │
  └─────────┘         └─────┬──────┘     └────────────┘
                             │
              ┌──────────────┼──────────────┐
         ┌────▼────┐    ┌────▼────┐   ┌────▼────────┐
         │Postgres │    │  Redis  │   │Device Svc   │
         │+pgvector│    │  :6379  │   │  :8002      │
         │  :5432  │    └─────────┘   └─────────────┘
         └─────────┘
```

| Service | Công Nghệ | Cổng | Vai Trò |
|---------|-----------|------|---------|
| **frontend** | Next.js 16 + Tailwind | 3000 | Giao diện quản trị |
| **backend** | FastAPI + SQLAlchemy | 8000 | REST API + WebSocket |
| **ai-service** | InsightFace + FAISS | 8001 | Nhận diện khuôn mặt |
| **device-service** | FastAPI + MQTT | 8002 | Điều khiển camera/cửa |
| **postgres** | PostgreSQL 16 + pgvector | 5432 | Database chính |
| **redis** | Redis 7 | 6379 | Cache + Session + Queue |

---

## 💻 Yêu Cầu Hệ Thống

### Phát Triển (Development)

| Công Cụ | Phiên Bản | Ghi Chú |
|---------|-----------|---------|
| **Node.js** | ≥ 20.x | Cho frontend |
| **Python** | ≥ 3.11 | Cho backend & AI |
| **Docker Desktop** | ≥ 4.x | Cho database/redis |
| **Git** | ≥ 2.40 | Version control |
| **npm** | ≥ 10.x | Package manager |

### Production (Server)

- CPU: ≥ 8 cores
- RAM: ≥ 16 GB
- GPU: NVIDIA ≥ 6 GB VRAM *(khuyến nghị cho AI service)*
- Storage: ≥ 100 GB SSD
- OS: Ubuntu 22.04 LTS / Debian 12

---

## 🚀 Cài Đặt & Chạy Dự Án

### 1. Chạy Local (Development)

#### Bước 1 — Clone & chuẩn bị môi trường

```bash
git clone https://github.com/<org>/FACEGATE_AI.git
cd FACEGATE_AI

# Sao chép file biến môi trường
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
```

#### Bước 2 — Khởi động Database & Redis (Docker)

```bash
# Chỉ chạy postgres + redis
docker compose -f docker-compose.dev.yml up postgres redis -d

# Kiểm tra trạng thái
docker compose -f docker-compose.dev.yml ps
```

#### Bước 3 — Backend (FastAPI)

```bash
cd backend

# Tạo virtual environment
py -m venv .venv          # Windows
# python3 -m venv .venv   # Linux/macOS

# Kích hoạt venv
.\.venv\Scripts\Activate.ps1    # Windows PowerShell
# source .venv/bin/activate      # Linux/macOS

# Cài dependencies
pip install -r requirements.txt

# Chạy migrations
alembic upgrade head

# Seed dữ liệu mẫu (lần đầu)
python -m app.database.seed

# Khởi chạy server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> API Docs: http://localhost:8000/docs

#### Bước 4 — AI Service

```bash
cd ai-service

py -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

# Download model weights (lần đầu)
python scripts/download_models.py

uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

#### Bước 5 — Frontend (Next.js)

```bash
cd frontend

npm install

npm run dev
# → http://localhost:3000
```

#### Bước 6 — Device Service (tuỳ chọn)

```bash
cd device-service

py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

---

### 2. Chạy bằng Docker Compose

#### Development

```bash
# Build & chạy tất cả services
docker compose -f docker-compose.dev.yml up --build

# Chạy ngầm (background)
docker compose -f docker-compose.dev.yml up --build -d

# Xem logs
docker compose -f docker-compose.dev.yml logs -f backend

# Dừng tất cả
docker compose -f docker-compose.dev.yml down
```

#### Production

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Chạy production stack
docker compose -f docker-compose.prod.yml up -d

# Scale AI service (nếu có nhiều GPU)
docker compose -f docker-compose.prod.yml up -d --scale ai-service=2
```

---

## 🔐 Biến Môi Trường

### Root `.env`

```env
# Postgres
POSTGRES_USER=facegate
POSTGRES_PASSWORD=your_strong_password_here
POSTGRES_DB=facegate

# Redis
REDIS_PASSWORD=your_redis_password_here

# Services
BACKEND_SECRET_KEY=change-this-to-a-random-64-char-string
```

### `backend/.env`

```env
DATABASE_URL=postgresql://facegate:password@localhost:5432/facegate
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8001
DEVICE_SERVICE_URL=http://localhost:8002
SECRET_KEY=your-64-char-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FACE_RECOGNITION_THRESHOLD=0.6
DEBUG=true
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_AI_URL=http://localhost:8001
```

> ⚠️ **KHÔNG BAO GIỜ** commit file `.env` thực lên Git. Chỉ commit `.env.example`.

---

## 📝 Quy Cách Commit

Dự án tuân theo **[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)**.

### Cấu Trúc

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Các `type` hợp lệ

| Type | Ý Nghĩa | Ví Dụ |
|------|---------|-------|
| `feat` | Tính năng mới | `feat(auth): thêm đăng nhập 2FA` |
| `fix` | Sửa lỗi | `fix(camera): xử lý lỗi RTSP timeout` |
| `docs` | Cập nhật tài liệu | `docs(readme): thêm hướng dẫn deploy` |
| `style` | Format, không đổi logic | `style(dashboard): căn chỉnh layout card` |
| `refactor` | Tái cấu trúc code | `refactor(recognition): tách pipeline service` |
| `test` | Thêm/sửa test | `test(auth): thêm unit test JWT` |
| `chore` | Cập nhật deps, config | `chore(deps): nâng cấp fastapi 0.141` |
| `perf` | Cải thiện hiệu năng | `perf(ai): cache embedding vector` |
| `ci` | CI/CD pipeline | `ci: thêm GitHub Actions build step` |
| `build` | Thay đổi build system | `build(docker): tối ưu image size` |
| `revert` | Hoàn tác commit | `revert: feat(auth): thêm đăng nhập 2FA` |

### Các `scope` gợi ý

`auth` · `dashboard` · `recognition` · `camera` · `door` · `users` · `access` · `alerts` · `reports` · `settings` · `ai` · `backend` · `frontend` · `db` · `ci` · `docker`

### Quy Tắc Viết Commit

```bash
# ✅ Đúng
git commit -m "feat(recognition): thêm xử lý multi-face detection"
git commit -m "fix(door): sửa lỗi relay không phản hồi sau 30s timeout"
git commit -m "docs(api): cập nhật schema endpoint /recognition/identify"

# ❌ Sai
git commit -m "update code"
git commit -m "fix bug"
git commit -m "WIP"
git commit -m "asdfgh"
```

### Commit Có Breaking Change

```bash
git commit -m "feat(api)!: đổi response format của /auth/login

BREAKING CHANGE: trường 'token' đổi thành 'access_token'
Cần cập nhật frontend AuthService"
```

---

## 🎨 Quy Cách Trình Bày Code

### TypeScript / React (Frontend)

```typescript
// ✅ Component: PascalCase, có export default
export default function DashboardPage() { ... }
export function StatCard({ title, value }: StatCardProps) { ... }

// ✅ Hook: tiền tố use-
export function useWebSocket(url: string) { ... }

// ✅ Type/Interface: PascalCase, mô tả rõ ràng
interface AccessLogEntry {
  id: string;
  userId: string;
  result: "GRANTED" | "DENIED";
  timestamp: Date;
}

// ✅ Hằng số: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_RECOGNITION_THRESHOLD = 0.6;

// ✅ Biến/hàm: camelCase
const [isLoading, setIsLoading] = useState(false);
async function fetchAccessLogs(page: number) { ... }
```

**Nguyên tắc Frontend:**

- Mỗi component trong một file riêng, đặt đúng thư mục trong `components/`
- Không dùng `any` — luôn khai báo type rõ ràng
- Props interface khai báo ngay trên component
- Tách logic phức tạp vào custom hook (`hooks/`)
- Server Component mặc định, chỉ thêm `"use client"` khi cần thiết
- Import thứ tự: React → Next.js → thư viện ngoài → nội bộ

### Python (Backend / AI Service)

```python
# ✅ File: snake_case.py
# ✅ Class: PascalCase
class FaceRecognitionService:
    """Service xử lý nhận diện khuôn mặt."""

    def __init__(self, threshold: float = 0.6) -> None:
        self.threshold = threshold

    # ✅ Method public: snake_case
    async def identify_face(self, image_data: bytes) -> RecognitionResult:
        """
        Nhận diện khuôn mặt từ ảnh.

        Args:
            image_data: Dữ liệu ảnh dạng bytes (JPEG/PNG).

        Returns:
            RecognitionResult chứa user_id và confidence score.

        Raises:
            FaceNotDetectedError: Khi không phát hiện khuôn mặt.
        """
        ...

    # ✅ Method private: tiền tố _
    def _preprocess_image(self, data: bytes) -> np.ndarray:
        ...

# ✅ Hằng số module-level: SCREAMING_SNAKE_CASE
DEFAULT_EMBEDDING_DIM = 512
SUPPORTED_FORMATS = frozenset({"jpg", "jpeg", "png", "webp"})

# ✅ Type hints đầy đủ
def get_user_by_id(db: Session, user_id: UUID) -> User | None:
    ...
```

**Nguyên tắc Backend:**

- Mỗi router endpoint có docstring mô tả chức năng
- Không để logic nghiệp vụ trong router — đẩy xuống `service`
- Repository chỉ xử lý database query, không chứa business logic
- Luôn dùng dependency injection của FastAPI (`Depends`)
- Raise `HTTPException` với status code và message rõ ràng

### SQL / Migration

```sql
-- Tên bảng: snake_case, số nhiều
-- Tên cột: snake_case
-- Tên constraint: <type>_<table>_<column>

CREATE TABLE access_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    door_id     UUID NOT NULL REFERENCES doors(id),
    result      VARCHAR(10) NOT NULL CHECK (result IN ('GRANTED', 'DENIED')),
    confidence  FLOAT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at DESC);
```

---

## 🌿 Branching Strategy

Dự án dùng **GitHub Flow** đơn giản hoá:

```
main
 └── develop
      ├── feature/recognition-pipeline
      ├── feature/door-control-ui
      ├── fix/camera-rtsp-timeout
      └── release/v1.2.0
```

| Branch | Mục Đích | Deploy |
|--------|----------|--------|
| `main` | Code production ổn định | Production |
| `develop` | Tích hợp các feature | Staging |
| `feature/<name>` | Phát triển tính năng mới | — |
| `fix/<name>` | Sửa lỗi | — |
| `hotfix/<name>` | Fix khẩn cấp trên production | Production |
| `release/<version>` | Chuẩn bị release | Staging |

### Quy Trình Làm Việc

```bash
# 1. Tạo branch mới từ develop
git checkout develop
git pull origin develop
git checkout -b feature/face-liveness-detection

# 2. Làm việc, commit thường xuyên
git add .
git commit -m "feat(ai): thêm liveness detection chống ảnh tĩnh"

# 3. Push và tạo Pull Request
git push origin feature/face-liveness-detection
# → Tạo PR trên GitHub: feature/... → develop

# 4. Code review → Merge → Xoá branch
```

### Quy Tắc Branch Name

```
feature/<mô-tả-ngắn-gọn>   # Tính năng mới
fix/<mô-tả-lỗi>            # Sửa lỗi thông thường
hotfix/<mô-tả>             # Fix khẩn cấp production
release/<x.y.z>            # Chuẩn bị release
chore/<mô-tả>              # Maintenance task
```

---

## ⚠️ Những Điều Cần Lưu Ý

### 🔐 Bảo Mật

- **KHÔNG** commit `.env`, private key, password vào Git
- **KHÔNG** để `DEBUG=True` trên production
- **KHÔNG** expose database port ra ngoài internet
- Đổi `SECRET_KEY` mặc định trước khi deploy
- Dùng HTTPS/WSS trên production (cấu hình trong Nginx)
- Face embedding vectors được lưu dưới dạng mã hoá trong database

### 🖼️ Xử Lý Ảnh & AI

- Ảnh khuôn mặt tối thiểu **80×80 px**, khuyến nghị **≥ 160×160 px**
- Góc mặt tối đa: **±45°** ngang, **±30°** đứng
- Ngưỡng nhận diện mặc định `0.6` — điều chỉnh qua biến môi trường `FACE_RECOGNITION_THRESHOLD`
- Mỗi người dùng có thể đăng ký tối đa **10 ảnh** khuôn mặt (cấu hình `MAX_FACE_ENROLLMENT`)
- Không lưu ảnh gốc lâu dài — chỉ giữ embedding vector (GDPR/PDPA)

### 📷 Camera

- Hỗ trợ RTSP, USB webcam, và HTTP MJPEG stream
- Chuẩn RTSP URL: `rtsp://<user>:<pass>@<ip>:<port>/stream`
- FPS xử lý AI tối đa 10 FPS để tránh quá tải GPU
- Nếu camera mất kết nối, hệ thống tự reconnect sau 5 giây

### 🗄️ Database

- **KHÔNG** chạy `alembic downgrade` trên production mà không backup
- Backup tự động mỗi ngày lúc 2:00 AM (cấu hình trong `infrastructure/scripts/backup.sh`)
- Dùng `pgvector` extension để lưu face embedding — cần enable trước khi migrate
- Xoá log truy cập cũ hơn **90 ngày** theo chính sách lưu trữ

### 🐳 Docker

- Image AI Service cần NVIDIA Docker runtime nếu dùng GPU
- Volumes `postgres-data` và `redis-data` là persistent — không xoá khi `docker compose down`
- Dùng `docker compose down -v` chỉ khi muốn **xoá toàn bộ dữ liệu**

### 📡 WebSocket

- Frontend kết nối WebSocket tại `ws://backend:8000/ws`
- Token JWT phải được gửi qua query param khi kết nối: `?token=<jwt>`
- Tự động reconnect với exponential backoff (tối đa 5 lần)

---

## 🛠 Các Lệnh Thường Dùng

### Frontend

```bash
cd frontend

npm run dev          # Chạy dev server
npm run build        # Build production
npm run lint         # Kiểm tra linting
npm run type-check   # Kiểm tra TypeScript
```

### Backend

```bash
cd backend

# Database migrations
alembic revision --autogenerate -m "add column X to table Y"
alembic upgrade head
alembic downgrade -1

# Chạy tests
pytest tests/ -v
pytest tests/unit/ -v --cov=app

# Format code
black app/
isort app/
ruff check app/
```

### AI Service

```bash
cd ai-service

# Test nhận diện
python scripts/test_recognition.py --image samples/test.jpg

# Benchmark hiệu năng
python scripts/benchmark.py --iterations 100
```

### Docker

```bash
# Xem logs tất cả services
docker compose logs -f

# Xem log riêng một service
docker compose logs -f backend

# Vào shell của container
docker compose exec backend bash
docker compose exec postgres psql -U facegate -d facegate

# Restart một service
docker compose restart ai-service

# Rebuild image sau khi thay đổi code
docker compose up --build backend
```

### Git

```bash
# Xem trạng thái
git status
git log --oneline -10

# Tạo tag release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Undo commit cuối (giữ code)
git reset --soft HEAD~1

# Stash thay đổi hiện tại
git stash push -m "WIP: feature X"
git stash pop
```

---

## 📞 Liên Hệ & Đóng Góp

1. Fork repository
2. Tạo branch theo quy cách: `feature/<tên-tính-năng>`
3. Commit theo Conventional Commits
4. Tạo Pull Request vào `develop`
5. Chờ code review (ít nhất 1 approver)

---

<div align="center">

**FaceGate AI** — Kiểm soát an toàn thông minh với sức mạnh AI

*Made with ❤️ — © 2026*

</div>