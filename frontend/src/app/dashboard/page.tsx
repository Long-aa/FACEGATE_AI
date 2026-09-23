"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Mock Data
// ─────────────────────────────────────────────────────────────────────────────
interface StatCard {
  id: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  label: string;
  value: number;
  suffix?: string;
  subtext: string;
  accent: string;
}

interface CameraOption {
  id: string;
  name: string;
  location: string;
  rtsp: string;
  isWebcam?: boolean;
}

const DEFAULT_CAMERAS: CameraOption[] = [
  { id: "cam-01", name: "Camera 01 – Cửa chính", location: "Lobby chính", rtsp: "RTSP: Main Gate Flap Barrier" },
  { id: "cam-02", name: "Camera 02 – Cổng phụ Lobby", location: "Lối phụ tầng 1", rtsp: "RTSP: Side Entrance Turnstile" },
  { id: "cam-03", name: "Camera 03 – Hầm gửi xe B1", location: "Khu vực Barrier B1", rtsp: "RTSP: Basement Barrier Gate" },
  { id: "cam-04", name: "Camera 04 – Phòng Server", location: "Khu vực Server Data", rtsp: "RTSP: Server High-Sec Room" },
  { id: "cam-webcam", name: "📷 Webcam Máy Tính (Live Test)", location: "Camera Thiết Bị", rtsp: "WebRTC: Local Media Stream", isWebcam: true },
];

interface AccessLogItem {
  id: string;
  time: string;
  initials: string;
  name: string;
  code: string;
  checkpoint: string;
  confidence: number;
  status: "GRANTED" | "DENIED";
  color: string;
}

const INITIAL_LOGS: AccessLogItem[] = [
  {
    id: "log-1",
    time: "10:45:22",
    initials: "NA",
    name: "Nguyễn Văn An",
    code: "EMP-2045",
    checkpoint: "Camera 01 - Cửa chính",
    confidence: 96.8,
    status: "GRANTED",
    color: "#00D4AA",
  },
  {
    id: "log-2",
    time: "10:42:15",
    initials: "TB",
    name: "Trần Thị B",
    code: "EMP-2012",
    checkpoint: "Camera 01 - Cửa chính",
    confidence: 94.2,
    status: "GRANTED",
    color: "#38BDF8",
  },
  {
    id: "log-3",
    time: "10:38:05",
    initials: "?",
    name: "Unknown (Chưa xác định)",
    code: "Không có dữ liệu",
    checkpoint: "Camera 01 - Cửa chính",
    confidence: 41.3,
    status: "DENIED",
    color: "#EF4444",
  },
  {
    id: "log-4",
    time: "10:30:00",
    initials: "LC",
    name: "Lê Văn C",
    code: "EMP-2090",
    checkpoint: "Camera 02 - Kho kỹ thuật",
    confidence: 98.1,
    status: "GRANTED",
    color: "#3B82F6",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Animated Counter Hook
// ─────────────────────────────────────────────────────────────────────────────
function useCounter(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setCount(Math.floor(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card Item
// ─────────────────────────────────────────────────────────────────────────────
function StatCardItem({ card, delay }: { card: StatCard; delay: number }) {
  const count = useCounter(card.value);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered
          ? "linear-gradient(135deg, rgba(22, 33, 56, 0.7) 0%, rgba(13, 20, 36, 0.85) 100%)"
          : "rgba(13, 20, 36, 0.65)",
        border: `1px solid ${isHovered ? "rgba(0, 212, 170, 0.35)" : "rgba(255, 255, 255, 0.07)"}`,
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 104,
        position: "relative",
        overflow: "hidden",
        boxShadow: isHovered ? "0 8px 25px -8px rgba(0, 212, 170, 0.2)" : "none",
        transition: "all 0.22s ease",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        animation: `fadeInUp 0.4s ease ${delay}ms both`,
      }}
    >
      {/* Top row: Icon + Badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: `${card.accent}18`,
            border: `1px solid ${card.accent}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: card.accent,
          }}
        >
          {card.icon}
        </div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: card.badgeColor,
            background: card.badgeBg,
            padding: "2px 7px",
            borderRadius: 5,
            border: `1px solid ${card.badgeColor}33`,
            letterSpacing: "0.02em",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          {card.badge}
        </div>
      </div>

      {/* Label */}
      <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500, marginBottom: 2 }}>
        {card.label}
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 2 }}>
        <span
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#F8FAFC",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            fontFamily: "var(--font-sans, inherit)",
          }}
        >
          {card.id === "alerts" ? String(count).padStart(2, "0") : count.toLocaleString("vi-VN")}
        </span>
        {card.suffix && (
          <span style={{ fontSize: 16, fontWeight: 700, color: "#94A3B8" }}>
            {card.suffix}
          </span>
        )}
      </div>

      {/* Subtext */}
      <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 400 }}>
        {card.subtext}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  // Real-time Clock for HUD
  const [hudTime, setHudTime] = useState("");
  const [latency, setLatency] = useState(32);
  const [fps, setFps] = useState(30);

  // Real Database Data States
  const [stats, setStats] = useState<any>({
    total_users: 6,
    today_access_count: 60,
    granted_count: 52,
    denied_count: 8,
    active_cameras: 6,
    total_cameras: 6,
    unresolved_alerts: 11,
    success_rate: 86.7,
  });

  const [aiEngine, setAiEngine] = useState<any>({
    opencv_version: "4.8.0",
    face_model: "dlib_face_recognition_resnet_v1 (512D)",
    cameras_online: 6,
    cameras_total: 6,
    processing_fps: 30,
    avg_confidence: 94.6,
    processing_time_ms: 45,
    inference_load: 38,
    frame_buffer_load: 18,
    is_online: true,
  });

  const [availableCams, setAvailableCams] = useState<CameraOption[]>(DEFAULT_CAMERAS);
  const [selectedCam, setSelectedCam] = useState<CameraOption>(DEFAULT_CAMERAS[0]);
  const [camMenuOpen, setCamMenuOpen] = useState(false);
  const [faceThreshold, setFaceThreshold] = useState(0.6);
  const [antiSpoofing, setAntiSpoofing] = useState(true);
  const [flashActive, setFlashActive] = useState(false);

  // Doors state from DB
  const [doors, setDoors] = useState<any[]>([]);
  const [activeDoor, setActiveDoor] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [doorTimer, setDoorTimer] = useState(8);
  const [isDoorOperating, setIsDoorOperating] = useState(false);

  // Alerts from DB
  const [alerts, setAlerts] = useState<any[]>([]);

  // Snapshot modal/preview
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  // Notification Toast
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState({
    name: "Quản trị viên",
    location: "Cửa chính Lobby A",
    time: "10:45:22",
  });

  // Access Analytics time range filter
  const [analyticsRange, setAnalyticsRange] = useState<"today" | "7days" | "30days">("today");

  // Recent Logs from DB
  const [recentLogs, setRecentLogs] = useState<AccessLogItem[]>([]);

  // Security alert action status
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  // Webcam stream reference
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Fetch real data from backend API
  const fetchAllData = useCallback(async () => {
    try {
      const [statsData, logsData, aiData, camerasData, doorsData, alertsData] = await Promise.all([
        api.dashboard.getStats(),
        api.dashboard.getRecentLogs(5),
        api.dashboard.getAiEngine(),
        api.cameras.list(),
        api.doors.list(),
        api.alerts.list({ limit: 3, status: "UNRESOLVED" }),
      ]);

      if (statsData) setStats(statsData);
      if (aiData) setAiEngine(aiData);

      if (logsData && logsData.length > 0) {
        setRecentLogs(
          logsData.map((l: any) => ({
            id: l.id,
            time: l.time || new Date(l.created_at).toLocaleTimeString("vi-VN"),
            initials: l.initials || l.name?.split(" ").map((n: string) => n[0]).slice(-2).join("") || "?",
            name: l.name || "Unknown",
            code: l.user_code || "--",
            checkpoint: l.checkpoint || l.door_name || "Cửa chính",
            confidence: l.confidence || 0,
            status: l.status === "GRANTED" ? "GRANTED" : "DENIED",
            color: l.color || (l.status === "GRANTED" ? "#00D4AA" : "#EF4444"),
          }))
        );
      }

      if (doorsData && doorsData.length > 0) {
        setDoors(doorsData);
        const mainDoor = doorsData.find((d: any) => d.name?.includes("chính") || d.door_code?.includes("MAIN")) || doorsData[0];
        setActiveDoor(mainDoor);
        setIsLocked(mainDoor.status === "LOCKED");
      }

      if (camerasData && camerasData.length > 0) {
        const mappedCams: CameraOption[] = camerasData.map((c: any) => ({
          id: c.id,
          name: c.name,
          location: c.location || "Khu vực toà nhà",
          rtsp: c.stream_url || `RTSP: ${c.name}`,
          isWebcam: false,
        }));
        mappedCams.push({
          id: "cam-webcam",
          name: "📷 Webcam Máy Tính (Live Test)",
          location: "Camera Thiết Bị",
          rtsp: "WebRTC: Local Media Stream",
          isWebcam: true,
        });
        setAvailableCams(mappedCams);
        if (!selectedCam || selectedCam.id === DEFAULT_CAMERAS[0].id) {
          setSelectedCam(mappedCams[0]);
        }
      }

      if (alertsData) {
        const rawAlerts = Array.isArray(alertsData)
          ? alertsData
          : Array.isArray(alertsData.items)
          ? alertsData.items
          : [];
        setAlerts(rawAlerts);
      }
    } catch (err) {
      console.error("Dashboard failed to load from API:", err);
    }
  }, [selectedCam]);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // 1. Clock and telemetry interval
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, "0");
      const da = String(now.getDate()).padStart(2, "0");
      const hr = String(now.getHours()).padStart(2, "0");
      const mi = String(now.getMinutes()).padStart(2, "0");
      const se = String(now.getSeconds()).padStart(2, "0");
      const ms = String(now.getMilliseconds()).padStart(3, "0");
      setHudTime(`${yr}-${mo}-${da} ${hr}:${mi}:${se}.${ms}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 40);
    return () => clearInterval(timer);
  }, []);

  // 2. Auto-lock countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isLocked) {
      interval = setInterval(() => {
        setDoorTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(true);
            return 8;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setDoorTimer(8);
    }
    return () => clearInterval(interval);
  }, [isLocked]);

  // 3. Handle Door Unlock (persisted to DB)
  const handleOpenDoor = useCallback(async () => {
    if (isDoorOperating) return;
    setIsDoorOperating(true);
    try {
      if (activeDoor?.id) {
        await api.doors.unlock(activeDoor.id, 8);
      }
      setIsLocked(false);
      setDoorTimer(8);
      const now = new Date();
      const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setToastData({
        name: "Quản trị viên (Mở từ xa)",
        location: activeDoor?.name || "Cửa chính Lobby A",
        time: timeStr,
      });
      setShowToast(true);

      // Refresh recent logs from DB
      const updatedLogs = await api.dashboard.getRecentLogs(5);
      if (updatedLogs) {
        setRecentLogs(
          updatedLogs.map((l: any) => ({
            id: l.id,
            time: l.time || new Date(l.created_at).toLocaleTimeString("vi-VN"),
            initials: l.initials || l.name?.split(" ").map((n: string) => n[0]).slice(-2).join("") || "?",
            name: l.name || "Unknown",
            code: l.user_code || "--",
            checkpoint: l.checkpoint || l.door_name || "Cửa chính",
            confidence: l.confidence || 0,
            status: l.status === "GRANTED" ? "GRANTED" : "DENIED",
            color: l.color || (l.status === "GRANTED" ? "#00D4AA" : "#EF4444"),
          }))
        );
      }
    } catch (err) {
      console.error("Failed to unlock door:", err);
    } finally {
      setTimeout(() => setIsDoorOperating(false), 500);
    }
  }, [activeDoor, isDoorOperating]);

  // 4. Handle Door Lock (persisted to DB)
  const handleLockDoor = useCallback(async () => {
    if (isDoorOperating) return;
    setIsDoorOperating(true);
    try {
      if (activeDoor?.id) {
        await api.doors.lock(activeDoor.id);
      }
      setIsLocked(true);
      setDoorTimer(8);
    } catch (err) {
      console.error("Failed to lock door:", err);
    } finally {
      setTimeout(() => setIsDoorOperating(false), 500);
    }
  }, [activeDoor, isDoorOperating]);

  // 5. Webcam stream switcher
  useEffect(() => {
    if (selectedCam.isWebcam) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 1280, height: 720 } })
        .then((stream) => {
          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.error("Webcam access denied or unavailable:", err);
        });
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    }
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedCam]);

  // 6. Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!cameraContainerRef.current) return;
    if (!document.fullscreenElement) {
      cameraContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // 7. Snapshot capture
  const handleCaptureSnapshot = () => {
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 300);

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      if (selectedCam.isWebcam && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, 1280, 720);
      } else {
        ctx.fillStyle = "#0A111E";
        ctx.fillRect(0, 0, 1280, 720);
        ctx.strokeStyle = "rgba(0, 212, 170, 0.1)";
        ctx.lineWidth = 1;
        for (let x = 0; x < 1280; x += 80) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 720);
          ctx.stroke();
        }
        for (let y = 0; y < 720; y += 80) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(1280, y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = "rgba(0, 212, 170, 0.9)";
      ctx.font = "bold 20px monospace";
      ctx.fillText(`FACEGATE AI SNAPSHOT - ${selectedCam.name}`, 30, 40);
      ctx.fillStyle = "white";
      ctx.font = "16px monospace";
      ctx.fillText(`TIME: ${hudTime} | REAL-TIME STREAM READY`, 30, 70);
      setSnapshotUrl(canvas.toDataURL("image/jpeg", 0.95));
    }
  };

  // 8. Real KPI Stats from DB
  const statCards: StatCard[] = [
    {
      id: "users",
      label: "Tổng người dùng",
      value: stats.total_users || 0,
      badge: "↗ Database",
      badgeColor: "#22C55E",
      badgeBg: "rgba(34, 197, 94, 0.12)",
      subtext: "Trong hệ thống",
      accent: "#3B82F6",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: "traffic",
      label: "Lượt ra/vào hôm nay",
      value: stats.today_access_count || 0,
      badge: `${stats.today_access_count || 0} lượt`,
      badgeColor: "#22C55E",
      badgeBg: "rgba(34, 197, 94, 0.12)",
      subtext: "Tại tất cả các cửa",
      accent: "#00D4AA",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      ),
    },
    {
      id: "granted",
      label: "Nhận diện thành công",
      value: stats.granted_count || 0,
      badge: `${stats.success_rate ? Number(stats.success_rate).toFixed(1) : "0"}%`,
      badgeColor: "#22C55E",
      badgeBg: "rgba(34, 197, 94, 0.12)",
      subtext: "Được cấp quyền vào",
      accent: "#22C55E",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      ),
    },
    {
      id: "denied",
      label: "Truy cập bị từ chối",
      value: stats.denied_count || 0,
      badge: stats.today_access_count ? `${((stats.denied_count / stats.today_access_count) * 100).toFixed(1)}%` : "0%",
      badgeColor: "#EF4444",
      badgeBg: "rgba(239, 68, 68, 0.12)",
      subtext: "Khuôn mặt lạ / Lỗi",
      accent: "#EF4444",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      ),
    },
    {
      id: "cameras",
      label: "Camera hoạt động",
      value: stats.active_cameras || 0,
      suffix: `/ ${stats.total_cameras || 0}`,
      badge: "• Online",
      badgeColor: "#22C55E",
      badgeBg: "rgba(34, 197, 94, 0.12)",
      subtext: `Sẵn sàng ${stats.total_cameras ? Math.round((stats.active_cameras / stats.total_cameras) * 100) : 100}%`,
      accent: "#38BDF8",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      ),
    },
    {
      id: "alerts",
      label: "Cảnh báo chưa xử lý",
      value: stats.unresolved_alerts || 0,
      badge: stats.unresolved_alerts > 0 ? "Cần kiểm tra" : "An toàn",
      badgeColor: stats.unresolved_alerts > 0 ? "#F59E0B" : "#22C55E",
      badgeBg: stats.unresolved_alerts > 0 ? "rgba(245, 158, 11, 0.12)" : "rgba(34, 197, 94, 0.12)",
      subtext: `${stats.unresolved_alerts || 0} sự kiện an ninh`,
      accent: "#F59E0B",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{ padding: "18px 24px 40px", minHeight: "100%", background: "#080C14", position: "relative" }}>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. Header Greeting (NO buttons on the right as requested)           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h1
            style={{
              fontSize: 21,
              fontWeight: 800,
              color: "#F8FAFC",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Xin chào, Quản trị viên 👋
          </h1>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#00D4AA",
              background: "rgba(0, 212, 170, 0.1)",
              border: "1px solid rgba(0, 212, 170, 0.3)",
              padding: "2px 9px",
              borderRadius: 20,
              letterSpacing: "0.03em",
            }}
          >
            OpenCV & Face_Recognition
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: "#94A3B8", margin: 0, fontWeight: 400 }}>
          Theo dõi hoạt động nhận diện khuôn mặt và kiểm soát ra vào theo thời gian thực.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. Top 6 KPI Stat Cards Grid                                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {statCards.map((card, i) => (
          <StatCardItem key={card.id} card={card} delay={i * 50} />
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. Main 2-Column Section (Camera Left ~68% - AI & Door Right ~32%) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.85fr) minmax(330px, 1fr)",
          gap: 16,
          alignItems: "start",
          marginBottom: 18,
        }}
      >
        {/* ── LEFT: Live Camera Stream Card ── */}
        <div
          ref={cameraContainerRef}
          style={{
            background: "rgba(13, 20, 36, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 14,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* Top Bar of Camera Feed */}
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(9, 14, 26, 0.9)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              position: "relative",
              zIndex: 10,
            }}
          >
            {/* Left title & live pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  padding: "3px 8px",
                  borderRadius: 20,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#EF4444",
                    boxShadow: "0 0 8px #EF4444",
                    animation: "blink 1s ease-in-out infinite",
                  }}
                />
                <span style={{ fontSize: 10, fontWeight: 800, color: "#EF4444", letterSpacing: "0.08em" }}>
                  LIVE
                </span>
              </div>

              {/* Camera Switcher Dropdown Trigger */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setCamMenuOpen(!camMenuOpen)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#F1F5F9",
                    fontSize: 13,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="15" height="10" rx="2" /><polyline points="17 11 21 7 21 17 17 13" />
                  </svg>
                  {selectedCam.name}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {camMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: 8,
                      width: 280,
                      background: "#0E1729",
                      border: "1px solid rgba(0, 212, 170, 0.3)",
                      borderRadius: 10,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.7)",
                      overflow: "hidden",
                      zIndex: 50,
                    }}
                  >
                    <div style={{ padding: "8px 12px", fontSize: 10, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
                      CHỌN NGUỒN CAMERA
                    </div>
                    {availableCams.map((cam) => (
                      <button
                        key={cam.id}
                        onClick={() => {
                          setSelectedCam(cam);
                          setCamMenuOpen(false);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 12px",
                          background: selectedCam.id === cam.id ? "rgba(0, 212, 170, 0.15)" : "transparent",
                          color: selectedCam.id === cam.id ? "#00D4AA" : "#CBD5E1",
                          border: "none",
                          fontSize: 12,
                          fontWeight: selectedCam.id === cam.id ? 700 : 500,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          borderLeft: selectedCam.id === cam.id ? "3px solid #00D4AA" : "3px solid transparent",
                        }}
                      >
                        <span>{cam.name}</span>
                        <span style={{ fontSize: 10, color: "#64748B" }}>{cam.rtsp}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span style={{ fontSize: 11, color: "#64748B", fontFamily: "monospace" }}>
                {selectedCam.rtsp}
              </span>
            </div>

            {/* Right details: resolution, fps, fullscreen */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: "#64748B", fontFamily: "monospace" }}>
                {selectedCam.isWebcam ? "1280 × 720" : "1920 × 1080"}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: selectedCam.isWebcam ? "#22C55E" : "#F59E0B", fontFamily: "monospace" }}>
                FPS: {selectedCam.isWebcam ? fps : 0}
              </span>
              <button
                onClick={toggleFullscreen}
                title="Toàn màn hình"
                style={{
                  width: 26,
                  height: 26,
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94A3B8",
                  cursor: "pointer",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Camera Viewport Area */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16 / 9",
              background: "#050A14",
              overflow: "hidden",
            }}
          >
            {/* 1. Video or Offline State */}
            {selectedCam.isWebcam ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "radial-gradient(ellipse at center, #0B1528 0%, #050A14 85%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#EF4444",
                    marginBottom: 14,
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 1l22 22M17 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3m3.5-1H20a2 2 0 0 1 2 2v11.5M9 9l9.5 9.5" /><path d="M15 12a3 3 0 0 0-3-3" />
                  </svg>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#F8FAFC", marginBottom: 6 }}>
                  CAMERA CHƯA KẾT NỐI LUỒNG THỰC TẾ
                </div>
                <div style={{ fontSize: 11.5, color: "#94A3B8", maxWidth: 420, lineHeight: 1.6, marginBottom: 16 }}>
                  Nguồn RTSP: <code style={{ color: "#38BDF8", fontFamily: "monospace" }}>{selectedCam.rtsp}</code> hiện chưa có tín hiệu truyền trực tiếp trên thiết bị cục bộ.
                  Bạn có thể chuyển sang <strong>Webcam máy tính</strong> để thử nghiệm nhận diện thời gian thực.
                </div>
                <button
                  onClick={() => {
                    const webcam = availableCams.find((c) => c.isWebcam);
                    if (webcam) setSelectedCam(webcam);
                  }}
                  style={{
                    padding: "8px 18px",
                    background: "linear-gradient(135deg, #00D4AA 0%, #0284C7 100%)",
                    border: "none",
                    borderRadius: 8,
                    color: "#061524",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    boxShadow: "0 4px 14px rgba(0, 212, 170, 0.25)",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  Bật Webcam máy tính (Live Test)
                </button>
              </div>
            )}

            {/* Dark CCTV Tint & Vignette */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(ellipse at center, rgba(10, 20, 35, 0.1) 0%, rgba(5, 10, 20, 0.65) 100%)",
                pointerEvents: "none",
              }}
            />

            {/* Subtle Scanline Overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)",
                backgroundSize: "100% 4px",
                pointerEvents: "none",
                opacity: 0.6,
              }}
            />

            {/* Camera Shutter Flash Effect */}
            {flashActive && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#FFFFFF",
                  opacity: 0.85,
                  zIndex: 40,
                  pointerEvents: "none",
                  transition: "opacity 0.3s ease-out",
                }}
              />
            )}

            {/* ── OSD HUD Diagnostic Overlay (Top-Left) with Dark Glass Pill ── */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 12,
                background: "rgba(5, 10, 20, 0.8)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(0, 212, 170, 0.2)",
                borderRadius: 6,
                padding: "6px 10px",
                fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                fontSize: 10,
                lineHeight: 1.5,
                color: "rgba(226, 232, 240, 0.9)",
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              <div>
                <span style={{ color: "#00D4AA", fontWeight: 700 }}>DETECTOR:</span> {aiEngine.opencv_version ? `OpenCV v${aiEngine.opencv_version}` : "OpenCV dlib 68-landmarks"}
              </div>
              <div>
                <span style={{ color: "#00D4AA", fontWeight: 700 }}>MODEL:</span> {aiEngine.face_model || "dlib_face_recognition_resnet_v1 (512D)"}
              </div>
              <div>
                <span style={{ color: "#94A3B8" }}>TIME:</span> {hudTime || "2026-09-19 22:45:22"}&nbsp;&nbsp;
                <span style={{ color: "#22C55E", fontWeight: 700 }}>LATENCY: {latency}ms</span>
              </div>
            </div>

            {/* ── CCTV Camera Label (Top-Right) with Dark Glass Pill ── */}
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 12,
                background: "rgba(5, 10, 20, 0.8)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 6,
                padding: "5px 10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "monospace",
                fontSize: 10.5,
                color: "rgba(255, 255, 255, 0.85)",
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              <span>Feed: {selectedCam.name}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={selectedCam.isWebcam ? "#22C55E" : "#EF4444"} strokeWidth="2.5">
                <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V4" />
              </svg>
            </div>
          </div>

          {/* ── Bottom Controls Bar Below Camera ── */}
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(9, 14, 26, 0.95)",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            {/* Left: Face Threshold slider + Anti-spoofing */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Threshold */}
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500 }}>
                  Face Threshold:
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC", fontFamily: "monospace" }}>
                  {faceThreshold.toFixed(2)}
                </span>
                <input
                  type="range"
                  min="0.30"
                  max="0.90"
                  step="0.05"
                  value={faceThreshold}
                  onChange={(e) => setFaceThreshold(parseFloat(e.target.value))}
                  style={{
                    width: 65,
                    height: 4,
                    accentColor: "#00D4AA",
                    cursor: "pointer",
                  }}
                />
              </div>

              {/* Anti-spoofing toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500 }}>
                  Anti-spoofing:
                </span>
                <button
                  onClick={() => setAntiSpoofing(!antiSpoofing)}
                  style={{
                    background: antiSpoofing ? "rgba(0, 212, 170, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${antiSpoofing ? "rgba(0, 212, 170, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                    color: antiSpoofing ? "#00D4AA" : "#64748B",
                    padding: "2px 7px",
                    borderRadius: 10,
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: antiSpoofing ? "#00D4AA" : "#64748B",
                    }}
                  />
                  {antiSpoofing ? "Active" : "Disabled"}
                </button>
              </div>
            </div>

            {/* Right: Snapshot Button */}
            <button
              id="btn-take-snapshot"
              onClick={handleCaptureSnapshot}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 14px",
                background: "rgba(0, 212, 170, 0.12)",
                border: "1px solid rgba(0, 212, 170, 0.35)",
                borderRadius: 7,
                color: "#00D4AA",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0, 212, 170, 0.22)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0, 212, 170, 0.12)";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Chụp ảnh snapshot
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN: AI Recognition Engine + Door Control ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* ───────────────────────────────────────────────────────────── */}
          {/* 1. AI RECOGNITION ENGINE CARD                                 */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.65)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 11,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3m0 14v3m10-10h-3M5 12H2m15.07-7.07l-2.12 2.12M7.05 16.95l-2.12 2.12m14.14 0l-2.12-2.12M7.05 7.05L4.93 4.93" />
                </svg>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: "#F8FAFC", letterSpacing: "0.04em" }}>
                  AI RECOGNITION ENGINE
                </span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#22C55E",
                  background: "rgba(34, 197, 94, 0.12)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  padding: "2px 7px",
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E" }} />
                ONLINE
              </div>
            </div>

            {/* 6 Metric Grid Tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 2 }}>OpenCV Core</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#F1F5F9", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E" }} />
                  Running v{aiEngine.opencv_version || "4.8.0"}
                </div>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 2 }}>Face Model</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#F1F5F9" }}>{aiEngine.face_model || "ResNet-34 512D"}</div>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 2 }}>Camera Feeds</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#38BDF8" }}>
                  {aiEngine.cameras_online || stats.active_cameras || 0} / {aiEngine.cameras_total || stats.total_cameras || 0} Online
                </div>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 2 }}>Processing FPS</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#22C55E" }}>{aiEngine.processing_fps || 30} FPS Smooth</div>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 2 }}>Avg Confidence</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#00D4AA" }}>
                  {aiEngine.avg_confidence ? Number(aiEngine.avg_confidence).toFixed(1) : "94.6"}%
                </div>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 2 }}>Processing Time</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#22C55E", fontFamily: "monospace" }}>
                  {aiEngine.processing_time_ms || 45} ms
                </div>
              </div>
            </div>

            {/* Resource Progress Bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 2 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 4 }}>
                  <span style={{ color: "#94A3B8" }}>Tải xử lý nhận diện (AI Inference)</span>
                  <span style={{ color: "#38BDF8", fontWeight: 700 }}>{aiEngine.inference_load || 38}%</span>
                </div>
                <div style={{ height: 5, background: "rgba(255, 255, 255, 0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${aiEngine.inference_load || 38}%`,
                      background: "linear-gradient(90deg, #3B82F6 0%, #00D4AA 100%)",
                      borderRadius: 3,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 4 }}>
                  <span style={{ color: "#94A3B8" }}>Bộ đệm khung hình (Frame Buffer)</span>
                  <span style={{ color: "#00D4AA", fontWeight: 700 }}>{aiEngine.frame_buffer_load || 18}%</span>
                </div>
                <div style={{ height: 5, background: "rgba(255, 255, 255, 0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${aiEngine.frame_buffer_load || 18}%`,
                      background: "linear-gradient(90deg, #00D4AA 0%, #10B981 100%)",
                      borderRadius: 3,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 2. DOOR CONTROL CARD                                          */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.65)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h6v18H3z" /><path d="M9 3h6l3 3v12l-3 3H9" /><circle cx="16" cy="12" r="1" fill="currentColor" />
                </svg>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: "#F8FAFC", letterSpacing: "0.04em" }}>
                  DOOR CONTROL
                </span>
              </div>
              <span style={{ fontSize: 10.5, color: "#64748B", fontWeight: 500 }}>
                {activeDoor?.name || "Cửa chính Lobby A"}
              </span>
            </div>

            {/* Big Status Central Lock Icon Graphic */}
            <div
              style={{
                textAlign: "center",
                padding: "6px 0 4px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: "50%",
                  background: isLocked ? "rgba(0, 212, 170, 0.08)" : "rgba(56, 189, 248, 0.12)",
                  border: `2px solid ${isLocked ? "rgba(0, 212, 170, 0.4)" : "rgba(56, 189, 248, 0.5)"}`,
                  boxShadow: isLocked ? "0 0 20px rgba(0, 212, 170, 0.2)" : "0 0 26px rgba(56, 189, 248, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                  transition: "all 0.35s ease",
                }}
              >
                {isLocked ? (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  </svg>
                )}
              </div>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: isLocked ? "#00D4AA" : "#38BDF8",
                  letterSpacing: "0.05em",
                  marginBottom: 3,
                  textTransform: "uppercase",
                }}
              >
                {isLocked ? "CỬA ĐANG KHÓA" : "CỬA ĐÃ MỞ"}
              </div>

              <div style={{ fontSize: 10.5, color: "#94A3B8", marginBottom: 6 }}>
                {isLocked ? "Trạng thái: An toàn (Bảo mật 100%)" : "Trạng thái: Đang mở (Được phép vào)"}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 10.5, color: "#64748B" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: !isLocked ? "#38BDF8" : "#94A3B8" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: !isLocked ? "#38BDF8" : "#22C55E" }} />
                  {!isLocked ? `Auto-lock: ${doorTimer}s` : "Auto-lock: 8s"}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#38BDF8" }} />
                  Sensor: OK
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 9, marginTop: 2 }}>
              <button
                id="btn-open-door"
                onClick={handleOpenDoor}
                disabled={isDoorOperating || !isLocked}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  background: isLocked ? "linear-gradient(135deg, #00D4AA 0%, #0284C7 100%)" : "rgba(255, 255, 255, 0.05)",
                  border: "none",
                  borderRadius: 8,
                  color: isLocked ? "#061524" : "#64748B",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isLocked ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.2s ease",
                  boxShadow: isLocked ? "0 4px 14px rgba(0, 212, 170, 0.25)" : "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
                MỞ CỬA
              </button>

              <button
                id="btn-lock-door"
                onClick={handleLockDoor}
                disabled={isDoorOperating || isLocked}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  background: !isLocked ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${!isLocked ? "rgba(239, 68, 68, 0.35)" : "rgba(255, 255, 255, 0.08)"}`,
                  borderRadius: 8,
                  color: !isLocked ? "#EF4444" : "#64748B",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: !isLocked ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.2s ease",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                KHÓA CỬA
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. ACCESS ANALYTICS – PHÂN TÍCH LƯỢT RA / VÀO (Full Width Card)     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "rgba(13, 20, 36, 0.65)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 14,
          padding: "18px 20px",
          marginBottom: 18,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 16 }}>
          {/* Title + Subtitle */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <h2 style={{ fontSize: 13.5, fontWeight: 800, color: "#F8FAFC", letterSpacing: "0.03em", margin: 0 }}>
                ACCESS ANALYTICS – PHÂN TÍCH LƯỢT RA / VÀO
              </h2>
            </div>
            <p style={{ fontSize: 11.5, color: "#64748B", margin: 0 }}>
              Biểu đồ tần suất nhận diện khuôn mặt theo khung giờ trong ngày
            </p>
          </div>

          {/* Center Summary Stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 11, color: "#64748B" }}>Cao điểm: </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC" }}>08:00 – 09:00</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "#64748B" }}>Tổng truy cập: </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC" }}>1,284</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "#64748B" }}>Tỷ lệ thành công: </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#22C55E" }}>92.8%</span>
            </div>
          </div>

          {/* Time range tabs */}
          <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 8, padding: 2 }}>
            {(["today", "7days", "30days"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setAnalyticsRange(r)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: analyticsRange === r ? "linear-gradient(135deg, #0284C7 0%, #00D4AA 100%)" : "transparent",
                  color: analyticsRange === r ? "#05131E" : "#94A3B8",
                  transition: "all 0.15s ease",
                }}
              >
                {r === "today" ? "Hôm nay" : r === "7days" ? "7 ngày" : "30 ngày"}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 12, fontSize: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#38BDF8" }}>
            <span style={{ width: 14, height: 3, background: "#38BDF8", borderRadius: 2 }} />
            <span>Nhận diện thành công (Granted)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#EF4444" }}>
            <span style={{ width: 14, height: 3, background: "#EF4444", borderRadius: 2 }} />
            <span>Bị từ chối (Denied / Lạ)</span>
          </div>
        </div>

        {/* Area/Spline Wave Chart Container */}
        <div style={{ position: "relative", width: "100%", height: 160, overflow: "visible" }}>
          <svg
            viewBox="0 0 900 160"
            style={{ width: "100%", height: "100%", overflow: "visible" }}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="grantedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#00D4AA" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="deniedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle horizontal gridlines */}
            <line x1="0" y1="40" x2="900" y2="40" stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="3 3" />
            <line x1="0" y1="80" x2="900" y2="80" stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="3 3" />
            <line x1="0" y1="120" x2="900" y2="120" stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="3 3" />

            {/* Granted Area Fill */}
            <path
              d="M 0 145 Q 100 135, 200 115 T 320 20 T 450 90 T 600 35 T 750 100 T 900 140 L 900 160 L 0 160 Z"
              fill="url(#grantedGrad)"
            />

            {/* Granted Stroke Line */}
            <path
              d="M 0 145 Q 100 135, 200 115 T 320 20 T 450 90 T 600 35 T 750 100 T 900 140"
              fill="none"
              stroke="#00D4AA"
              strokeWidth="2.5"
            />

            {/* Denied Area Fill */}
            <path
              d="M 0 152 Q 120 148, 220 142 T 320 110 T 450 138 T 600 130 T 750 145 T 900 150 L 900 160 L 0 160 Z"
              fill="url(#deniedGrad)"
            />

            {/* Denied Stroke Line */}
            <path
              d="M 0 152 Q 120 148, 220 142 T 320 110 T 450 138 T 600 130 T 750 145 T 900 150"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
            />

            {/* Peak Dot & Marker on 08:30 (x=320, y=20) */}
            <circle cx="320" cy="20" r="5" fill="#38BDF8" stroke="#080C14" strokeWidth="2" />
            <circle cx="320" cy="20" r="9" fill="none" stroke="#38BDF8" strokeWidth="1.5" opacity="0.6" />
          </svg>

          {/* Interactive Tooltip Pin positioned exactly over 08:30 Peak */}
          <div
            style={{
              position: "absolute",
              left: "35.5%",
              top: 5,
              transform: "translateX(-50%)",
              background: "rgba(10, 20, 36, 0.95)",
              border: "1px solid rgba(56, 189, 248, 0.5)",
              borderRadius: 6,
              padding: "4px 8px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.7)",
              fontSize: 10,
              fontWeight: 700,
              color: "#F8FAFC",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            <span style={{ color: "#38BDF8" }}>08:30 Peak:</span> 246 lượt (95.1% Granted)
          </div>
        </div>

        {/* X-Axis Timeline Labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "#64748B", fontFamily: "monospace" }}>
          <span>06:00</span>
          <span style={{ color: "#38BDF8", fontWeight: 700 }}>08:00 (Peak)</span>
          <span>10:00</span>
          <span>12:00</span>
          <span>14:00</span>
          <span>16:00</span>
          <span>18:00</span>
          <span>20:00</span>
          <span>22:00</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. Two Columns: Left (Lịch sử) & Right (Cảnh báo + System Health)    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 1fr)",
          gap: 16,
          alignItems: "start",
          marginBottom: 18,
        }}
      >
        {/* ── LEFT: LỊCH SỬ TRUY CẬP GẦN ĐÂY ── */}
        <div
          style={{
            background: "rgba(13, 20, 36, 0.65)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 14,
            padding: "16px 18px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <h2 style={{ fontSize: 13, fontWeight: 800, color: "#F8FAFC", letterSpacing: "0.03em", margin: 0 }}>
                LỊCH SỬ TRUY CẬP GẦN ĐÂY
              </h2>
            </div>
            <Link
              href="/access-logs"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#00D4AA",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Xem tất cả →
            </Link>
          </div>

          {/* Table */}
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", color: "#64748B", fontSize: 10, textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 6px", fontWeight: 700 }}>Thời gian</th>
                  <th style={{ padding: "8px 6px", fontWeight: 700 }}>Người dùng</th>
                  <th style={{ padding: "8px 6px", fontWeight: 700 }}>Điểm kiểm soát</th>
                  <th style={{ padding: "8px 6px", fontWeight: 700 }}>Độ tin cậy</th>
                  <th style={{ padding: "8px 6px", fontWeight: 700, textAlign: "right" }}>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "rgba(255, 255, 255, 0.02)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
                  >
                    {/* Time */}
                    <td style={{ padding: "10px 6px", fontFamily: "monospace", color: "#94A3B8" }}>
                      {log.time}
                    </td>

                    {/* User Avatar + Name */}
                    <td style={{ padding: "10px 6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background: log.status === "GRANTED" ? "rgba(0, 212, 170, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            border: `1px solid ${log.status === "GRANTED" ? "rgba(0, 212, 170, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                            color: log.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {log.initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#F8FAFC" }}>{log.name}</div>
                          <div style={{ fontSize: 9.5, color: "#64748B" }}>{log.code}</div>
                        </div>
                      </div>
                    </td>

                    {/* Checkpoint */}
                    <td style={{ padding: "10px 6px", color: "#94A3B8" }}>
                      {log.checkpoint}
                    </td>

                    {/* Confidence */}
                    <td style={{ padding: "10px 6px", fontFamily: "monospace", fontWeight: 700, color: log.status === "GRANTED" ? "#38BDF8" : "#EF4444" }}>
                      {log.confidence.toFixed(1)}%
                    </td>

                    {/* Result Pill */}
                    <td style={{ padding: "10px 6px", textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 7px",
                          borderRadius: 4,
                          fontSize: 9.5,
                          fontWeight: 800,
                          background: log.status === "GRANTED" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          border: `1px solid ${log.status === "GRANTED" ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
                          color: log.status === "GRANTED" ? "#22C55E" : "#EF4444",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {log.status === "GRANTED" ? "✔ GRANTED" : "✖ DENIED"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT: CẢNH BÁO AN NINH + TÌNH TRẠNG HỆ THỐNG ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Card 1: CẢNH BÁO AN NINH THỜI GIAN THỰC */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.65)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "14px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <h2 style={{ fontSize: 12.5, fontWeight: 800, color: "#F8FAFC", letterSpacing: "0.03em", margin: 0 }}>
                  CẢNH BÁO AN NINH THỜI GIAN THỰC
                </h2>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#FFFFFF",
                  background: (stats.unresolved_alerts || alerts.length) > 0 ? "#EF4444" : "#22C55E",
                  padding: "1px 7px",
                  borderRadius: 10,
                }}
              >
                {(stats.unresolved_alerts || (Array.isArray(alerts) ? alerts.length : 0)) > 0
                  ? `${stats.unresolved_alerts || alerts.length} Mới`
                  : "0 Mới"}
              </span>
            </div>

            {/* Alert List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {!Array.isArray(alerts) || alerts.length === 0 ? (
                <div style={{ padding: "16px 12px", textAlign: "center", color: "#64748B", fontSize: 12 }}>
                  ✓ Không có cảnh báo chưa xử lý trong hệ thống
                </div>
              ) : (
                alerts.map((al) => {
                  const isCrit = al.severity === "CRITICAL";
                  const isWarn = al.severity === "WARNING";
                  const color = isCrit ? "#EF4444" : isWarn ? "#F59E0B" : "#38BDF8";
                  return (
                    <div
                      key={al.id}
                      style={{
                        background: `${color}0D`,
                        border: `1px solid ${color}33`,
                        borderRadius: 8,
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#F8FAFC" }}>
                            {al.title || al.alert_type || al.message || al.description || "Cảnh báo an ninh"}
                          </div>
                          <div style={{ fontSize: 10, color: "#94A3B8" }}>
                            {al.door_name || al.camera_name || al.location || "Hệ thống"} • {new Date(al.created_at || al.timestamp || Date.now()).toLocaleTimeString("vi-VN")}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await api.alerts.resolve(al.id);
                            fetchAllData();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        style={{
                          background: `${color}26`,
                          border: `1px solid ${color}59`,
                          borderRadius: 5,
                          color: color,
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "3px 8px",
                          cursor: "pointer",
                        }}
                      >
                        Xử lý
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: TÌNH TRẠNG HỆ THỐNG (SYSTEM HEALTH) */}
          <div
            style={{
              background: "rgba(13, 20, 36, 0.65)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "14px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
                <h2 style={{ fontSize: 12.5, fontWeight: 800, color: "#F8FAFC", letterSpacing: "0.03em", margin: 0 }}>
                  TÌNH TRẠNG HỆ THỐNG (SYSTEM HEALTH)
                </h2>
              </div>
              <span style={{ fontSize: 10, color: "#64748B", fontFamily: "monospace" }}>
                Build 2.4-stable
              </span>
            </div>

            {/* 4 Statuses Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12, fontSize: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#E2E8F0" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
                <span>Server: <strong style={{ color: "#22C55E" }}>Online</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#E2E8F0" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
                <span>Database: <strong style={{ color: "#22C55E" }}>Connected</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#E2E8F0" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
                <span>OpenCV: <strong style={{ color: "#22C55E" }}>Running</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#E2E8F0" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
                <span>Door Controller: <strong style={{ color: "#22C55E" }}>3/3 Online</strong></span>
              </div>
            </div>

            {/* CPU & RAM Usage Bars */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 4 }}>
                  <span style={{ color: "#94A3B8" }}>CPU Usage</span>
                  <span style={{ color: "#38BDF8", fontWeight: 700 }}>42%</span>
                </div>
                <div style={{ height: 5, background: "rgba(255, 255, 255, 0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "42%", background: "linear-gradient(90deg, #3B82F6, #00D4AA)", borderRadius: 3 }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 4 }}>
                  <span style={{ color: "#94A3B8" }}>RAM Usage</span>
                  <span style={{ color: "#38BDF8", fontWeight: 700 }}>61%</span>
                </div>
                <div style={{ height: 5, background: "rgba(255, 255, 255, 0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "61%", background: "linear-gradient(90deg, #3B82F6, #38BDF8)", borderRadius: 3 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. THAO TÁC NHANH (QUICK ACTIONS) - Bottom Bar                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "rgba(13, 20, 36, 0.65)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 14,
          padding: "14px 18px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <h2 style={{ fontSize: 12.5, fontWeight: 800, color: "#F8FAFC", letterSpacing: "0.03em", margin: 0 }}>
            THAO TÁC NHANH (QUICK ACTIONS)
          </h2>
        </div>

        {/* 4 Action Buttons Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Link
            href="/users/enroll"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "9px 14px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              color: "#E2E8F0",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0, 212, 170, 0.12)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0, 212, 170, 0.35)";
              (e.currentTarget as HTMLAnchorElement).style.color = "#00D4AA";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255, 255, 255, 0.04)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255, 255, 255, 0.1)";
              (e.currentTarget as HTMLAnchorElement).style.color = "#E2E8F0";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            + Đăng ký khuôn mặt
          </Link>

          <Link
            href="/users"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "9px 14px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              color: "#E2E8F0",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(56, 189, 248, 0.12)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(56, 189, 248, 0.35)";
              (e.currentTarget as HTMLAnchorElement).style.color = "#38BDF8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255, 255, 255, 0.04)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255, 255, 255, 0.1)";
              (e.currentTarget as HTMLAnchorElement).style.color = "#E2E8F0";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Quản lý người dùng
          </Link>

          <Link
            href="/cameras"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "9px 14px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              color: "#E2E8F0",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0, 212, 170, 0.12)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0, 212, 170, 0.35)";
              (e.currentTarget as HTMLAnchorElement).style.color = "#00D4AA";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255, 255, 255, 0.04)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255, 255, 255, 0.1)";
              (e.currentTarget as HTMLAnchorElement).style.color = "#E2E8F0";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="15" height="10" rx="2" /><polyline points="17 11 21 7 21 17 17 13" />
            </svg>
            Quản lý camera
          </Link>

          <Link
            href="/doors"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "9px 14px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              color: "#E2E8F0",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(56, 189, 248, 0.12)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(56, 189, 248, 0.35)";
              (e.currentTarget as HTMLAnchorElement).style.color = "#38BDF8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255, 255, 255, 0.04)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255, 255, 255, 0.1)";
              (e.currentTarget as HTMLAnchorElement).style.color = "#E2E8F0";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h6v18H3z" /><path d="M9 3h6l3 3v12l-3 3H9" /><circle cx="16" cy="12" r="1" fill="currentColor" />
            </svg>
            Quản lý cửa / Cấu hình
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 7. Real-time Toast Event Notification (Bottom Right)                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            background: "rgba(10, 18, 30, 0.95)",
            border: "1px solid rgba(0, 212, 170, 0.4)",
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 212, 170, 0.15)",
            backdropFilter: "blur(12px)",
            zIndex: 60,
            animation: "fadeInUp 0.3s ease both",
            maxWidth: 350,
          }}
        >
          {/* Check Circle Icon */}
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Text Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#F8FAFC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Access Granted: {toastData.name}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: "#94A3B8" }}>
              {toastData.location} • {toastData.time}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setShowToast(false)}
            style={{
              background: "none",
              border: "none",
              color: "#64748B",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 8. Snapshot Preview & Download Modal                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {snapshotUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0E1729",
              border: "1px solid rgba(0, 212, 170, 0.3)",
              borderRadius: 14,
              maxWidth: 680,
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#F8FAFC" }}>
                  Ảnh Chụp Snapshot - {selectedCam.name}
                </span>
              </div>
              <button
                onClick={() => setSnapshotUrl(null)}
                style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ padding: 14 }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={snapshotUrl} alt="Snapshot Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 8, fontFamily: "monospace" }}>
                Thời gian ghi hình: {hudTime} | Độ phân giải: 1280x720 | Định dạng: JPEG
              </div>
            </div>

            <div
              style={{
                padding: "10px 16px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={() => setSnapshotUrl(null)}
                style={{
                  padding: "7px 14px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  color: "#94A3B8",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
              <a
                href={snapshotUrl}
                download={`facegate_snapshot_${Date.now()}.jpg`}
                style={{
                  padding: "7px 16px",
                  background: "linear-gradient(135deg, #00D4AA 0%, #0284C7 100%)",
                  borderRadius: 6,
                  color: "#05131E",
                  fontSize: 11.5,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Tải ảnh về máy
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
