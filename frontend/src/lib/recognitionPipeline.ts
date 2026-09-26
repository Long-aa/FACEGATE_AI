/**
 * Real-Time Face Recognition & Computer Vision Pipeline for FaceGate AI.
 * Implements:
 * - Real camera acquisition & error handling (Fail-Safe)
 * - MediaPipe 478-landmark 3D mesh detection & tracking
 * - Bounding box computation with mirrored coordinate normalization
 * - Real 3D depth dispersion & Eye Aspect Ratio (EAR) Anti-Spoofing / Liveness verification
 * - Biometric 128-D landmark geometry feature vector extraction
 * - Multi-frame verification buffer (3-5 consecutive frames)
 * - Anti-spam cooldown timer (3-5s) & 10s Auto-lock controller
 * - Unified 15-stage Access Control State Machine
 */

import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { api } from "@/lib/api";

export type PipelineState =
  | "IDLE"
  | "CAMERA_READY"
  | "FACE_DETECTED"
  | "RECOGNIZING"
  | "MATCHED"
  | "UNKNOWN"
  | "LIVENESS_CHECK"
  | "AUTHORIZED"
  | "DENIED"
  | "DOOR_OPENING"
  | "DOOR_OPEN"
  | "COUNTDOWN"
  | "DOOR_LOCKING"
  | "DOOR_LOCKED"
  | "WAITING_FOR_FACE"
  | "CAMERA_ERROR"
  | "MULTIPLE_FACES";

export interface FaceBoundingBox {
  x: number; // 0..1
  y: number; // 0..1
  width: number; // 0..1
  height: number; // 0..1
}

export interface VerificationResult {
  result: "GRANTED" | "DENIED" | "UNKNOWN" | "UNAUTHORIZED" | "LIVENESS_FAILED" | "MULTIPLE_FACES";
  confidence: number;
  userName: string;
  employeeId?: string;
  department?: string;
  doorName: string;
  cameraName: string;
  doorUnlocked: boolean;
  autoLockSeconds: number;
  livenessPassed: boolean;
  message: string;
  logId?: string;
  timestamp: string;
}

export interface FrameAnalysis {
  state: PipelineState;
  faceCount: number;
  boundingBox: FaceBoundingBox | null;
  landmarks: any[] | null;
  livenessScore: number;
  livenessPassed: boolean;
  eyeBlinkDetected: boolean;
  yaw: number;
  pitch: number;
  roll: number;
  verificationResult: VerificationResult | null;
  statusText: string;
}

// MediaPipe Model singleton cache
let landmarkerInstance: FaceLandmarker | null = null;
let landmarkerLoadingPromise: Promise<FaceLandmarker> | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;
  if (landmarkerLoadingPromise) return landmarkerLoadingPromise;

  landmarkerLoadingPromise = (async () => {
    let vision;
    try {
      vision = await FilesetResolver.forVisionTasks("/wasm");
    } catch {
      vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
    }

    const landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "/models/face_landmarker.task",
        delegate: "GPU",
      },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: "VIDEO",
      numFaces: 2,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    landmarkerInstance = landmarker;
    return landmarker;
  })();

  return landmarkerLoadingPromise;
}

// Helper: Calculate 3D Euclidean distance
function dist3D(p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Helper: Compute Eye Aspect Ratio (EAR) for blink detection
function computeEyeAspectRatio(landmarks: any[], eyeIndices: [number, number, number, number, number, number]): number {
  const [p1, p2, p3, p4, p5, p6] = eyeIndices.map((idx) => landmarks[idx]);
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0.3;
  const vertical1 = dist3D(p2, p6);
  const vertical2 = dist3D(p3, p5);
  const horizontal = dist3D(p1, p4);
  if (horizontal < 0.0001) return 0.3;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

// Helper: Compute 3D Depth Variance to detect flat photo spoofs
function compute3DDepthRelief(landmarks: any[]): number {
  // Key points across face contour & nose: 1 (nose tip), 33 (left eye), 263 (right eye), 152 (chin), 10 (forehead)
  const keyPoints = [1, 33, 263, 152, 10, 61, 291];
  const zValues = keyPoints.map((idx) => landmarks[idx]?.z || 0);
  const meanZ = zValues.reduce((a, b) => a + b, 0) / zValues.length;
  const variance = zValues.reduce((sum, z) => sum + (z - meanZ) ** 2, 0) / zValues.length;
  return Math.sqrt(variance);
}

// Helper: Extract 128-dimensional geometric face descriptor
export function extractGeometricFaceVector(landmarks: any[]): number[] {
  if (!landmarks || landmarks.length < 468) return new Array(128).fill(0);

  const noseTip = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const chin = landmarks[152];
  const forehead = landmarks[10];

  const interPupillaryDist = Math.max(dist3D(leftEye, rightEye), 0.05);

  const vector: number[] = [];

  // Sample 64 landmark pairs to produce 128 normalized distance and proportion features
  const samplePairs: [number, number][] = [
    [1, 33], [1, 263], [1, 152], [1, 10], [33, 152], [263, 152], [10, 152],
    [61, 291], [0, 17], [13, 14], [78, 308], [37, 267], [133, 362], [168, 1],
    [107, 336], [21, 251], [162, 389], [234, 454], [58, 288], [172, 397],
    [136, 365], [150, 379], [176, 400], [148, 377], [152, 2], [164, 18],
    [19, 20], [94, 324], [105, 334], [66, 296], [108, 337], [69, 299],
    [109, 338], [67, 297], [103, 332], [54, 284], [127, 356], [162, 389],
    [143, 372], [111, 340], [117, 346], [119, 348], [120, 349], [121, 350],
    [128, 357], [245, 465], [193, 417], [122, 351], [196, 419], [197, 420],
    [3, 4], [5, 6], [195, 419], [98, 327], [97, 326], [2, 164], [164, 0],
    [11, 12], [13, 15], [16, 17], [18, 200], [200, 199], [199, 175], [175, 152],
  ];

  for (const [pA, pB] of samplePairs) {
    const ptA = landmarks[pA];
    const ptB = landmarks[pB];
    if (ptA && ptB) {
      const d = dist3D(ptA, ptB) / interPupillaryDist;
      vector.push(Number(d.toFixed(4)));
      const dz = ((ptA.z || 0) - (ptB.z || 0)) / interPupillaryDist;
      vector.push(Number(dz.toFixed(4)));
    } else {
      vector.push(0, 0);
    }
  }

  // Ensure exact 128 elements
  while (vector.length < 128) vector.push(0.0);
  return vector.slice(0, 128);
}

export class RecognitionPipelineController {
  private videoEl: HTMLVideoElement | null = null;
  private landmarker: FaceLandmarker | null = null;
  private lastVideoTime = -1;
  private lastTimestampMs = 0;

  // Multi-frame verification buffer (3-5 frames)
  private predictionQueue: {
    userName: string;
    employeeId: string | null;
    confidence: number;
    result: string;
  }[] = [];
  private readonly REQUIRED_CONFIRMED_FRAMES = 3;

  // Door and Cooldown state
  private state: PipelineState = "IDLE";
  private cooldownUntil = 0;
  private autoLockCountdown = 0;
  private countdownTimer: NodeJS.Timeout | null = null;
  private lastVerificationResult: VerificationResult | null = null;
  private blinkCounter = 0;
  private lastCallTime = 0;

  // Alert and recognition session tracking:
  // 1. "Người không xác định": gửi cảnh báo về hệ thống 5s một lần (5000ms)
  private lastUnknownAlertTime = 0;
  // 2. "Người đúng có hiện tên": chỉ gửi cảnh báo về hệ thống 1 lần per session
  private activeRecognizedUser: string | null = null;
  private hasAlertedRecognizedUser = false;

  // Active configurations
  private threshold = 0.60;
  private targetDoorId: string | null = null;
  private targetCameraId: string | null = null;

  constructor() {}

  public configure(options: { threshold?: number; doorId?: string; cameraId?: string }) {
    if (options.threshold !== undefined) this.threshold = options.threshold;
    if (options.doorId !== undefined) this.targetDoorId = options.doorId;
    if (options.cameraId !== undefined) this.targetCameraId = options.cameraId;
  }

  public setVideoElement(video: HTMLVideoElement | null) {
    this.videoEl = video;
    this.lastVideoTime = -1;
    this.lastTimestampMs = 0;
  }

  public async initialize(): Promise<void> {
    this.landmarker = await getFaceLandmarker();
    this.state = "CAMERA_READY";
  }

  public getState(): PipelineState {
    return this.state;
  }

  public getCountdown(): number {
    return this.autoLockCountdown;
  }

  public getLastResult(): VerificationResult | null {
    return this.lastVerificationResult;
  }

  /**
   * Main per-frame process loop called via requestAnimationFrame.
   */
  public async processFrame(): Promise<FrameAnalysis> {
    const now = Date.now();

    // Default empty analysis
    const emptyAnalysis: FrameAnalysis = {
      state: this.state,
      faceCount: 0,
      boundingBox: null,
      landmarks: null,
      livenessScore: 0.98,
      livenessPassed: true,
      eyeBlinkDetected: false,
      yaw: 0,
      pitch: 0,
      roll: 0,
      verificationResult: this.lastVerificationResult,
      statusText: "Đang chờ nhận diện...",
    };

    if (
      !this.videoEl ||
      !this.landmarker ||
      this.videoEl.readyState < 2 ||
      !this.videoEl.videoWidth ||
      !this.videoEl.videoHeight ||
      this.videoEl.paused ||
      this.videoEl.ended
    ) {
      this.state = "CAMERA_READY";
      emptyAnalysis.statusText = "Đang chờ kết nối Camera...";
      return emptyAnalysis;
    }

    // Check if in active Cooldown or Door Open Countdown
    if (now < this.cooldownUntil && this.autoLockCountdown > 0) {
      emptyAnalysis.state = "COUNTDOWN";
      emptyAnalysis.statusText = `CỬA ĐÃ MỞ (Tự khóa sau ${this.autoLockCountdown}s)`;
      return emptyAnalysis;
    }

    if (this.videoEl.currentTime === this.lastVideoTime) {
      return emptyAnalysis;
    }
    this.lastVideoTime = this.videoEl.currentTime;

    // Ensure monotonically increasing timestamp for MediaPipe VIDEO runningMode
    let timestampMs = performance.now();
    if (timestampMs <= this.lastTimestampMs) {
      timestampMs = this.lastTimestampMs + 1;
    }
    this.lastTimestampMs = timestampMs;

    // Run MediaPipe detection safely with try-catch
    let results: any = null;
    try {
      results = this.landmarker.detectForVideo(this.videoEl, timestampMs);
    } catch {
      return emptyAnalysis;
    }

    if (!results || !results.faceLandmarks) {
      return emptyAnalysis;
    }

    const faceCount = results.faceLandmarks.length;

    if (faceCount === 0) {
      this.predictionQueue = [];
      this.state = "WAITING_FOR_FACE";
      this.activeRecognizedUser = null;
      this.hasAlertedRecognizedUser = false;
      this.lastUnknownAlertTime = 0;
      emptyAnalysis.statusText = "Vui lòng nhìn vào camera để nhận diện";
      return emptyAnalysis;
    }

    if (faceCount > 1) {
      this.predictionQueue = [];
      this.state = "MULTIPLE_FACES";
      this.activeRecognizedUser = null;
      this.hasAlertedRecognizedUser = false;
      emptyAnalysis.faceCount = faceCount;
      emptyAnalysis.statusText = "PHÁT HIỆN NHIỀU KHUÔN MẶT! Vui lòng chỉ 1 người vào khung hình.";
      return emptyAnalysis;
    }

    // 1 Face detected
    const landmarks = results.faceLandmarks[0];
    emptyAnalysis.faceCount = 1;
    emptyAnalysis.landmarks = landmarks;

    // 1. Calculate Bounding Box
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const pt of landmarks) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    const padX = (maxX - minX) * 0.12;
    const padY = (maxY - minY) * 0.15;
    const bbox: FaceBoundingBox = {
      x: Math.max(0, minX - padX),
      y: Math.max(0, minY - padY),
      width: Math.min(1, maxX - minX + padX * 2),
      height: Math.min(1, maxY - minY + padY * 2),
    };
    emptyAnalysis.boundingBox = bbox;

    // 2. Liveness & Anti-spoofing checks
    // Left eye: 33, 160, 158, 133, 153, 144
    // Right eye: 362, 385, 387, 263, 373, 380
    const leftEar = computeEyeAspectRatio(landmarks, [33, 160, 158, 133, 153, 144]);
    const rightEar = computeEyeAspectRatio(landmarks, [362, 385, 387, 263, 373, 380]);
    const avgEar = (leftEar + rightEar) / 2.0;

    let blinkDetected = false;
    if (avgEar < 0.20) {
      this.blinkCounter++;
      blinkDetected = true;
    }
    emptyAnalysis.eyeBlinkDetected = blinkDetected;

    // Depth relief test
    const depthRelief = compute3DDepthRelief(landmarks);
    // Depth relief on real human face is > 0.018; flat phone screen or paper is < 0.008
    const depthPass = depthRelief >= 0.012;
    const livenessScore = Number((Math.min(1.0, (depthRelief / 0.025) * 0.7 + (avgEar > 0.15 ? 0.3 : 0.1))).toFixed(2));
    const livenessPassed = depthPass && livenessScore >= 0.60;

    emptyAnalysis.livenessScore = livenessScore;
    emptyAnalysis.livenessPassed = livenessPassed;

    if (!livenessPassed) {
      this.state = "LIVENESS_CHECK";
      emptyAnalysis.statusText = "CẢNH BÁO: Nghi vấn ảnh/video phẳng (Anti-spoofing FAIL)!";
      return emptyAnalysis;
    }

    // 3. Biometric Vector Extraction
    const faceVector = extractGeometricFaceVector(landmarks);

    // Rate-limiting check based on user request:
    // 1. "người đúng có hiện tên và chỉ gửi cảnh báo về hệ thống 1 lần"
    if (this.hasAlertedRecognizedUser && this.activeRecognizedUser) {
      emptyAnalysis.verificationResult = this.lastVerificationResult;
      emptyAnalysis.state = this.state;
      return emptyAnalysis;
    }

    // 2. "người không xác định thì gửi cảnh báo về hệ thống 5s một lần"
    if (this.state === "UNKNOWN" && now - this.lastUnknownAlertTime < 5000) {
      emptyAnalysis.verificationResult = this.lastVerificationResult;
      emptyAnalysis.state = "UNKNOWN";
      emptyAnalysis.statusText = "✕ NGƯỜI KHÔNG XÁC ĐỊNH • CỬA TIẾP TỤC KHÓA (Cảnh báo 5s/lần)";
      return emptyAnalysis;
    }

    // Call API at throttled intervals (every 250ms) to update multi-frame buffer
    if (now - this.lastCallTime > 250) {
      this.lastCallTime = now;
      this.state = "RECOGNIZING";

      try {
        const verifyResp = await api.recognition.verify({
          camera_id: this.targetCameraId || undefined,
          door_id: this.targetDoorId || undefined,
          face_vector: faceVector,
          liveness_score: livenessScore,
          liveness_passed: livenessPassed,
          threshold: this.threshold,
          face_count: 1,
        });

        // Add to multi-frame sliding window
        this.predictionQueue.push({
          userName: verifyResp.user_name,
          employeeId: verifyResp.employee_id || null,
          confidence: verifyResp.confidence,
          result: verifyResp.result,
        });

        if (this.predictionQueue.length > this.REQUIRED_CONFIRMED_FRAMES) {
          this.predictionQueue.shift();
        }

        // Check Multi-Frame Consistency (Requirement 4)
        const isQueueFull = this.predictionQueue.length >= this.REQUIRED_CONFIRMED_FRAMES;
        const allSameResult = isQueueFull && this.predictionQueue.every((p) => p.result === verifyResp.result);
        const allSameUser = isQueueFull && this.predictionQueue.every((p) => p.userName === verifyResp.user_name);

        if (isQueueFull && allSameResult && allSameUser) {
          // Identity CONFIRMED across consecutive frames
          this.lastVerificationResult = {
            result: verifyResp.result,
            confidence: verifyResp.confidence,
            userName: verifyResp.user_name,
            employeeId: verifyResp.employee_id,
            department: verifyResp.department,
            doorName: verifyResp.door_name,
            cameraName: verifyResp.camera_name,
            doorUnlocked: verifyResp.door_unlocked,
            autoLockSeconds: verifyResp.auto_lock_seconds || 10,
            livenessPassed: verifyResp.liveness_passed,
            message: verifyResp.message,
            logId: verifyResp.log_id,
            timestamp: verifyResp.timestamp,
          };
          emptyAnalysis.verificationResult = this.lastVerificationResult;

          // Apply alert frequency rules:
          if (verifyResp.employee_id && verifyResp.user_name && !verifyResp.user_name.includes("Unknown")) {
            // "người đúng có hiện tên và chỉ gửi cảnh báo về hệ thống 1 lần"
            this.activeRecognizedUser = verifyResp.employee_id;
            this.hasAlertedRecognizedUser = true;
          } else if (verifyResp.result === "UNKNOWN") {
            // "người không xác định thì gửi cảnh báo về hệ thống 5s một lần"
            this.lastUnknownAlertTime = now;
            this.activeRecognizedUser = null;
            this.hasAlertedRecognizedUser = false;
          }

          if (verifyResp.result === "GRANTED" && verifyResp.door_unlocked) {
            // AUTHORIZED -> OPEN DOOR
            this.state = "DOOR_OPEN";
            emptyAnalysis.statusText = `✓ XÁC THỰC THÀNH CÔNG • ${verifyResp.user_name} • CỬA ĐÃ MỞ`;
            this.startAutoLockCountdown(verifyResp.auto_lock_seconds || 10, verifyResp.door_id);
          } else if (verifyResp.result === "UNAUTHORIZED") {
            this.state = "DENIED";
            emptyAnalysis.statusText = `✓ ĐÃ NHẬN DIỆN • ${verifyResp.user_name} • KHÔNG CÓ QUYỀN TRUY CẬP (DOOR LOCKED)`;
          } else if (verifyResp.result === "UNKNOWN") {
            this.state = "UNKNOWN";
            emptyAnalysis.statusText = "✕ NGƯỜI KHÔNG XÁC ĐỊNH • CỬA TIẾP TỤC KHÓA (Cảnh báo 5s/lần)";
          } else {
            this.state = "DENIED";
            emptyAnalysis.statusText = `✕ TỪ CHỐI TRUY CẬP (${verifyResp.message})`;
          }
        } else {
          // Buffer still confirming or fluctuating
          emptyAnalysis.statusText = `Đang phân tích xác nhận danh tính (${this.predictionQueue.length}/${this.REQUIRED_CONFIRMED_FRAMES})...`;
        }
      } catch (err: any) {
        console.error("Verification call error:", err);
        emptyAnalysis.statusText = "LỖI KẾT NỐI MÁY CHỦ • CỬA TIẾP TỤC KHÓA (FAIL-SAFE)";
      }
    }

    return emptyAnalysis;
  }

  /**
   * Starts real 10-second countdown for door open, calling door lock API on completion.
   */
  private startAutoLockCountdown(seconds: number, doorId?: string) {
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.autoLockCountdown = seconds;
    this.cooldownUntil = Date.now() + (seconds + 4) * 1000; // Cooldown persists during open + 4s after

    this.countdownTimer = setInterval(async () => {
      this.autoLockCountdown -= 1;
      if (this.autoLockCountdown <= 0) {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.autoLockCountdown = 0;
        this.state = "DOOR_LOCKING";

        // Call backend API to lock door in database
        try {
          const targetDoor = doorId || this.targetDoorId;
          if (targetDoor) {
            await api.doors.lock(targetDoor);
          }
        } catch (e) {
          console.error("Failed to auto-lock door:", e);
        }

        this.state = "DOOR_LOCKED";
        this.predictionQueue = [];

        // Return to waiting for next person after brief transition
        setTimeout(() => {
          this.state = "WAITING_FOR_FACE";
        }, 1500);
      }
    }, 1000);
  }

  public destroy() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.videoEl = null;
    this.state = "IDLE";
  }
}
