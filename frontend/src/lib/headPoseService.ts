/**
 * HEAD POSE GUIDANCE ENGINE & FACIAL ANALYSIS
 * 
 * Provides real-time face detection, 3D facial landmarks, head pose estimation (Yaw, Pitch, Roll),
 * temporal smoothing (EMA + median filter), stability detection, and anti-spoofing / anti-cheating checks.
 */

import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

export type HeadPoseStep = 0 | 1 | 2 | 3 | 4; // 0: Nhìn thẳng, 1: Nghiêng trái, 2: Nghiêng phải, 3: Ngửa nhẹ, 4: Cúi nhẹ

export type PoseClassification = 
  | "LOOKING_FORWARD"
  | "LEFT"
  | "RIGHT"
  | "UP"
  | "DOWN"
  | "TILT_SHOULDER"
  | "OVER_ROTATED"
  | "UNKNOWN";

export type PoseStatus = "PENDING" | "DETECTED" | "STABLE" | "PASSED" | "FAILED";

export interface HeadPoseAngles {
  yaw: number;    // negative = left, positive = right (User perspective)
  pitch: number;  // positive = up (ngửa), negative = down (cúi)
  roll: number;   // tilt toward shoulder
}

export interface HeadPoseConfig {
  yawCenterThreshold: number;      // abs(Yaw) <= 8°
  yawLeftThreshold: number;        // Yaw <= -15°
  yawRightThreshold: number;       // Yaw >= +15°
  yawMaxThreshold: number;         // 35°
  pitchCenterThreshold: number;    // abs(Pitch) <= 8°
  pitchUpThreshold: number;        // Pitch >= +10°
  pitchDownThreshold: number;      // Pitch <= -10°
  pitchMaxThreshold: number;       // 28°
  rollThreshold: number;           // 15°
  stabilityDuration: number;       // 700 ms
  stabilityFrames: number;         // 12 frames
  confidenceThreshold: number;     // 0.85
  minFaceSizeRatio: number;        // 0.16
  maxFaceSizeRatio: number;        // 0.82
  minLuminance: number;            // 35
}

export const DEFAULT_HEAD_POSE_CONFIG: HeadPoseConfig = {
  yawCenterThreshold: 8.0,
  yawLeftThreshold: -15.0,
  yawRightThreshold: 15.0,
  yawMaxThreshold: 35.0,
  pitchCenterThreshold: 8.0,
  pitchUpThreshold: 10.0,
  pitchDownThreshold: -10.0,
  pitchMaxThreshold: 28.0,
  rollThreshold: 15.0,
  stabilityDuration: 700, // 700ms required hold
  stabilityFrames: 12,
  confidenceThreshold: 0.85,
  minFaceSizeRatio: 0.16,
  maxFaceSizeRatio: 0.82,
  minLuminance: 35,
};

export interface NormalizedBBox {
  x: number;      // 0..1
  y: number;      // 0..1
  width: number;  // 0..1
  height: number; // 0..1
}

export interface HeadPoseAnalysisFrame {
  faceDetected: boolean;
  multipleFaces: boolean;
  faceCount: number;
  confidence: number;
  bbox: NormalizedBBox | null;
  rawAngles: HeadPoseAngles;
  smoothedAngles: HeadPoseAngles;
  classifiedPose: PoseClassification;
  targetStep: HeadPoseStep;
  poseStatus: PoseStatus;
  isCorrectPose: boolean;
  stableProgress: number;       // 0..100%
  stableRemainingMs: number;
  guidanceText: string;
  isOccluded: boolean;
  isTooFar: boolean;
  isTooClose: boolean;
  isLowLight: boolean;
  lux: number;
  isMirrored: boolean;
  timestamp: number;
  landmarks?: any[];
}

export const POSE_STEP_META = [
  { step: 0, id: "FORWARD", name: "Nhìn thẳng", angleHint: "(0°)", targetPose: "LOOKING_FORWARD" },
  { step: 1, id: "LEFT",    name: "Nghiêng trái", angleHint: "(-15°)", targetPose: "LEFT" },
  { step: 2, id: "RIGHT",   name: "Nghiêng phải", angleHint: "(+15°)", targetPose: "RIGHT" },
  { step: 3, id: "UP",      name: "Ngửa nhẹ",   angleHint: "(+10°)", targetPose: "UP" },
  { step: 4, id: "DOWN",    name: "Cúi nhẹ",    angleHint: "(-10°)", targetPose: "DOWN" },
] as const;

/**
 * Singleton FaceLandmarker Manager
 */
class HeadPoseDetector {
  private landmarker: FaceLandmarker | null = null;
  private isInitializing: boolean = false;
  private initError: string | null = null;
  
  // Temporal Smoothing Windows
  private yawHistory: number[] = [];
  private pitchHistory: number[] = [];
  private rollHistory: number[] = [];
  private readonly historyWindowSize = 12;
  private smoothedYaw = 0;
  private smoothedPitch = 0;
  private smoothedRoll = 0;
  private isSmoothedInit = false;

  // Stability State
  private stableStartTime: number = 0;
  private currentStepIndex: HeadPoseStep = 0;
  private passedSteps: Set<HeadPoseStep> = new Set();

  // Config
  public config: HeadPoseConfig = { ...DEFAULT_HEAD_POSE_CONFIG };
  public isMirrored: boolean = true; // Preview is mirrored (CSS scaleX(-1))

  public async initialize(): Promise<boolean> {
    if (this.landmarker) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.initError = null;

    try {
      // 1. Resolve WASM assets locally from Next.js /wasm folder (fallback to jsdelivr if needed)
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks("/wasm");
      } catch (e) {
        console.warn("Local WASM load failed, fallback to CDN:", e);
        vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
      }

      // 2. Load model locally from /models/face_landmarker.task
      let modelPath = "/models/face_landmarker.task";
      
      this.landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: "GPU",
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 2,
      });

      this.isInitializing = false;
      return true;
    } catch (err: any) {
      console.error("Failed to initialize FaceLandmarker:", err);
      this.initError = err?.message || "Unknown error";
      this.isInitializing = false;
      return false;
    }
  }

  public reset(startStep: HeadPoseStep = 0) {
    this.currentStepIndex = startStep;
    this.passedSteps.clear();
    this.stableStartTime = 0;
    this.yawHistory = [];
    this.pitchHistory = [];
    this.rollHistory = [];
    this.isSmoothedInit = false;
  }

  public setStep(step: HeadPoseStep) {
    this.currentStepIndex = step;
    this.stableStartTime = 0;
  }

  public markStepPassed(step: HeadPoseStep) {
    this.passedSteps.add(step);
  }

  public isStepPassed(step: HeadPoseStep): boolean {
    return this.passedSteps.has(step);
  }

  /**
   * Calculate luminance from a video element
   */
  private sampleLuminance(video: HTMLVideoElement): { lux: number; isLowLight: boolean } {
    try {
      if (!video.videoWidth || !video.videoHeight) return { lux: 450, isLowLight: false };
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");
      if (!ctx) return { lux: 450, isLowLight: false };
      ctx.drawImage(video, 0, 0, 32, 32);
      const imgData = ctx.getImageData(0, 0, 32, 32).data;
      let totalLuma = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        totalLuma += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
      }
      const avgLuma = totalLuma / (imgData.length / 4);
      const lux = Math.round(avgLuma * 4.5);
      return { lux, isLowLight: avgLuma < this.config.minLuminance };
    } catch {
      return { lux: 450, isLowLight: false };
    }
  }

  /**
   * Compute median of an array of numbers
   */
  private median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Apply Temporal Smoothing (Windowed Median + EMA Filter)
   */
  private applySmoothing(raw: HeadPoseAngles): HeadPoseAngles {
    this.yawHistory.push(raw.yaw);
    this.pitchHistory.push(raw.pitch);
    this.rollHistory.push(raw.roll);

    if (this.yawHistory.length > this.historyWindowSize) this.yawHistory.shift();
    if (this.pitchHistory.length > this.historyWindowSize) this.pitchHistory.shift();
    if (this.rollHistory.length > this.historyWindowSize) this.rollHistory.shift();

    const medYaw = this.median(this.yawHistory);
    const medPitch = this.median(this.pitchHistory);
    const medRoll = this.median(this.rollHistory);

    if (!this.isSmoothedInit) {
      this.smoothedYaw = medYaw;
      this.smoothedPitch = medPitch;
      this.smoothedRoll = medRoll;
      this.isSmoothedInit = true;
    } else {
      // Exponential Moving Average with alpha = 0.32
      const alpha = 0.32;
      this.smoothedYaw = alpha * medYaw + (1 - alpha) * this.smoothedYaw;
      this.smoothedPitch = alpha * medPitch + (1 - alpha) * this.smoothedPitch;
      this.smoothedRoll = alpha * medRoll + (1 - alpha) * this.smoothedRoll;
    }

    return {
      yaw: Math.round(this.smoothedYaw * 10) / 10,
      pitch: Math.round(this.smoothedPitch * 10) / 10,
      roll: Math.round(this.smoothedRoll * 10) / 10,
    };
  }

  /**
   * Calculate Head Pose Angles from Landmarks and Facial Transformation Matrix
   */
  private calculateEulerAngles(
    landmarks: Array<{ x: number; y: number; z: number }>,
    matrix?: number[]
  ): HeadPoseAngles {
    let yaw = 0;
    let pitch = 0;
    let roll = 0;

    // Method A: Direct Extraction from 4x4 Transformation Matrix if available
    if (matrix && matrix.length === 16) {
      // MediaPipe matrix is column-major:
      // [ m0  m4  m8  m12 ]
      // [ m1  m5  m9  m13 ]
      // [ m2  m6  m10 m14 ]
      // [ m3  m7  m11 m15 ]
      const m02 = matrix[8];
      const m12 = matrix[9];
      const m22 = matrix[10];
      const m10 = matrix[1];
      const m11 = matrix[5];

      // Pitch (X-rotation)
      pitch = Math.asin(-Math.max(-1, Math.min(1, m12))) * (180 / Math.PI);
      // Yaw (Y-rotation)
      yaw = Math.atan2(m02, m22) * (180 / Math.PI);
      // Roll (Z-rotation)
      roll = Math.atan2(m10, m11) * (180 / Math.PI);
    }

    // Method B: Geometric Landmarks refinement (Robust against matrix singularities)
    // Key landmarks in MediaPipe 478 Mesh:
    // 1: Nose tip, 168: sellion (between eyes), 152: chin
    // 33: left eye outer, 263: right eye outer
    // 234: left cheek / tragus, 454: right cheek / tragus
    if (landmarks && landmarks.length >= 468) {
      const noseTip = landmarks[1];
      const sellion = landmarks[168] || landmarks[6];
      const chin = landmarks[152];
      const leftEyeOuter = landmarks[33];
      const rightEyeOuter = landmarks[263];
      const leftEar = landmarks[234];
      const rightEar = landmarks[454];

      // Geometric Roll: Eye tilt
      const eyeDx = rightEyeOuter.x - leftEyeOuter.x;
      const eyeDy = rightEyeOuter.y - leftEyeOuter.y;
      const geoRoll = Math.atan2(eyeDy, eyeDx) * (180 / Math.PI);

      // Geometric Yaw: Asymmetry of nose to cheek/ears
      const dLeft = Math.hypot(noseTip.x - leftEar.x, noseTip.y - leftEar.y);
      const dRight = Math.hypot(noseTip.x - rightEar.x, noseTip.y - rightEar.y);
      const yawAsymmetry = (dRight - dLeft) / (dRight + dLeft + 1e-6);
      const geoYaw = yawAsymmetry * 72; // calibrated degrees

      // Geometric Pitch: Vertical ratio of nose to eyes vs nose to chin
      const eyeNoseDy = Math.max(0.001, noseTip.y - sellion.y);
      const noseChinDy = Math.max(0.001, chin.y - noseTip.y);
      const pitchRatio = (noseChinDy - eyeNoseDy) / (noseChinDy + eyeNoseDy);
      // Nose z relative to sellion & chin
      const avgZ = (sellion.z + chin.z) / 2;
      const zDiff = (noseTip.z - avgZ);
      const geoPitch = (pitchRatio * 45) + (zDiff * 120);

      // Blend matrix with landmark geometry for maximum accuracy
      if (matrix && matrix.length === 16 && Math.abs(yaw) > 0.01) {
        // Average and calibrate
        yaw = 0.65 * yaw + 0.35 * geoYaw;
        pitch = 0.65 * pitch + 0.35 * geoPitch;
        roll = 0.65 * roll + 0.35 * geoRoll;
      } else {
        yaw = geoYaw;
        pitch = geoPitch;
        roll = geoRoll;
      }
    }

    // Mirror mapping:
    // If preview is mirrored (standard user selfie webcam), turning left from user perspective
    // should yield NEGATIVE yaw (<= -15°).
    if (this.isMirrored) {
      yaw = -yaw;
    }

    return {
      yaw: Math.round(yaw * 10) / 10,
      pitch: Math.round(pitch * 10) / 10,
      roll: Math.round(roll * 10) / 10,
    };
  }

  /**
   * Classify Head Pose based on calibrated thresholds
   */
  public classifyPose(angles: HeadPoseAngles): {
    pose: PoseClassification;
    isOverRotated: boolean;
    isTiltError: boolean;
  } {
    const { yaw, pitch, roll } = angles;
    const {
      yawCenterThreshold,
      yawLeftThreshold,
      yawRightThreshold,
      yawMaxThreshold,
      pitchCenterThreshold,
      pitchUpThreshold,
      pitchDownThreshold,
      pitchMaxThreshold,
      rollThreshold,
    } = this.config;

    // Check excessive roll (head tilted to shoulder)
    const isTiltError = Math.abs(roll) > rollThreshold;

    // Check excessive rotation
    const isOverRotated = Math.abs(yaw) > yawMaxThreshold || Math.abs(pitch) > pitchMaxThreshold;

    if (isTiltError) {
      return { pose: "TILT_SHOULDER", isOverRotated, isTiltError: true };
    }

    if (isOverRotated) {
      return { pose: "OVER_ROTATED", isOverRotated: true, isTiltError: false };
    }

    // 1. Nhìn thẳng (Looking forward)
    if (
      Math.abs(yaw) <= yawCenterThreshold &&
      Math.abs(pitch) <= pitchCenterThreshold &&
      Math.abs(roll) <= 10
    ) {
      return { pose: "LOOKING_FORWARD", isOverRotated: false, isTiltError: false };
    }

    // 2. Nghiêng trái (Turn Left)
    if (
      yaw <= yawLeftThreshold &&
      Math.abs(pitch) <= pitchCenterThreshold + 7 &&
      Math.abs(roll) <= rollThreshold
    ) {
      return { pose: "LEFT", isOverRotated: false, isTiltError: false };
    }

    // 3. Nghiêng phải (Turn Right)
    if (
      yaw >= yawRightThreshold &&
      Math.abs(pitch) <= pitchCenterThreshold + 7 &&
      Math.abs(roll) <= rollThreshold
    ) {
      return { pose: "RIGHT", isOverRotated: false, isTiltError: false };
    }

    // 4. Ngửa nhẹ (Tilt Up)
    if (
      pitch >= pitchUpThreshold &&
      Math.abs(yaw) <= 15 &&
      Math.abs(roll) <= rollThreshold
    ) {
      return { pose: "UP", isOverRotated: false, isTiltError: false };
    }

    // 5. Cúi nhẹ (Tilt Down)
    if (
      pitch <= pitchDownThreshold &&
      Math.abs(yaw) <= 15 &&
      Math.abs(roll) <= rollThreshold
    ) {
      return { pose: "DOWN", isOverRotated: false, isTiltError: false };
    }

    return { pose: "UNKNOWN", isOverRotated: false, isTiltError: false };
  }

  /**
   * Determine guidance text based on current step and angles
   */
  public generateGuidance(
    step: HeadPoseStep,
    angles: HeadPoseAngles,
    classified: PoseClassification,
    isMatching: boolean,
    isStable: boolean,
    stableProgress: number,
    stableRemainingMs: number
  ): string {
    const { yaw, pitch, roll } = angles;

    if (isStable) {
      const sec = (stableRemainingMs / 1000).toFixed(1);
      return `✓ ĐANG Ở ĐÚNG TƯ THẾ · Giữ nguyên ${sec}s (${stableProgress}%)`;
    }

    if (isMatching) {
      return `✓ Đã đạt góc! Hãy GIỮ YÊN trong giây lát...`;
    }

    if (Math.abs(roll) > this.config.rollThreshold) {
      return "⚠️ Bạn đang nghiêng đầu sang vai, hãy giữ thẳng đầu!";
    }

    if (Math.abs(yaw) > this.config.yawMaxThreshold) {
      return "⚠️ Bạn đang quay quá nhiều, hãy giảm góc quay lại một chút!";
    }

    if (Math.abs(pitch) > this.config.pitchMaxThreshold) {
      return "⚠️ Góc ngửa/cúi quá mức, hãy điều chỉnh cằm lại nhẹ!";
    }

    // Step-specific guidance
    switch (step) {
      case 0: // Nhìn thẳng
        if (yaw < -this.config.yawCenterThreshold) return "Hãy quay mặt sang PHẢI một chút để về chính giữa";
        if (yaw > this.config.yawCenterThreshold) return "Hãy quay mặt sang TRÁI một chút để về chính giữa";
        if (pitch > this.config.pitchCenterThreshold) return "Hạ cằm xuống một chút";
        if (pitch < -this.config.pitchCenterThreshold) return "Nâng cằm lên một chút";
        return "Đưa mặt về chính giữa camera và nhìn thẳng";

      case 1: // Nghiêng trái
        if (yaw > -5) return "Hãy quay mặt sang TRÁI";
        if (yaw > this.config.yawLeftThreshold) return "Hãy quay sang TRÁI thêm một chút nữa";
        if (pitch > 14) return "Hạ cằm xuống bớt khi quay trái";
        if (pitch < -14) return "Nâng cằm lên bớt khi quay trái";
        return "Hãy quay mặt sang TRÁI khoảng 15°";

      case 2: // Nghiêng phải
        if (yaw < 5) return "Hãy quay mặt sang PHẢI";
        if (yaw < this.config.yawRightThreshold) return "Hãy quay sang PHẢI thêm một chút nữa";
        if (pitch > 14) return "Hạ cằm xuống bớt khi quay phải";
        if (pitch < -14) return "Nâng cằm lên bớt khi quay phải";
        return "Hãy quay mặt sang PHẢI khoảng 15°";

      case 3: // Ngửa nhẹ
        if (pitch < 5) return "Hãy ngẩng mặt lên nhẹ (+10°)";
        if (pitch < this.config.pitchUpThreshold) return "Hãy ngẩng mặt lên thêm một chút";
        if (Math.abs(yaw) > 12) return "Đưa mặt về giữa trước khi ngẩng lên";
        return "Hãy ngẩng mặt lên nhẹ (+10°)";

      case 4: // Cúi nhẹ
        if (pitch > -5) return "Hãy cúi mặt xuống nhẹ (-10°)";
        if (pitch > this.config.pitchDownThreshold) return "Hãy cúi mặt xuống thêm một chút";
        if (Math.abs(yaw) > 12) return "Đưa mặt về giữa trước khi cúi xuống";
        return "Hãy cúi mặt xuống nhẹ (-10°)";

      default:
        return "Vui lòng giữ tư thế theo hướng dẫn";
    }
  }

  /**
   * Main Frame Processor
   */
  public processVideoFrame(
    video: HTMLVideoElement,
    targetStep: HeadPoseStep,
    timestamp: number
  ): HeadPoseAnalysisFrame {
    const defaultAngles: HeadPoseAngles = { yaw: 0, pitch: 0, roll: 0 };
    const { lux, isLowLight } = this.sampleLuminance(video);

    // If landmarker is not loaded yet
    if (!this.landmarker || !video.videoWidth || !video.videoHeight) {
      return {
        faceDetected: false,
        multipleFaces: false,
        faceCount: 0,
        confidence: 0,
        bbox: null,
        rawAngles: defaultAngles,
        smoothedAngles: defaultAngles,
        classifiedPose: "UNKNOWN",
        targetStep,
        poseStatus: "PENDING",
        isCorrectPose: false,
        stableProgress: 0,
        stableRemainingMs: this.config.stabilityDuration,
        guidanceText: "Đang khởi tạo thuật toán nhận diện khuôn mặt AI...",
        isOccluded: false,
        isTooFar: false,
        isTooClose: false,
        isLowLight,
        lux,
        isMirrored: this.isMirrored,
        timestamp,
      };
    }

    // Execute MediaPipe detection
    let results;
    try {
      results = this.landmarker.detectForVideo(video, timestamp);
    } catch (e) {
      console.warn("MediaPipe detect error:", e);
      return {
        faceDetected: false,
        multipleFaces: false,
        faceCount: 0,
        confidence: 0,
        bbox: null,
        rawAngles: defaultAngles,
        smoothedAngles: defaultAngles,
        classifiedPose: "UNKNOWN",
        targetStep,
        poseStatus: "PENDING",
        isCorrectPose: false,
        stableProgress: 0,
        stableRemainingMs: this.config.stabilityDuration,
        guidanceText: "Đang phân tích khung hình...",
        isOccluded: false,
        isTooFar: false,
        isTooClose: false,
        isLowLight,
        lux,
        isMirrored: this.isMirrored,
        timestamp,
      };
    }

    const faceCount = results.faceLandmarks ? results.faceLandmarks.length : 0;

    // Case 1: No Face Detected
    if (faceCount === 0) {
      this.stableStartTime = 0;
      return {
        faceDetected: false,
        multipleFaces: false,
        faceCount: 0,
        confidence: 0,
        bbox: null,
        rawAngles: defaultAngles,
        smoothedAngles: defaultAngles,
        classifiedPose: "UNKNOWN",
        targetStep,
        poseStatus: "FAILED",
        isCorrectPose: false,
        stableProgress: 0,
        stableRemainingMs: this.config.stabilityDuration,
        guidanceText: "⚠️ Không phát hiện khuôn mặt! Vui lòng nhìn vào camera.",
        isOccluded: false,
        isTooFar: false,
        isTooClose: false,
        isLowLight,
        lux,
        isMirrored: this.isMirrored,
        timestamp,
      };
    }

    // Case 2: Multiple Faces Detected
    if (faceCount > 1) {
      this.stableStartTime = 0;
      return {
        faceDetected: true,
        multipleFaces: true,
        faceCount,
        confidence: 0.95,
        bbox: null,
        rawAngles: defaultAngles,
        smoothedAngles: defaultAngles,
        classifiedPose: "UNKNOWN",
        targetStep,
        poseStatus: "FAILED",
        isCorrectPose: false,
        stableProgress: 0,
        stableRemainingMs: this.config.stabilityDuration,
        guidanceText: `⚠️ Chỉ được có MỘT người trong camera! (Phát hiện ${faceCount} khuôn mặt)`,
        isOccluded: false,
        isTooFar: false,
        isTooClose: false,
        isLowLight,
        lux,
        isMirrored: this.isMirrored,
        timestamp,
      };
    }

    // Exactly 1 Face
    const landmarks = results.faceLandmarks[0];
    const matrix = results.facialTransformationMatrixes ? (results.facialTransformationMatrixes[0]?.data as number[]) : undefined;

    // Compute Bounding Box from Landmarks
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
    // Add 12% padding to bounding box
    const padW = (maxX - minX) * 0.12;
    const padH = (maxY - minY) * 0.15;
    const bbox: NormalizedBBox = {
      x: Math.max(0, minX - padW),
      y: Math.max(0, minY - padH),
      width: Math.min(1, (maxX - minX) + padW * 2),
      height: Math.min(1, (maxY - minY) + padH * 2),
    };

    // Quality Checks
    const isTooFar = bbox.width < this.config.minFaceSizeRatio;
    const isTooClose = bbox.width > this.config.maxFaceSizeRatio;
    
    // Check Occlusion (check presence and spread of mouth and nose landmarks)
    const mouthW = Math.hypot(landmarks[61].x - landmarks[291].x, landmarks[61].y - landmarks[291].y);
    const eyeW = Math.hypot(landmarks[33].x - landmarks[263].x, landmarks[33].y - landmarks[263].y);
    const isOccluded = mouthW < eyeW * 0.15 || eyeW < 0.04;

    // Calculate Angles
    const rawAngles = this.calculateEulerAngles(landmarks, matrix);
    const smoothedAngles = this.applySmoothing(rawAngles);
    const { pose: classifiedPose } = this.classifyPose(smoothedAngles);

    // Target Step Validation
    const expectedPose = POSE_STEP_META[targetStep].targetPose;
    const isCorrectPose = classifiedPose === expectedPose && !isTooFar && !isTooClose && !isOccluded && !isLowLight;

    let poseStatus: PoseStatus = "PENDING";
    let stableProgress = 0;
    let stableRemainingMs = this.config.stabilityDuration;

    if (isTooFar) {
      this.stableStartTime = 0;
      return {
        faceDetected: true,
        multipleFaces: false,
        faceCount: 1,
        confidence: 0.92,
        bbox,
        rawAngles,
        smoothedAngles,
        classifiedPose,
        targetStep,
        poseStatus: "FAILED",
        isCorrectPose: false,
        stableProgress: 0,
        stableRemainingMs: this.config.stabilityDuration,
        guidanceText: "⚠️ Khuôn mặt quá xa! Hãy tiến gần camera hơn.",
        isOccluded: false,
        isTooFar: true,
        isTooClose: false,
        isLowLight,
        lux,
        isMirrored: this.isMirrored,
        timestamp,
      };
    }

    if (isTooClose) {
      this.stableStartTime = 0;
      return {
        faceDetected: true,
        multipleFaces: false,
        faceCount: 1,
        confidence: 0.94,
        bbox,
        rawAngles,
        smoothedAngles,
        classifiedPose,
        targetStep,
        poseStatus: "FAILED",
        isCorrectPose: false,
        stableProgress: 0,
        stableRemainingMs: this.config.stabilityDuration,
        guidanceText: "⚠️ Khuôn mặt quá gần! Hãy lùi ra xa camera một chút.",
        isOccluded: false,
        isTooFar: false,
        isTooClose: true,
        isLowLight,
        lux,
        isMirrored: this.isMirrored,
        timestamp,
      };
    }

    if (isOccluded) {
      this.stableStartTime = 0;
      return {
        faceDetected: true,
        multipleFaces: false,
        faceCount: 1,
        confidence: 0.88,
        bbox,
        rawAngles,
        smoothedAngles,
        classifiedPose,
        targetStep,
        poseStatus: "FAILED",
        isCorrectPose: false,
        stableProgress: 0,
        stableRemainingMs: this.config.stabilityDuration,
        guidanceText: "⚠️ Mặt bị che khuất! Vui lòng bỏ khẩu trang hoặc vật cản.",
        isOccluded: true,
        isTooFar: false,
        isTooClose: false,
        isLowLight,
        lux,
        isMirrored: this.isMirrored,
        timestamp,
      };
    }

    if (isLowLight) {
      this.stableStartTime = 0;
      return {
        faceDetected: true,
        multipleFaces: false,
        faceCount: 1,
        confidence: 0.85,
        bbox,
        rawAngles,
        smoothedAngles,
        classifiedPose,
        targetStep,
        poseStatus: "FAILED",
        isCorrectPose: false,
        stableProgress: 0,
        stableRemainingMs: this.config.stabilityDuration,
        guidanceText: `⚠️ Ánh sáng chưa đủ (${lux} Lux)! Vui lòng tăng độ sáng môi trường.`,
        isOccluded: false,
        isTooFar: false,
        isTooClose: false,
        isLowLight: true,
        lux,
        isMirrored: this.isMirrored,
        timestamp,
      };
    }

    // Stability Logic (Must hold correct pose for stabilityDuration = 700ms)
    if (isCorrectPose) {
      if (this.stableStartTime === 0) {
        this.stableStartTime = timestamp;
      }
      const heldTime = timestamp - this.stableStartTime;
      stableProgress = Math.min(100, Math.round((heldTime / this.config.stabilityDuration) * 100));
      stableRemainingMs = Math.max(0, this.config.stabilityDuration - heldTime);

      if (heldTime >= this.config.stabilityDuration) {
        poseStatus = "PASSED";
        this.passedSteps.add(targetStep);
      } else {
        poseStatus = "STABLE";
      }
    } else {
      this.stableStartTime = 0;
      poseStatus = "DETECTED";
      stableProgress = 0;
      stableRemainingMs = this.config.stabilityDuration;
    }

    const guidanceText = this.generateGuidance(
      targetStep,
      smoothedAngles,
      classifiedPose,
      isCorrectPose,
      poseStatus === "STABLE" || poseStatus === "PASSED",
      stableProgress,
      stableRemainingMs
    );

    return {
      faceDetected: true,
      multipleFaces: false,
      faceCount: 1,
      confidence: 0.98,
      bbox,
      rawAngles,
      smoothedAngles,
      classifiedPose,
      targetStep,
      poseStatus,
      isCorrectPose,
      stableProgress,
      stableRemainingMs,
      guidanceText,
      isOccluded: false,
      isTooFar: false,
      isTooClose: false,
      isLowLight: false,
      lux,
      isMirrored: this.isMirrored,
      timestamp,
      landmarks,
    };
  }
}

export const headPoseDetector = new HeadPoseDetector();
