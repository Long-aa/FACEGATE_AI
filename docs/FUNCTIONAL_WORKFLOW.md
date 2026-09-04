# 🔐 FaceGate AI — Quy Trình Chức Năng Hoạt Động

> **Phiên bản:** 1.0.0 | **Cập nhật:** 2026-08-24  
> **Đề tài:** Hệ Thống Ra Vào Cửa Sử Dụng OpenCV và Face Recognition  
> **Stack:** InsightFace + OpenCV + FastAPI + Next.js + PostgreSQL/pgvector + Redis + FAISS

---

## 📋 Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Luồng Chức Năng Nhận Diện (Core Pipeline)](#2-luồng-chức-năng-nhận-diện-core-pipeline)
3. [Luồng Đăng Ký Khuôn Mặt (Face Enrollment)](#3-luồng-đăng-ký-khuôn-mặt-face-enrollment)
4. [Luồng Kiểm Soát Ra Vào Cửa](#4-luồng-kiểm-soát-ra-vào-cửa)
5. [Luồng Xác Thực & Phân Quyền](#5-luồng-xác-thực--phân-quyền)
6. [Luồng Giám Sát Thời Gian Thực (WebSocket)](#6-luồng-giám-sát-thời-gian-thực-websocket)
7. [Luồng Camera & Stream Management](#7-luồng-camera--stream-management)
8. [Luồng Cảnh Báo & Thông Báo](#8-luồng-cảnh-báo--thông-báo)
9. [Luồng Báo Cáo & Audit Log](#9-luồng-báo-cáo--audit-log)
10. [Cơ Chế Xử Lý Lỗi & Phục Hồi](#10-cơ-chế-xử-lý-lỗi--phục-hồi)
11. [Sơ Đồ Tương Tác Giữa Các Service](#11-sơ-đồ-tương-tác-giữa-các-service)

---

## 1. Tổng Quan Kiến Trúc

### 1.1 Mô Hình Microservice

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx Reverse Proxy                      │
│                   Port 80 (HTTP) / 443 (HTTPS)                  │
└───────┬──────────────────────┬──────────────────────┬───────────┘
        │                      │                      │
   ┌────▼────┐            ┌────▼────┐           ┌─────▼──────┐
   │Frontend │            │Backend  │           │ AI Service │
   │Next.js  │◄──REST────►│FastAPI  │◄──HTTP───►│InsightFace │
   │:3000    │◄──WS──────►│:8000    │           │OpenCV:8001 │
   └─────────┘            └────┬────┘           └────────────┘
                               │
               ┌───────────────┼──────────────────┐
          ┌────▼────┐     ┌────▼────┐      ┌───────▼──────┐
          │Postgres │     │  Redis  │      │Device Service│
          │+pgvector│     │  :6379  │      │ MQTT / :8002 │
          │  :5432  │     └─────────┘      └──────────────┘
          └─────────┘
```

### 1.2 Vai Trò Từng Service

| Service | Công Nghệ | Cổng | Trách Nhiệm |
|---------|-----------|------|-------------|
| **Frontend** | Next.js 16 + Tailwind | 3000 | Dashboard quản trị, đăng ký khuôn mặt, giám sát live |
| **Backend** | FastAPI + SQLAlchemy | 8000 | REST API, nghiệp vụ, xác thực, WebSocket broker |
| **AI Service** | InsightFace + FAISS | 8001 | Detection, embedding, recognition thuần AI |
| **Device Service** | FastAPI + MQTT | 8002 | Điều khiển relay cửa, đọc camera hardware |
| **PostgreSQL** | PG 16 + pgvector | 5432 | Persistence: users, doors, access_logs, embeddings |
| **Redis** | Redis 7 | 6379 | Cache FAISS index, session, pub/sub real-time events |

---

## 2. Luồng Chức Năng Nhận Diện (Core Pipeline)

Đây là luồng **quan trọng nhất** của hệ thống — xảy ra mỗi khi có người đứng trước camera.

### 2.1 Sơ Đồ Luồng Nhận Diện

```
Camera (RTSP/USB)
      │
      ▼ Frame liên tục (10 FPS)
┌─────────────────────┐
│   Frame Capture     │  ← Device Service / AI Service
│   cv2.VideoCapture  │
└──────────┬──────────┘
           │
           ▼ BGR ndarray
┌─────────────────────┐
│  Face Detection     │  ← RetinaFace (InsightFace)
│  retinaface_r50_v1  │    Phát hiện bounding box + landmarks
│  threshold: 0.5     │
└──────────┬──────────┘
           │ [Không có mặt] → Bỏ frame, tiếp tục
           │ [Có mặt] → Tiếp tục
           ▼
┌─────────────────────┐
│  Face Alignment     │  ← InsightFace tự thực hiện
│  5-point landmark   │    Chuẩn hóa góc và kích thước
│  → 112×112px crop   │
└──────────┬──────────┘
           │
           ▼ Normalized face crop
┌─────────────────────┐
│  Feature Extraction │  ← ArcFace (arcface_r100_v1)
│  → 512-dim vector   │    ONNX Runtime inference
│  L2 normalize       │
└──────────┬──────────┘
           │ embedding: float32[512]
           ▼
┌─────────────────────┐
│  Similarity Search  │  ← FAISS IndexFlatIP
│  Cosine similarity  │    In-memory search < 5ms
│  vs. all enrolled   │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │ confidence  │
    │  > 0.6?     │
    └──┬──────┬───┘
       │YES   │NO
       ▼      ▼
   GRANTED  DENIED
       │      │
       └──────┘
           │
           ▼
┌─────────────────────┐
│  Log Access Event   │  ← Backend: ghi access_logs
│  Notify WebSocket   │  ← Redis pub/sub → Frontend
│  Control Door       │  ← Device Service: relay trigger
└─────────────────────┘
```

### 2.2 Chi Tiết Từng Bước

#### Bước 1 — Frame Capture

```python
# AI Service / Device Service
class RTSPCameraCapture:
    def __init__(self, rtsp_url: str, fps: int = 10):
        self.cap = cv2.VideoCapture(rtsp_url)
        self.target_fps = fps
        self.frame_interval = 1.0 / fps  # 100ms giữa mỗi frame xử lý

    async def stream_frames(self) -> AsyncGenerator[np.ndarray, None]:
        """Phát frame liên tục với rate giới hạn để tránh quá tải GPU."""
        last_capture = 0
        while self.cap.isOpened():
            now = time.monotonic()
            if now - last_capture < self.frame_interval:
                await asyncio.sleep(0.01)
                continue
            ret, frame = self.cap.read()
            if not ret:
                await self._attempt_reconnect()
                continue
            last_capture = now
            yield frame
```

#### Bước 2 — Face Detection (RetinaFace)

```python
class FaceDetectionService:
    """Phát hiện khuôn mặt và 5-point facial landmarks."""

    def detect(self, frame: np.ndarray) -> list[DetectedFace]:
        """
        Returns:
            List DetectedFace, mỗi phần tử gồm:
            - bbox: [x1, y1, x2, y2] bounding box
            - det_score: confidence của detection (0.0-1.0)
            - kps: 5-point landmarks [left_eye, right_eye, nose, left_mouth, right_mouth]
        """
        faces = self.model.get(frame)  # InsightFace FaceAnalysis.get()
        return [f for f in faces if f.det_score >= self.detection_threshold]
```

**Điều kiện ảnh tối thiểu để detection hoạt động tốt:**

| Thông Số | Tối Thiểu | Khuyến Nghị |
|----------|-----------|-------------|
| Kích thước khuôn mặt | 80×80 px | ≥ 160×160 px |
| Góc ngang (yaw) | ±45° | ±30° |
| Góc đứng (pitch) | ±30° | ±20° |
| Ánh sáng (lux) | ≥ 50 lux | ≥ 200 lux |
| Độ phân giải frame | 480p | 720p+ |

#### Bước 3 — Feature Extraction (ArcFace)

```python
def extract_embedding(self, face: DetectedFace) -> np.ndarray:
    """
    ArcFace trả về vector 512-chiều.
    L2 normalization để dùng dot product = cosine similarity.
    """
    embedding = face.embedding          # float32[512]
    norm = np.linalg.norm(embedding)
    normalized = embedding / norm        # Unit vector
    return normalized
```

#### Bước 4 — FAISS Search

```python
def search_similar(
    self, query_embedding: np.ndarray, top_k: int = 1
) -> list[SearchResult]:
    """
    FAISS IndexFlatIP: Inner Product search = Cosine similarity
    (vì vector đã được normalize về unit length).

    Độ phức tạp: O(n) với n = số embedding đã đăng ký.
    Tốc độ: < 5ms với n < 10,000 người.
    """
    # Reshape để FAISS xử lý batch
    query = query_embedding.reshape(1, -1).astype(np.float32)
    distances, indices = self.index.search(query, top_k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:  # Không tìm thấy
            continue
        results.append(SearchResult(
            user_id=self._user_id_map[idx],
            confidence=float(dist),  # cosine similarity [0, 1]
        ))
    return results
```

#### Bước 5 — Quyết Định GRANTED / DENIED

```python
def make_access_decision(
    self, search_result: SearchResult | None, door_id: str
) -> AccessDecision:
    """
    Quyết định dựa trên confidence và access rules.
    """
    if search_result is None or search_result.confidence < self.threshold:
        return AccessDecision(
            decision=Decision.DENIED,
            reason="Không nhận diện được khuôn mặt",
            confidence=search_result.confidence if search_result else 0.0,
        )

    # Kiểm tra access rules (giờ làm việc, quyền theo cửa)
    user = await self.user_repo.get(search_result.user_id)
    if not self._check_access_rules(user, door_id):
        return AccessDecision(
            decision=Decision.DENIED,
            reason="Ngoài giờ truy cập hoặc không có quyền",
            user_id=user.id,
            confidence=search_result.confidence,
        )

    return AccessDecision(
        decision=Decision.GRANTED,
        user_id=user.id,
        confidence=search_result.confidence,
    )
```

---

## 3. Luồng Đăng Ký Khuôn Mặt (Face Enrollment)

### 3.1 Sơ Đồ Luồng

```
Quản Trị Viên (Frontend)
        │
        │ POST /api/v1/faces/enroll
        │ Multipart: user_id + image files (1-10 ảnh)
        ▼
   Backend (FastAPI)
        │
        ├─ Validate: định dạng, kích thước, user tồn tại
        │
        │ POST /embedding/extract (HTTP)
        ▼
   AI Service
        │
        ├─ Detect khuôn mặt (phải có đúng 1 khuôn mặt/ảnh)
        ├─ Extract embedding 512-dim
        ├─ Trả về vector
        ▼
   Backend
        │
        ├─ Lưu vector vào PostgreSQL (face_embeddings)
        ├─ Xoá ảnh gốc (chỉ giữ vector — GDPR)
        │
        │ PUBLISH "index_rebuild" → Redis
        ▼
   AI Service
        │
        ├─ Subscribe Redis channel
        ├─ Load toàn bộ embedding từ DB
        ├─ Build lại FAISS index
        ├─ Lưu index vào Redis cache
        ▼
   Nhận Diện Tiếp Theo Sẽ Bao Gồm Người Mới
```

### 3.2 Validation Ảnh Đăng Ký

```python
class FaceEnrollmentValidator:
    """Kiểm tra chất lượng ảnh trước khi lưu embedding."""

    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    MIN_FACE_SIZE = 80    # pixels
    MAX_FACES_PER_IMAGE = 1
    MAX_IMAGES_PER_USER = 10

    async def validate_enrollment_image(
        self, image_data: bytes, user_id: str
    ) -> ValidationResult:
        """
        Kiểm tra:
        1. Định dạng file hợp lệ
        2. Kích thước file < 10MB
        3. Phát hiện đúng 1 khuôn mặt (không nhiều hơn, không ít hơn)
        4. Khuôn mặt đủ lớn (≥ 80×80px)
        5. Chưa đủ 10 ảnh (giới hạn per user)
        """
        current_count = await self.repo.count_embeddings(user_id)
        if current_count >= self.MAX_IMAGES_PER_USER:
            raise ValueError(f"Đã đủ {self.MAX_IMAGES_PER_USER} ảnh — xoá ảnh cũ trước.")

        faces = await self.ai_service.detect_faces(image_data)
        if len(faces) == 0:
            raise FaceNotDetectedError("Không tìm thấy khuôn mặt trong ảnh.")
        if len(faces) > 1:
            raise ValueError(f"Ảnh chứa {len(faces)} khuôn mặt — chỉ dùng ảnh 1 người.")

        face = faces[0]
        face_width = face.bbox[2] - face.bbox[0]
        face_height = face.bbox[3] - face.bbox[1]
        if face_width < self.MIN_FACE_SIZE or face_height < self.MIN_FACE_SIZE:
            raise ValueError(f"Khuôn mặt quá nhỏ ({face_width}×{face_height}px). Cần ≥ 80×80px.")

        return ValidationResult(face=face, quality_score=face.det_score)
```

---

## 4. Luồng Kiểm Soát Ra Vào Cửa

### 4.1 Sơ Đồ Toàn Bộ Luồng Cửa

```
┌──────────────────────────────────────────────────────────────────┐
│                    LUỒNG MỞ CỬA ĐẦY ĐỦ                          │
└──────────────────────────────────────────────────────────────────┘

Camera phát hiện chuyển động
          │
          ▼
AI Pipeline (Detection → Embedding → Search)
          │
    ┌─────▼──────┐
    │ confidence │
    │  ≥ 0.6?    │
    └──┬─────┬───┘
       │YES  │NO
       ▼     ▼
  Check    Log DENIED
  Access   + Alert nếu
  Rules    liên tiếp ≥ 3
       │
  ┌────▼─────────────────────┐
  │  Access Rules Check      │
  │  - Giờ làm việc?         │
  │  - Có quyền với cửa này? │
  │  - Tài khoản active?     │
  └────┬──────────┬───────────┘
       │PASS      │FAIL
       ▼          ▼
   Send CMD    Log DENIED
   to Device   (Reason: ACL)
   Service
       │
       ▼
   Device Service
   ├─ Trigger relay GPIO
   │  → Khóa điện từ mở (3 giây mặc định)
   ├─ LED indicator xanh
   └─ Buzzer beep 1 lần
       │
       ▼
   Log GRANTED
   + WebSocket notify
   + (Tuỳ chọn) Push notification
```

### 4.2 Access Rules Engine

```python
class AccessRulesEngine:
    """Kiểm tra quy tắc truy cập phức hợp."""

    async def is_access_permitted(
        self, user_id: str, door_id: str, at: datetime
    ) -> tuple[bool, str]:
        """
        Returns:
            (permitted: bool, reason: str)
        """
        rules = await self.rules_repo.get_active_rules(user_id, door_id)

        for rule in rules:
            # Kiểm tra thời gian (cron-style schedule)
            if not self._is_within_schedule(rule.schedule, at):
                continue
            # Kiểm tra ngày trong tuần
            if rule.weekdays and at.weekday() not in rule.weekdays:
                continue
            # Kiểm tra ngày hết hạn
            if rule.expires_at and at > rule.expires_at:
                continue
            return True, "Access granted by rule"

        return False, "No matching access rule"

    def _is_within_schedule(self, schedule: TimeRange, at: datetime) -> bool:
        """Kiểm tra thời điểm có trong khung giờ cấu hình."""
        current_time = at.time()
        return schedule.start <= current_time <= schedule.end
```

### 4.3 Device Service — Điều Khiển Relay

```python
# device-service/app/door/relay_controller.py

class RelayDoorController:
    """Điều khiển khóa điện từ qua GPIO hoặc MQTT."""

    DEFAULT_UNLOCK_DURATION_SEC = 3

    async def unlock(
        self, door_id: str, duration_sec: int = DEFAULT_UNLOCK_DURATION_SEC
    ) -> None:
        """
        Mở khóa cửa trong khoảng thời gian xác định.
        Tự động đóng lại sau duration_sec giây.
        """
        await self._set_relay_state(door_id, state=RelayState.OPEN)
        logger.info("Door %s UNLOCKED for %ds", door_id, duration_sec)

        await asyncio.sleep(duration_sec)

        await self._set_relay_state(door_id, state=RelayState.CLOSED)
        logger.info("Door %s re-LOCKED", door_id)
```

---

## 5. Luồng Xác Thực & Phân Quyền

### 5.1 Sơ Đồ Authentication

```
Client (Frontend)
      │
      │ POST /api/v1/auth/login
      │ {username, password}
      ▼
Backend (FastAPI)
      │
      ├─ Tìm user theo username (DB)
      ├─ Verify password (bcrypt)
      │
      ├─ [Sai] → 401 Unauthorized
      │
      ├─ [Đúng] → Tạo JWT Access Token (expire: 1440 min)
      │           + JWT Refresh Token (expire: 7 ngày)
      │
      ├─ Lưu refresh token vào Redis (key: refresh:{user_id})
      │
      ▼
Response: {access_token, refresh_token, token_type: "bearer"}
      │
      ▼
Frontend lưu access_token vào memory (không lưu localStorage)
Frontend lưu refresh_token vào httpOnly cookie
```

### 5.2 Phân Quyền RBAC

```
Roles trong hệ thống:

SUPER_ADMIN
  └── Toàn quyền: tất cả endpoints, tất cả cửa, tất cả chi nhánh

ADMIN
  └── Quản lý user, cửa, camera, access rules
  └── Xem báo cáo và audit log
  └── Không thể thay đổi cấu hình hệ thống

SECURITY_OFFICER
  └── Xem live feed, access log, alerts
  └── Mở/đóng cửa thủ công
  └── Không thể thêm/sửa user

USER
  └── Xem lịch sử ra vào của chính mình
  └── Không có quyền quản trị

GUEST
  └── Quyền tối thiểu — chỉ có thể đọc profile cá nhân
```

```python
# Khai báo quyền trong FastAPI
from app.core.permissions import require_roles, Role

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_roles([Role.SUPER_ADMIN, Role.ADMIN])),
):
    """Chỉ SUPER_ADMIN và ADMIN mới có thể xoá user."""
    ...
```

### 5.3 JWT Token Flow

```
Access Token (JWT):
  Header: {alg: HS256, typ: JWT}
  Payload: {
    sub: "user-uuid",
    role: "ADMIN",
    exp: <timestamp>,
    iat: <timestamp>,
    jti: "unique-token-id"   ← để revoke nếu cần
  }
  
Refresh Flow:
  POST /api/v1/auth/refresh
  Cookie: refresh_token=<jwt>
  → Verify refresh token từ Redis
  → Issue new access_token
  → Rotate refresh_token (mỗi lần refresh là token mới)
  
Logout:
  POST /api/v1/auth/logout
  → Xoá refresh token khỏi Redis
  → Blacklist access token (jti) trong Redis cho đến khi expire
```

---

## 6. Luồng Giám Sát Thời Gian Thực (WebSocket)

### 6.1 Kiến Trúc WebSocket

```
Camera (AI pipeline)
        │ Recognition Event
        │
        ▼
Backend (FastAPI)
        │ PUBLISH to Redis Pub/Sub
        │ channel: "recognition_events:{door_id}"
        ▼
Redis Pub/Sub
        │ SUBSCRIBE
        ▼
WebSocket Manager (Backend)
        │ Broadcast đến clients đang xem door này
        ▼
Frontend (Next.js)
        │ WebSocket message
        ▼
Dashboard cập nhật realtime:
  - Live access log entry mới
  - Ảnh khuôn mặt vừa nhận diện
  - Status badge: GRANTED (xanh) / DENIED (đỏ)
  - Thống kê tổng hợp cập nhật
```

### 6.2 Message Protocol

```typescript
// WebSocket message format (Frontend types)

// Server → Client events
type WSEventType =
  | "recognition_result"    // Kết quả nhận diện vừa xảy ra
  | "door_status_change"    // Cửa mở/đóng
  | "camera_offline"        // Camera mất kết nối
  | "alert_triggered"       // Cảnh báo được kích hoạt
  | "system_health"         // Heartbeat 30s/lần

interface RecognitionEvent {
  type: "recognition_result";
  payload: {
    doorId: string;
    cameraId: string;
    decision: "GRANTED" | "DENIED";
    userId: string | null;
    userName: string | null;
    confidence: number;
    thumbnailBase64: string | null;  // Thumbnail 80×80 để hiển thị
    timestamp: string;               // ISO 8601
  };
}

interface DoorStatusEvent {
  type: "door_status_change";
  payload: {
    doorId: string;
    status: "LOCKED" | "UNLOCKED" | "FAULT";
    triggeredBy: "recognition" | "manual" | "schedule";
    timestamp: string;
  };
}
```

### 6.3 Frontend WebSocket Hook

```typescript
// hooks/useRecognitionFeed.ts

export function useRecognitionFeed(doorId?: string) {
  const [events, setEvents] = useState<RecognitionEvent[]>([]);
  const { isConnected, lastEvent } = useWebSocket({
    url: `${process.env.NEXT_PUBLIC_WS_URL}/ws/recognition`,
    onMessage: (event) => {
      if (event.type === "recognition_result") {
        if (doorId && event.payload.doorId !== doorId) return;
        setEvents((prev) => [event, ...prev].slice(0, 100)); // Giữ 100 event gần nhất
      }
    },
  });

  return { events, isConnected };
}
```

### 6.4 Reconnect Strategy

```typescript
// lib/websocket.ts — Exponential backoff reconnect

const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000]; // ms

class WebSocketClient {
  private reconnectAttempts = 0;

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= RECONNECT_DELAYS.length) {
      console.error("WebSocket: Đã thử kết nối lại 5 lần — dừng.");
      this.emit("max_reconnect_reached");
      return;
    }
    const delay = RECONNECT_DELAYS[this.reconnectAttempts];
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }
}
```

---

## 7. Luồng Camera & Stream Management

### 7.1 Các Loại Camera Được Hỗ Trợ

| Loại | URL Format | Ưu Điểm | Nhược Điểm |
|------|-----------|---------|-----------|
| **RTSP** | `rtsp://user:pass@ip:554/stream` | Độ trễ thấp, chất lượng cao | Cần IP camera hỗ trợ RTSP |
| **USB Webcam** | `0`, `1`, `2` (index) | Dễ cài đặt | Cáp ngắn, không mạng |
| **HTTP MJPEG** | `http://ip/mjpeg` | Qua HTTP firewall được | Băng thông cao, latency lớn |

### 7.2 Camera Lifecycle

```
Camera được thêm vào hệ thống (Admin)
          │
          ▼
Device Service khởi tạo CameraCapture
          │
          ▼
Vòng lặp: cv2.VideoCapture(url).read()
          │
    ┌─────▼──────┐
    │ ret = True?│
    └──┬──────┬──┘
       │YES   │NO (Camera mất kết nối)
       ▼      ▼
   Process  Retry sau 5 giây
   Frame    (tối đa 5 lần)
                │
            ┌───▼──────────────────┐
            │  Vẫn không kết nối?  │
            └───┬──────────────────┘
                │
                ▼
         Gửi alert: "camera_offline"
         WebSocket notify Frontend
         Log vào system_logs
```

### 7.3 Frame Processing Rate

```python
# Cấu hình xử lý frame để cân bằng độ chính xác và hiệu năng

CAMERA_CAPTURE_FPS = 30     # FPS thực của camera
AI_PROCESSING_FPS  = 10     # Chỉ gửi 10 frame/giây vào AI pipeline
MOTION_DETECT_FPS  = 5      # Motion detection ở rate thấp hơn để tiết kiệm

# Lý do: AI model (ArcFace) cần ~50-100ms/frame trên CPU
# Ở 10 FPS AI: latency từ xuất hiện → quyết định ≈ 100-200ms
# Ở 30 FPS AI: GPU bị quá tải, queue tích lũy → độ trễ tăng dần
```

---

## 8. Luồng Cảnh Báo & Thông Báo

### 8.1 Các Loại Cảnh Báo

| Alert Type | Điều Kiện Kích Hoạt | Mức Độ | Hành Động |
|-----------|---------------------|--------|----------|
| `UNKNOWN_FACE` | DENIED liên tiếp ≥ 3 lần trong 5 phút | HIGH | Push notification + Log |
| `CAMERA_OFFLINE` | Camera mất kết nối > 30 giây | CRITICAL | Email + Push + Log |
| `DOOR_FORCED` | Cảm biến cửa mở nhưng không có lệnh mở | CRITICAL | SMS + Email + Push |
| `LOW_CONFIDENCE` | Confidence 0.5–0.6 (gần ngưỡng) liên tục | MEDIUM | Log + Dashboard badge |
| `HIGH_FAIL_RATE` | Tỷ lệ DENIED > 30% trong 1 giờ | MEDIUM | Dashboard report |
| `SYSTEM_OVERLOAD` | CPU/GPU > 90% trong 5 phút | HIGH | Email + Log |

### 8.2 Luồng Xử Lý Alert

```
Event xảy ra (ví dụ: DENIED lần 3 trong 5 phút)
        │
        ▼
AlertDetectionService.evaluate()
        │
        ├─ Kiểm tra có đủ điều kiện alert không?
        ├─ Tránh trùng lặp (debounce: 5 phút/alert/door)
        │
        ▼
Tạo Alert record trong DB
        │
        ▼
Parallel notification (async):
  ├─ WebSocket push → Frontend Dashboard
  ├─ Push Notification (FCM/APNs nếu tích hợp)
  └─ Email (qua SMTP nếu cấu hình)
        │
        ▼
Admin acknowledge alert trên Dashboard
        │
        ▼
Alert status → RESOLVED
```

---

## 9. Luồng Báo Cáo & Audit Log

### 9.1 Dữ Liệu Được Ghi Log

```python
# Mỗi lần nhận diện → 1 access_log record
access_log = AccessLog(
    user_id        = result.user_id,        # UUID hoặc None nếu DENIED
    door_id        = door_id,
    camera_id      = camera_id,
    decision       = "GRANTED" | "DENIED",
    confidence     = result.confidence,      # float [0,1]
    face_image_path= thumbnail_path,         # Chỉ thumbnail, xoá sau 7 ngày
    created_at     = datetime.utcnow(),
)

# Mọi hành động quản trị → 1 audit_log record
audit_log = AuditLog(
    actor_id   = admin.id,
    action     = "DELETE_USER",
    resource   = f"users/{user_id}",
    ip_address = request.client.host,
    user_agent = request.headers.get("user-agent"),
    created_at = datetime.utcnow(),
)
```

### 9.2 Báo Cáo Có Sẵn

| Báo Cáo | Mô Tả | Endpoint |
|---------|-------|---------|
| **Nhật ký truy cập** | Danh sách GRANTED/DENIED theo thời gian | `GET /api/v1/access-logs` |
| **Thống kê theo người** | Tổng số lần ra vào theo từng user | `GET /api/v1/reports/by-user` |
| **Thống kê theo cửa** | Lưu lượng theo từng cửa, giờ cao điểm | `GET /api/v1/reports/by-door` |
| **Tỷ lệ nhận diện** | GRANTED rate, DENIED rate, confidence avg | `GET /api/v1/reports/recognition-stats` |
| **Audit trail** | Toàn bộ hành động quản trị | `GET /api/v1/audit` |

### 9.3 Chính Sách Lưu Trữ

```
Dữ Liệu                Thời Gian Lưu    Lý Do
─────────────────────────────────────────────────────────
access_logs (metadata)   90 ngày         Chính sách bảo mật
face_thumbnails          7 ngày          Xác minh sau sự cố
system_logs              30 ngày         Debug & monitoring
audit_logs               2 năm           Compliance
face_embeddings          Vĩnh viễn       Đến khi user xoá tài khoản
```

---

## 10. Cơ Chế Xử Lý Lỗi & Phục Hồi

### 10.1 Fault Tolerance Matrix

| Thành Phần | Lỗi | Hành Vi Hệ Thống | Phục Hồi |
|-----------|-----|-----------------|---------|
| **AI Service** | Crash/Restart | Backend queue request, retry 3 lần | Auto-restart (Docker restart policy) |
| **Camera** | Mất kết nối | Cửa ở trạng thái LOCKED (an toàn mặc định) | Reconnect sau 5s, alert sau 30s |
| **PostgreSQL** | Mất kết nối | Return 503, không xử lý giao dịch | Connection pool retry với backoff |
| **Redis** | Mất kết nối | FAISS search từ in-memory, WebSocket buffer | Reconnect, rebuild từ DB |
| **Device Service** | Crash | Cửa không nhận lệnh mới | Alert + manual override |
| **Frontend** | WebSocket ngắt | Hiển thị "Disconnected", auto reconnect | Exponential backoff 5 lần |

### 10.2 Circuit Breaker Pattern

```python
# Backend → AI Service call với circuit breaker

class AIServiceClient:
    """HTTP client đến AI Service với fault tolerance."""

    def __init__(self):
        self._failure_count = 0
        self._circuit_open = False
        self._circuit_open_at: datetime | None = None
        self.FAILURE_THRESHOLD = 5
        self.RESET_TIMEOUT_SEC = 60

    async def extract_embedding(self, image_data: bytes) -> np.ndarray:
        if self._is_circuit_open():
            raise ServiceUnavailableError("AI Service tạm thời không khả dụng.")

        try:
            response = await self._http_client.post(
                "/embedding/extract",
                content=image_data,
                timeout=5.0,
            )
            self._on_success()
            return response.json()["embedding"]
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            self._on_failure()
            raise ServiceUnavailableError(f"AI Service lỗi: {exc}") from exc

    def _is_circuit_open(self) -> bool:
        if not self._circuit_open:
            return False
        # Half-open: thử lại sau RESET_TIMEOUT_SEC
        if (datetime.utcnow() - self._circuit_open_at).seconds > self.RESET_TIMEOUT_SEC:
            self._circuit_open = False
            return False
        return True
```

### 10.3 Graceful Degradation

```
Kịch Bản: AI Service bị quá tải

Bình thường:           Camera → AI → Decision → Door
                       Latency: ~150ms

Degraded (AI chậm):    Camera → Queue → AI (batch) → Decision → Door
                       Latency: ~500ms — vẫn hoạt động

Fallback (AI down):    → Chế độ "PIN override" — mở cửa bằng mã
                       → Hoặc "Fail-secure" — cửa đóng, cần admin mở thủ công
                       → Alert ngay lập tức đến admin
```

---

## 11. Sơ Đồ Tương Tác Giữa Các Service

### 11.1 Sequence Diagram — Nhận Diện Thành Công

```
Camera    DeviceSvc   AISvc    Backend   Redis    PostgreSQL  Frontend
  │           │          │        │         │          │          │
  │──frame──►│          │        │         │          │          │
  │           │──POST──►│        │         │          │          │
  │           │  /detect │        │         │          │          │
  │           │◄─faces──│        │         │          │          │
  │           │          │        │         │          │          │
  │           │──POST──►│        │         │          │          │
  │           │  /embed  │        │         │          │          │
  │           │◄─vector─│        │         │          │          │
  │           │          │        │         │          │          │
  │           │──POST──────────►│         │          │          │
  │           │  /recognition   │         │          │          │
  │           │  /identify      │         │          │          │
  │           │                 │──GET───►│          │          │
  │           │                 │  FAISS  │          │          │
  │           │                 │  index  │          │          │
  │           │                 │◄result──│          │          │
  │           │                 │         │          │          │
  │           │◄──GRANTED───────│         │          │          │
  │           │                 │──INSERT────────────►│          │
  │           │                 │  access_log         │          │
  │           │                 │         │           │          │
  │           │──relay.open()   │         │           │          │
  │           │  [door unlocks] │         │           │          │
  │           │                 │──PUB──►│            │          │
  │           │                 │  event  │            │          │
  │           │                 │         │────────────────────►│
  │           │                 │         │  WS push             │
  │           │                 │         │  to frontend         │
```

### 11.2 API Endpoints Tổng Quan

```
Backend REST API (prefix: /api/v1)

Authentication:
  POST   /auth/login            → JWT token
  POST   /auth/refresh          → New access token
  POST   /auth/logout           → Revoke tokens

Users & Roles:
  GET    /users                 → Danh sách người dùng
  POST   /users                 → Tạo người dùng mới
  GET    /users/{id}            → Chi tiết người dùng
  PUT    /users/{id}            → Cập nhật thông tin
  DELETE /users/{id}            → Xoá người dùng

Face Management:
  POST   /faces/enroll          → Đăng ký khuôn mặt mới
  GET    /faces/{user_id}       → Danh sách embedding của user
  DELETE /faces/{embedding_id}  → Xoá một embedding

Recognition:
  POST   /recognition/identify  → Nhận diện từ ảnh upload

Cameras:
  GET    /cameras               → Danh sách camera
  POST   /cameras               → Thêm camera mới
  GET    /cameras/{id}/status   → Trạng thái camera
  DELETE /cameras/{id}          → Xoá camera

Doors:
  GET    /doors                 → Danh sách cửa
  POST   /doors/{id}/unlock     → Mở cửa thủ công
  POST   /doors/{id}/lock       → Đóng cửa thủ công
  GET    /doors/{id}/status     → Trạng thái cửa hiện tại

Access Control:
  GET    /access-rules          → Quy tắc truy cập
  POST   /access-rules          → Tạo quy tắc mới
  DELETE /access-rules/{id}     → Xoá quy tắc
  GET    /access-logs           → Nhật ký ra vào (paginated)

Reports & Monitoring:
  GET    /reports/summary       → Thống kê tổng hợp
  GET    /alerts                → Danh sách cảnh báo
  GET    /audit                 → Audit log hành động quản trị
  GET    /system-logs           → Log hệ thống

WebSocket:
  WS     /ws/recognition        → Real-time recognition events
  WS     /ws/alerts             → Real-time alert stream

─────────────────────────────────────────────

AI Service REST API

Detection:
  POST   /detection/detect      → Phát hiện khuôn mặt trong ảnh

Embedding:
  POST   /embedding/extract     → Trích xuất embedding 512-dim

Recognition:
  POST   /recognition/identify  → Detect + Extract + Search một bước

Health:
  GET    /health                → Trạng thái service + model loaded
```

---

## Phụ Lục A — Biến Môi Trường Quan Trọng

| Biến | Service | Mô Tả | Mặc Định |
|------|---------|-------|---------|
| `FACE_RECOGNITION_THRESHOLD` | Backend | Ngưỡng confidence GRANTED | `0.6` |
| `DETECTION_THRESHOLD` | AI Service | Ngưỡng phát hiện khuôn mặt | `0.5` |
| `MAX_FACE_ENROLLMENT` | Backend | Số ảnh tối đa/user | `10` |
| `CAMERA_RECONNECT_DELAY_SEC` | Device | Thời gian chờ reconnect | `5` |
| `DOOR_UNLOCK_DURATION_SEC` | Device | Thời gian mở cửa | `3` |
| `ACCESS_LOG_RETENTION_DAYS` | Backend | Lưu log bao nhiêu ngày | `90` |
| `AI_PROCESSING_FPS` | AI Service | Frame/giây gửi vào AI | `10` |
| `EMBEDDING_DIMENSION` | AI Service | Chiều vector embedding | `512` |

## Phụ Lục B — Yêu Cầu Phần Cứng Tối Thiểu

| Thành Phần | Development | Production |
|-----------|------------|-----------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| GPU | Không bắt buộc | NVIDIA ≥ 6 GB VRAM |
| Storage | 50 GB SSD | 200 GB SSD |
| Camera | USB Webcam | IP Camera RTSP |
| Network | LAN | Gigabit LAN + Fiber |

---

*Tài liệu kỹ thuật FaceGate AI — Hệ Thống Ra Vào Cửa Thông Minh*  
*© 2026 — Được duy trì bởi đội phát triển*
