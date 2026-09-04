# 🎨 Quy Tắc Trình Bày Code — FaceGate AI

> **Phiên bản:** 1.0.0 | **Cập nhật:** 2026-08-24  
> **Áp dụng cho:** Toàn bộ codebase — Frontend (Next.js), Backend (FastAPI), AI Service (InsightFace/OpenCV), Device Service

---

## 📋 Mục Lục

1. [Triết Lý Chung](#1-triết-lý-chung)
2. [Quy Tắc Đặt Tên](#2-quy-tắc-đặt-tên)
3. [TypeScript / React — Frontend](#3-typescript--react--frontend)
4. [Python — Backend & AI Service](#4-python--backend--ai-service)
5. [SQL & Database Migration](#5-sql--database-migration)
6. [Quy Cách Commit (Conventional Commits)](#6-quy-cách-commit-conventional-commits)
7. [Branching Strategy](#7-branching-strategy)
8. [Code Review Checklist](#8-code-review-checklist)
9. [Bảo Mật & An Toàn Dữ Liệu](#9-bảo-mật--an-toàn-dữ-liệu)

---

## 1. Triết Lý Chung

FaceGate AI là hệ thống kiểm soát ra vào sử dụng thị giác máy tính (OpenCV) và nhận diện khuôn mặt (InsightFace/face_recognition). Mọi đoạn code phải tuân thủ bộ nguyên tắc **CLEAN**:

| Chữ | Nguyên Tắc | Ý Nghĩa Thực Tiễn |
|-----|------------|-------------------|
| **C** | **Clear** | Code tự giải thích — không cần comment mô tả _cái gì_, chỉ mô tả _tại sao_ |
| **L** | **Lean** | Không có code thừa, dead code, hay TODO tồn đọng quá 1 sprint |
| **E** | **Explicit** | Type hints đầy đủ, không dùng `any` / implicit conversion |
| **A** | **Atomic** | Mỗi hàm/component làm đúng một việc duy nhất |
| **N** | **Named** | Tên biến/hàm phản ánh đúng nghiệp vụ (domain language) |

> **Quy tắc vàng:** Nếu bạn cần giải thích tên biến, hãy đổi tên biến đó.

---

## 2. Quy Tắc Đặt Tên

### 2.1 Bảng Quy Ước Chung

| Loại | Quy Ước | Ví Dụ |
|------|---------|-------|
| **Class / Component / Type / Interface** | `PascalCase` | `FaceRecognitionService`, `DoorControlPanel` |
| **Hàm / phương thức / biến** | `camelCase` (TS) / `snake_case` (Python) | `detectFaces()`, `detect_faces()` |
| **Hằng số / Enum value** | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS`, `RECOGNITION_THRESHOLD` |
| **File Python** | `snake_case.py` | `face_recognition_service.py` |
| **File TypeScript/React** | `PascalCase.tsx` (component), `camelCase.ts` (util/hook) | `FaceCard.tsx`, `useWebSocket.ts` |
| **Thư mục** | `kebab-case` (TS) / `snake_case` (Python) | `face-registration/`, `face_recognition/` |
| **Database table** | `snake_case`, số nhiều | `access_logs`, `face_embeddings` |
| **Database column** | `snake_case` | `created_at`, `confidence_score` |
| **API endpoint** | `kebab-case` | `/api/v1/access-logs`, `/recognition/identify` |
| **Environment variable** | `SCREAMING_SNAKE_CASE` | `AI_SERVICE_URL`, `FACE_RECOGNITION_THRESHOLD` |

### 2.2 Thuật Ngữ Thống Nhất (Ubiquitous Language)

```
# ✅ Thuật ngữ chuẩn của hệ thống
embedding         → vector đặc trưng khuôn mặt 512-chiều
recognition       → quá trình nhận diện (so khớp embedding)
detection         → quá trình phát hiện khuôn mặt trong frame
enrollment        → quá trình đăng ký khuôn mặt mới
liveness          → kiểm tra khuôn mặt sống (chống ảnh/video giả)
confidence        → điểm tin cậy nhận diện (0.0 - 1.0)
threshold         → ngưỡng quyết định GRANTED / DENIED
access_log        → bản ghi sự kiện ra vào
door              → thiết bị cửa (relay/khóa điện từ)
camera            → nguồn video (RTSP/USB/HTTP)

# ❌ Tránh dùng
face_data         → dùng face_embedding hoặc face_image
check             → dùng recognize hoặc verify
result            → dùng recognition_result hoặc access_result
```

---

## 3. TypeScript / React — Frontend

### 3.1 Cấu Trúc Component

```typescript
// ─── Thứ tự import chuẩn ───────────────────────────────────────────
// 1. React core
import { useState, useCallback, useEffect } from "react";
// 2. Next.js
import Image from "next/image";
import { useRouter } from "next/navigation";
// 3. Thư viện bên ngoài (alphabetical)
import { format } from "date-fns";
import { toast } from "sonner";
// 4. Internal — types
import type { AccessLog, RecognitionResult } from "@/types";
// 5. Internal — hooks
import { useWebSocket } from "@/hooks/useWebSocket";
// 6. Internal — components
import { StatusBadge } from "@/components/ui/StatusBadge";
// 7. Internal — services/utils
import { api } from "@/lib/api";

// ─── Props Interface — đặt ngay trước component ────────────────────
interface AccessLogRowProps {
  log: AccessLog;
  onRevoke?: (id: string) => Promise<void>;
  isHighlighted?: boolean;
}

// ─── Component — PascalCase, export default ─────────────────────────
export default function AccessLogRow({
  log,
  onRevoke,
  isHighlighted = false,
}: AccessLogRowProps) {
  // State — khai báo đầu tiên
  const [isRevoking, setIsRevoking] = useState(false);

  // Handlers — sau state
  const handleRevoke = useCallback(async () => {
    if (!onRevoke) return;
    setIsRevoking(true);
    try {
      await onRevoke(log.id);
      toast.success("Đã thu hồi quyền truy cập");
    } catch {
      toast.error("Không thể thu hồi — vui lòng thử lại");
    } finally {
      setIsRevoking(false);
    }
  }, [log.id, onRevoke]);

  // Render
  return (
    <tr className={isHighlighted ? "bg-yellow-50" : undefined}>
      {/* ... JSX ... */}
    </tr>
  );
}
```

### 3.2 Quy Tắc TypeScript

```typescript
// ✅ Khai báo type rõ ràng — không dùng any
interface RecognitionResult {
  userId: string | null;
  confidence: number;          // 0.0 → 1.0
  decision: "GRANTED" | "DENIED" | "UNKNOWN";
  processedAt: Date;
  faceBox: BoundingBox;
}

// ✅ Discriminated union cho state phức tạp
type ApiState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

// ✅ Hằng số dùng SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_RECOGNITION_THRESHOLD = 0.6;
const WS_RECONNECT_INTERVAL_MS = 5_000;

// ❌ Tuyệt đối không dùng
const data: any = fetchData();
```

### 3.3 Phân Chia File & Thư Mục Frontend

```
src/
├── app/                        # Next.js App Router — pages only
│   ├── dashboard/page.tsx      # /dashboard
│   ├── face-registration/      # /face-registration
│   ├── access-logs/page.tsx    # /access-logs
│   └── recognition/page.tsx    # /recognition (live view)
│
├── components/                 # Reusable UI components
│   ├── ui/                     # Primitive: Button, Badge, Card, Modal
│   ├── face/                   # FaceCard, FaceCaptureModal, FaceGrid
│   ├── camera/                 # CameraFeed, CameraStatus, RTSPConfig
│   ├── door/                   # DoorControlPanel, DoorStatusBadge
│   ├── alerts/                 # AlertBanner, AlertList
│   ├── charts/                 # AccessChart, RecognitionRateGraph
│   ├── layout/                 # Sidebar, Header, PageContainer
│   └── navigation/             # NavLink, Breadcrumb
│
├── hooks/                      # Custom React hooks
│   ├── useWebSocket.ts         # Live recognition events
│   ├── useCamera.ts            # Camera stream management
│   └── useAccessLogs.ts        # Paginated log queries
│
├── services/                   # API call layer
│   ├── auth.service.ts
│   ├── recognition.service.ts
│   └── door.service.ts
│
├── types/                      # TypeScript types & interfaces
└── lib/                        # Utilities, constants, helpers
```

### 3.4 Nguyên Tắc Server/Client Component

```typescript
// ✅ Server Component (mặc định) — fetch data trực tiếp
// app/access-logs/page.tsx
export default async function AccessLogsPage() {
  const logs = await getAccessLogs();
  return <AccessLogTable initialData={logs} />;
}

// ✅ Client Component — chỉ khi cần browser API / state / event
// components/camera/CameraFeed.tsx
"use client";
export function CameraFeed({ streamUrl }: { streamUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // ... WebRTC / WebSocket logic
}
```

---

## 4. Python — Backend & AI Service

### 4.1 Cấu Trúc Module

```python
"""
face_recognition_service.py
===========================
Service xử lý nhận diện khuôn mặt sử dụng InsightFace + FAISS.
"""

# ─── Standard library ─────────────────────────────────────────────────
from __future__ import annotations
import logging
from pathlib import Path
from typing import Optional

# ─── Third-party ──────────────────────────────────────────────────────
import cv2
import numpy as np
import faiss
from insightface.app import FaceAnalysis

# ─── Internal ─────────────────────────────────────────────────────────
from app.core.config import settings
from app.models.recognition import RecognitionResult, FaceEmbedding
from app.core.exceptions import FaceNotDetectedError, ModelNotLoadedError

# ─── Module-level constants ───────────────────────────────────────────
logger = logging.getLogger(__name__)
DEFAULT_EMBEDDING_DIM: int = 512
SUPPORTED_FORMATS: frozenset[str] = frozenset({"jpg", "jpeg", "png", "webp"})
```

### 4.2 Class & Method

```python
class FaceRecognitionService:
    """
    Service nhận diện khuôn mặt thời gian thực.

    Pipeline: Image → Detect → Align → Embed → Search → Decision

    Attributes:
        threshold: Ngưỡng cosine similarity để chấp nhận nhận diện.
        model: InsightFace model đã được load.
        index: FAISS index chứa embedding của toàn bộ người dùng.
    """

    def __init__(
        self,
        threshold: float = settings.RECOGNITION_THRESHOLD,
        model_name: str = settings.RECOGNITION_MODEL,
    ) -> None:
        self.threshold = threshold
        self._model: Optional[FaceAnalysis] = None
        self._index: Optional[faiss.IndexFlatIP] = None

    # ─── Public interface ─────────────────────────────────────────────

    async def identify_face(self, image_data: bytes) -> RecognitionResult:
        """
        Nhận diện khuôn mặt từ ảnh và quyết định GRANTED/DENIED.

        Args:
            image_data: Dữ liệu ảnh dạng bytes (JPEG hoặc PNG).

        Returns:
            RecognitionResult với trường decision, user_id, confidence.

        Raises:
            FaceNotDetectedError: Khi không phát hiện khuôn mặt.
            ModelNotLoadedError: Khi model chưa được khởi tạo.
        """
        self._ensure_model_loaded()
        frame = self._decode_image(image_data)
        faces = self._detect_faces(frame)

        if not faces:
            raise FaceNotDetectedError("Không phát hiện khuôn mặt trong ảnh.")

        # Xử lý khuôn mặt có diện tích lớn nhất (gần nhất với camera)
        primary_face = max(faces, key=lambda f: f.bbox_area)
        embedding = self._extract_embedding(primary_face)
        return self._search_database(embedding)

    # ─── Private helpers ──────────────────────────────────────────────

    def _decode_image(self, data: bytes) -> np.ndarray:
        """Decode bytes → OpenCV BGR ndarray."""
        nparr = np.frombuffer(data, dtype=np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Không thể giải mã ảnh — định dạng không hỗ trợ.")
        return frame

    def _extract_embedding(self, face: FaceInfo) -> np.ndarray:
        """Trích xuất embedding vector 512-chiều (ArcFace) và normalize."""
        embedding = face.embedding
        return embedding / np.linalg.norm(embedding)
```

### 4.3 FastAPI Router

```python
# ✅ Chuẩn: logic nghiệp vụ nằm trong Service, Router chỉ điều phối

@router.post(
    "/identify",
    response_model=RecognitionResponse,
    status_code=status.HTTP_200_OK,
    summary="Nhận diện khuôn mặt và kiểm tra quyền truy cập",
    description="""
    Upload ảnh khuôn mặt để nhận diện và quyết định mở/đóng cửa.
    - **Kích thước tối thiểu:** 80×80 px
    - **Định dạng:** JPEG, PNG, WebP
    """,
)
async def identify_face(
    file: UploadFile = File(..., description="Ảnh khuôn mặt cần nhận diện"),
    door_id: str = None,
    service: FaceRecognitionService = Depends(get_recognition_service),
) -> RecognitionResponse:
    """Logic nghiệp vụ nằm trong FaceRecognitionService, không xử lý ở đây."""
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Định dạng '{file.content_type}' không được hỗ trợ.",
        )
    image_data = await file.read()
    result = await service.identify_face(image_data)
    return RecognitionResponse.from_domain(result)
```

### 4.4 Repository Pattern

```python
class FaceEmbeddingRepository:
    """
    Chỉ chứa database query — không có business logic.
    Mọi logic nghiệp vụ nằm trong Service layer.
    """

    async def get_all_embeddings(self) -> list[FaceEmbedding]:
        """Lấy toàn bộ embedding để build FAISS index khi khởi động."""
        result = await self._db.execute(
            select(FaceEmbedding)
            .where(FaceEmbedding.is_active == True)
            .order_by(FaceEmbedding.created_at.desc())
        )
        return result.scalars().all()
```

### 4.5 Xử Lý OpenCV & Frame

```python
def preprocess_frame(
    frame: np.ndarray,
    target_size: tuple[int, int] = (640, 640),
) -> np.ndarray:
    """
    Chuẩn hóa frame trước khi đưa vào AI model.

    Note:
        InsightFace mong đợi BGR (giống OpenCV). Không convert sang RGB
        trừ khi sử dụng thư viện khác (face_recognition, dlib).
    """
    h, w = frame.shape[:2]
    if w > target_size[0] or h > target_size[1]:
        frame = cv2.resize(frame, target_size, interpolation=cv2.INTER_AREA)
    return frame


# ✅ Giải phóng resource đúng cách
cap = cv2.VideoCapture(rtsp_url)
try:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        # ... xử lý frame
finally:
    cap.release()
    cv2.destroyAllWindows()
```

### 4.6 Logging

```python
logger = logging.getLogger(__name__)

# ✅ Dùng đúng level — không log dữ liệu nhạy cảm
logger.debug("Frame shape: %s", frame.shape)           # Dev only
logger.info("Camera kết nối: %s", camera_id)           # Sự kiện bình thường
logger.warning("Confidence thấp: %.2f", confidence)    # Cần theo dõi
logger.error("Lỗi RTSP: %s", exc, exc_info=True)       # Lỗi xử lý được
logger.critical("Database mất kết nối", exc_info=True) # Hệ thống down

# ❌ Không bao giờ log
logger.info("JWT Token: %s", token)       # Thông tin nhạy cảm
logger.info("Embedding: %s", embedding)   # Vector 512 phần tử — vô nghĩa
```

---

## 5. SQL & Database Migration

### 5.1 Quy Tắc Đặt Tên & Tạo Bảng

```sql
-- Tên bảng: snake_case, số nhiều
-- Tên cột: snake_case
-- Tên constraint: <type>_<table>_<column>
-- Tên index: idx_<table>_<column(s)>

CREATE TABLE access_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    door_id         UUID        NOT NULL REFERENCES doors(id) ON DELETE RESTRICT,
    camera_id       UUID        REFERENCES cameras(id) ON DELETE SET NULL,
    decision        VARCHAR(10) NOT NULL CHECK (decision IN ('GRANTED', 'DENIED', 'UNKNOWN')),
    confidence      FLOAT       CHECK (confidence >= 0.0 AND confidence <= 1.0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index cho các query phổ biến
CREATE INDEX idx_access_logs_user_id     ON access_logs(user_id);
CREATE INDEX idx_access_logs_door_id     ON access_logs(door_id);
CREATE INDEX idx_access_logs_created_at  ON access_logs(created_at DESC);
CREATE INDEX idx_access_logs_denied      ON access_logs(decision)
    WHERE decision = 'DENIED';  -- Partial index cho alert queries

-- pgvector: lưu face embeddings
CREATE TABLE face_embeddings (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vector      VECTOR(512) NOT NULL,   -- ArcFace 512-dim
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_face_embeddings_vector
    ON face_embeddings USING ivfflat (vector vector_cosine_ops)
    WITH (lists = 100);
```

### 5.2 Quy Tắc Migration

```
✅ Mỗi migration chỉ làm một thay đổi logic duy nhất
✅ Tên file: YYYYMMDD_NNN_<mô tả ngắn>
✅ Mọi upgrade() đều có downgrade() tương ứng
✅ KHÔNG đổi tên migration đã push lên repo
✅ KHÔNG sửa nội dung migration đã apply trên production
✅ Test migration trên staging trước khi apply production
❌ Không chạy alembic downgrade trên production mà không backup
```

---

## 6. Quy Cách Commit (Conventional Commits)

### 6.1 Cấu Trúc

```
<type>(<scope>): <subject>

[optional body — giải thích lý do, không phải cách làm]

[optional footer — breaking changes, issue references]
```

### 6.2 Type Hợp Lệ

| Type | Khi Nào Dùng | Ví Dụ |
|------|-------------|-------|
| `feat` | Tính năng mới | `feat(recognition): thêm liveness detection chống giả mạo` |
| `fix` | Sửa lỗi | `fix(camera): xử lý reconnect khi RTSP timeout sau 30s` |
| `perf` | Cải thiện hiệu năng | `perf(ai): cache FAISS index giảm latency từ 200ms → 15ms` |
| `refactor` | Tái cấu trúc | `refactor(pipeline): tách detection và recognition thành service riêng` |
| `docs` | Tài liệu | `docs(api): thêm schema và ví dụ cho /recognition/identify` |
| `test` | Test | `test(recognition): thêm unit test xử lý multi-face frame` |
| `style` | Format, whitespace | `style(dashboard): format theo Prettier rules` |
| `chore` | Deps, config, CI | `chore(deps): nâng cấp insightface 0.7.3` |
| `build` | Build system | `build(docker): giảm AI service image size từ 8GB → 3.2GB` |
| `ci` | CI/CD | `ci: thêm bước kiểm tra type-check cho frontend` |
| `revert` | Hoàn tác commit | `revert: feat(auth): thêm SSO — gây lỗi session` |

### 6.3 Scope Gợi Ý

```
# AI / Core processing
ai · recognition · detection · embedding · liveness · pipeline

# Backend
backend · auth · users · roles · faces · cameras · doors
access-rules · access-logs · alerts · reports · notifications
audit · settings · websocket · db

# Frontend
frontend · dashboard · face-registration · camera-view
door-control · reports · settings

# Infrastructure
docker · ci · nginx · postgres · redis
```

### 6.4 Ví Dụ Đúng / Sai

```bash
# ✅ Đúng
git commit -m "feat(recognition): thêm hỗ trợ nhận diện nhiều khuôn mặt cùng lúc"
git commit -m "fix(door): sửa relay không phản hồi khi confidence = 0.6 (boundary case)"
git commit -m "perf(ai): load FAISS index từ Redis cache khi khởi động"

# ❌ Sai
git commit -m "update code"
git commit -m "fix bug"
git commit -m "WIP"
git commit -m "feat: done"
```

### 6.5 Breaking Change

```bash
git commit -m "feat(api)!: đổi response format /recognition/identify

BREAKING CHANGE: Trường 'token' đổi thành 'access_token'.
- Frontend cần cập nhật AuthService.parseToken()
- Mobile app cần release patch v1.2.1"
```

---

## 7. Branching Strategy

### 7.1 Mô Hình Branch

```
main  (production — protected)
 └── develop  (integration — protected)
      ├── feature/recognition-pipeline
      ├── feature/door-control-ui
      ├── feature/liveness-detection
      ├── fix/camera-rtsp-memory-leak
      └── release/v1.2.0
```

### 7.2 Quy Tắc Branch

| Branch | Nguồn | Merge vào | Mục Đích |
|--------|-------|-----------|---------|
| `main` | — | — | Code production ổn định |
| `develop` | `main` | — | Tích hợp feature, deploy staging |
| `feature/<name>` | `develop` | `develop` | Tính năng mới |
| `fix/<name>` | `develop` | `develop` | Sửa lỗi thông thường |
| `hotfix/<name>` | `main` | `main` + `develop` | Fix khẩn cấp production |
| `release/<x.y.z>` | `develop` | `main` + `develop` | Chuẩn bị release |

### 7.3 Quy Tắc Tên Branch

```bash
# ✅ Đúng
feature/face-liveness-detection
feature/multi-camera-support
fix/rtsp-connection-timeout
hotfix/jwt-token-expiry-crash
release/v1.2.0

# ❌ Sai
Feature/Add-face-recognition    # Viết hoa
feature/update                  # Quá chung chung
my-branch                       # Không có type prefix
```

### 7.4 PR Description Template

```markdown
## Mô Tả
Thêm passive liveness detection để chống giả mạo bằng ảnh tĩnh/video.

## Thay Đổi
- Thêm `LivenessService` sử dụng Silent-Face-Anti-Spoofing model
- Tích hợp vào pipeline nhận diện sau bước detect, trước bước embed
- Thêm config `LIVENESS_THRESHOLD` (mặc định: 0.85)

## Test
- [x] Unit test `LivenessService` — 15 cases
- [x] Integration test với ảnh thật và ảnh in
- [x] Không làm chậm pipeline (đo: +12ms/frame)

## Checklist
- [x] Type hints đầy đủ
- [x] Docstring cho method public
- [x] Không có `print()` hay debug code
- [x] .env.example cập nhật với biến mới
```

---

## 8. Code Review Checklist

### 8.1 Trước Khi Submit PR

```
□ Code chạy được locally (không lỗi)
□ Không có print() hay debug code thừa
□ Không có TODO comment (chuyển thành issue)
□ Type hints đầy đủ (Python & TypeScript)
□ Docstring cho tất cả public method/endpoint
□ Unit test cho logic quan trọng
□ .env.example cập nhật nếu thêm biến mới
□ Migration file đúng tên và có downgrade()
□ Không commit file .env, secret key
```

### 8.2 Trong Code Review

```
□ Single Responsibility — mỗi class/function làm 1 việc?
□ Logic nghiệp vụ nằm trong Service, không trong Router?
□ Repository chỉ có query, không có business logic?
□ Error handling đầy đủ, không để exception lan tràn?
□ Không có N+1 query (dùng eager loading khi cần)?
□ Secret/credential không hard-code trong code?
□ Response API đúng schema đã khai báo?
```

---

## 9. Bảo Mật & An Toàn Dữ Liệu

### 9.1 Quy Tắc Bắt Buộc

```python
# ❌ Tuyệt đối không làm
API_KEY = "sk-1234567890abcdef"           # Hard-code credential
logger.info("JWT: %s", token)             # Log thông tin nhạy cảm

# ✅ Cách đúng
API_KEY = settings.API_KEY                # Đọc từ environment
logger.info("User authenticated", extra={"user_id": user_id})
```

### 9.2 Lưu Trữ Dữ Liệu Sinh Trắc Học (GDPR/PDPA)

```
✅ Chỉ lưu embedding vector (512 float) — không lưu ảnh gốc lâu dài
✅ Ảnh gốc chỉ dùng để trích xuất embedding, xoá ngay sau đó
✅ Embedding lưu trong PostgreSQL với pgvector (không lưu raw file)
✅ Xoá toàn bộ dữ liệu khi người dùng yêu cầu (Right to Erasure)
✅ Log truy cập xoá sau 90 ngày (chính sách lưu trữ tối thiểu)
❌ Không chia sẻ embedding với bên thứ ba
❌ Không dùng dữ liệu sinh trắc học cho mục đích ngoài kiểm soát ra vào
```

### 9.3 Ngưỡng Nhận Diện

```
confidence < 0.4  → Definitely wrong person → DENIED
confidence 0.4–0.6 → Uncertain → DENIED (conservative)
confidence > 0.6  → Match → GRANTED (mặc định, cấu hình được)
confidence > 0.85 → High confidence match

Điều chỉnh theo môi trường:
- Bảo mật cao (server room): threshold = 0.75+
- Thông thường (văn phòng):  threshold = 0.6 (mặc định)
```

---

*Tài liệu này là tài liệu sống — cập nhật khi có quyết định kỹ thuật mới.*  
*Mọi ngoại lệ cần được ghi chú rõ lý do trong code và thảo luận trong team.*
