"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useRouter } from "next/navigation";

interface PendingUser {
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  accessAreas: string[];
  selectedCameraId?: string;
  avatarUrl?: string;
}

const DOOR_CONTROLLERS = [
  { name: "Cửa chính Lobby – Tầng 1",  ip: "192.168.1.101", proto: "TCP/IP Push", latency: "2ms" },
  { name: "Phòng Server Kỹ thuật",      ip: "192.168.1.103", proto: "TCP/IP Push", latency: "4ms" },
  { name: "Cửa phân tầng Thang máy",   ip: "192.168.1.105", proto: "TCP/IP Push", latency: "3ms" },
];

const ANGLE_STEPS = [
  { label: "Nhìn thẳng (0°)",    icon: "→", threshold: 6  },
  { label: "Nghiêng trái (15°)", icon: "←", threshold: 12 },
  { label: "Nghiêng phải (15°)", icon: "→", threshold: 18 },
  { label: "Ngửa nhẹ (+10°)",   icon: "↑", threshold: 24 },
  { label: "Cúi nhẹ (-10°)",    icon: "↓", threshold: 30 },
];

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(-2).join("");
}

export default function EnrollPage() {
  const router = useRouter();

  // Load pending user from session (IT02-001, IT02-017)
  const [user, setUser] = useState<PendingUser | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camError, setCamError] = useState("");

  // ── Enrollment state ─────────────────────────────────────────────────────
  const [step, setStep]       = useState<"idle" | "scanning" | "done">("idle");
  const [frames, setFrames]   = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [saved, setSaved]     = useState(false);
  const [hudFeedback, setHudFeedback] = useState("GIỮ YÊN · ĐANG GHI NHẬN GÓC NÀY...");
  const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef            = useRef<ReturnType<typeof setInterval> | null>(null);

  // Door sync state (IT02-014: Online vs Offline)
  const [doorStatus, setDoorStatus] = useState<"online" | "offline">("online");

  // Cancel confirmation modal (IT02-016)
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Realtime Quality Metrics (IT02-007, IT02-008, IT02-009, IT02-010)
  const [quality, setQuality] = useState({
    sharp: 0,
    iris: 0,
    occlude: 0,
    anti: 0,
    total: 0,
  });

  // Camera disconnect handler (IT02-015)
  const handleCamDisconnect = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamError("Mất kết nối với Camera. Quá trình thu nạp bị gián đoạn.");
    setStep("idle");
  }, []);

  const startCam = useCallback(async (loadedCameraId?: string) => {
    setCamError("");
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const constraints: MediaStreamConstraints = {
        video: loadedCameraId
          ? { deviceId: { exact: loadedCameraId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Monitor camera disconnect event (IT02-015)
      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          handleCamDisconnect();
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCamError("Không thể kết nối camera: " + (err?.message || ""));
    }
  }, [handleCamDisconnect]);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("pendingUser") : null;
    let loadedUser: PendingUser | null = null;
    if (raw) {
      try {
        loadedUser = JSON.parse(raw);
        setUser(loadedUser);
      } catch {}
    }

    startCam(loadedUser?.selectedCameraId);

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [startCam]);

  // Realtime quality metric updates according to frame collection (IT02-007 to IT02-010)
  useEffect(() => {
    if (step === "scanning") {
      const p = frames / 30;
      const sharp = Math.min(98, Math.round(70 + p * 27 + (Math.sin(frames) * 1.5)));
      const iris = Math.min(100, Math.round(75 + p * 24 + (Math.cos(frames) * 1.8)));
      const occlude = Math.min(100, Math.round(84 + p * 15 + (Math.sin(frames * 0.7) * 1.2)));
      const anti = +(Math.min(99.4, 82 + p * 17.1 + (Math.cos(frames * 0.5) * 0.5))).toFixed(1);
      const total = Math.min(96, Math.round(58 + p * 38));
      setQuality({ sharp, iris, occlude, anti, total });
    } else if (step === "done") {
      setQuality({ sharp: 98, iris: 100, occlude: 100, anti: 99.4, total: 96 });
    } else {
      setQuality({ sharp: 0, iris: 0, occlude: 0, anti: 0, total: 0 });
    }
  }, [frames, step]);

  const progress = Math.round((frames / 30) * 100);

  // Start enrollment capture (IT02-003, IT02-011, IT02-012)
  const startScan = () => {
    if (camError) {
      startCam(user?.selectedCameraId);
    }
    setStep("scanning");
    setFrames(0);
    setElapsed(0);
    setHudFeedback("GIỮ YÊN · ĐANG GHI NHẬN GÓC NÀY...");

    intervalRef.current = setInterval(() => {
      setFrames(f => {
        const next = f + 1;
        // Dynamic pose guidance feedback during scanning
        if (next <= 6) setHudFeedback("NHÌN THẲNG · GIỮ VỊ TRÍ CHÍNH DIỆN");
        else if (next <= 12) setHudFeedback("NGHIÊNG TRÁI NHẸ (15°) · ĐANG NẠP MESH 3D");
        else if (next <= 18) setHudFeedback("NGHIÊNG PHẢI NHẸ (15°) · TIẾP TỤC GIỮ YÊN");
        else if (next <= 24) setHudFeedback("NGỬA ĐẦU NHẸ (+10°) · ĐO CHIỀU SÂU IRIS");
        else setHudFeedback("CÚI ĐẦU NHẸ (-10°) · HOÀN TẤT MẪU CUỐI");

        if (next >= 30) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (elapsedRef.current) clearInterval(elapsedRef.current);
          setTimeout(() => setStep("done"), 400);
        }
        return next;
      });
    }, 170);

    elapsedRef.current = setInterval(() => {
      setElapsed(e => +(e + 0.1).toFixed(1));
    }, 100);
  };

  // Save and activate user (IT02-012, IT02-017)
  const handleSaveAndActivate = () => {
    setSaved(true);
    setTimeout(() => {
      sessionStorage.removeItem("pendingUser");
      router.push("/users");
    }, 1200);
  };

  // Cancel request handler (IT02-016)
  const handleCancelClick = () => {
    if (step === "scanning") {
      setShowCancelModal(true);
    } else {
      sessionStorage.removeItem("pendingUser");
      router.push("/users");
    }
  };

  const confirmCancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    sessionStorage.removeItem("pendingUser");
    setShowCancelModal(false);
    router.push("/users");
  };

  const displayName = user?.name || "Nguyễn Văn An";
  const displayId   = user?.employeeId || "EMP-2045";
  const displayRole = user?.role || "Kỹ sư AI / Lập trình viên cao cấp";
  const displayDept = user?.department || "Khối Kỹ thuật & R&D";

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Header bar (IT02-001, IT02-017) ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(20,25,35,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 22px", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Avatar */}
              <div style={{ position: "relative" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#00D4AA,#3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "white", border: step === "scanning" ? "2px solid var(--accent-teal)" : "2px solid rgba(255,255,255,0.1)", transition: "border-color 0.3s", boxShadow: step === "scanning" ? "0 0 16px rgba(0,212,170,0.4)" : "none", overflow: "hidden" }}>
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    initials(displayName)
                  )}
                </div>
                {step === "scanning" && (
                  <div style={{ position: "absolute", bottom: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "var(--accent-teal)", border: "2px solid var(--bg-card)", animation: "pulse 1.2s infinite" }} />
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: step === "done" ? "var(--accent-teal)" : "var(--accent-blue)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                  {step === "done" ? "✓ ĐĂNG KÝ HOÀN TẤT" : step === "scanning" ? "● ĐANG GHI DANH" : "● SẴN SÀNG ĐĂNG KÝ"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                  Đăng ký khuôn mặt AI <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>(Face Enrollment)</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600 }}>{displayName}</span>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
                  <span>{displayRole}</span>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
                  <span style={{ color: "var(--text-muted)" }}>{displayDept}</span>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
                  <span style={{ fontFamily: "monospace", color: "var(--accent-blue)", fontSize: 12, fontWeight: 600 }}>ID: {displayId}</span>
                </div>
              </div>
            </div>

            {/* Action buttons (IT02-016) */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={handleCancelClick}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Hủy bỏ / Quay lại
              </button>

              {step === "done" && (
                <button
                  type="button"
                  onClick={handleSaveAndActivate}
                  disabled={saved}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: saved ? "rgba(0,212,170,0.4)" : "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 700, cursor: saved ? "default" : "pointer", boxShadow: "0 4px 16px rgba(0,212,170,0.3)", transition: "all 0.2s" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  {saved ? "Đang chuyển hướng..." : "Lưu vector & Hoàn tất kích hoạt"}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
            {/* ── Left: Camera + controls ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

              {/* Camera viewport (IT02-002, IT02-015) */}
              <div style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${step === "scanning" ? "rgba(0,212,170,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: 16, overflow: "hidden", position: "relative", transition: "border-color 0.3s" }}>
                {/* Status bar */}
                <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.4)" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: step === "scanning" ? "var(--accent-teal)" : "var(--text-muted)", letterSpacing: "0.1em" }}>
                      CAM #01 • ENROLLMENT
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>FHD 60FPS</span>
                    {step === "scanning" && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-teal)" }}>⏱ {elapsed}s</span>}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {step === "scanning" && (
                      <>
                        <span style={{ fontSize: 11, background: "rgba(255,255,255,0.08)", padding: "3px 8px", borderRadius: 6, color: "var(--text-secondary)" }}>Lux: 450</span>
                        <span style={{ fontSize: 11, background: "rgba(255,255,255,0.08)", padding: "3px 8px", borderRadius: 6, color: "var(--text-secondary)" }}>Khoảng cách: 0.8m</span>
                      </>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)" }}>AI ACCESS • SECURE CONTROL</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                    {new Date().toLocaleDateString("vi-VN")} {new Date().toLocaleTimeString("vi-VN")}
                  </span>
                </div>

                {/* Main feed area */}
                <div style={{ height: 340, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", overflow: "hidden" }}>
                  {/* Real video feed */}
                  <video ref={videoRef} autoPlay playsInline muted style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", opacity: step === "done" ? 0.3 : 1, transition: "opacity 0.4s" }} />

                  {/* Corner brackets */}
                  {["TL","TR","BL","BR"].map(c => (
                    <div key={c} style={{ position: "absolute", width: 24, height: 24, ...(c.includes("T") ? { top: 20 } : { bottom: 20 }), ...(c.includes("L") ? { left: 20 } : { right: 20 }), borderTop: c.includes("T") ? `2px solid ${step === "scanning" ? "var(--accent-teal)" : "rgba(255,255,255,0.2)"}` : "none", borderBottom: c.includes("B") ? `2px solid ${step === "scanning" ? "var(--accent-teal)" : "rgba(255,255,255,0.2)"}` : "none", borderLeft: c.includes("L") ? `2px solid ${step === "scanning" ? "var(--accent-teal)" : "rgba(255,255,255,0.2)"}` : "none", borderRight: c.includes("R") ? `2px solid ${step === "scanning" ? "var(--accent-teal)" : "rgba(255,255,255,0.2)"}` : "none", transition: "border-color 0.3s", zIndex: 10 }} />
                  ))}

                  {/* Cam error overlay (IT02-015) */}
                  {camError && (
                    <div style={{ position: "absolute", zIndex: 30, background: "rgba(20,5,5,0.92)", border: "1px solid rgba(239,68,68,0.5)", color: "white", padding: "20px 24px", borderRadius: 14, textAlign: "center", maxWidth: 420, boxShadow: "0 10px 30px rgba(0,0,0,0.8)" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#ef4444", marginBottom: 6 }}>Lỗi kết nối Camera</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, marginBottom: 14 }}>{camError}</div>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => startCam(user?.selectedCameraId)}
                          style={{ padding: "8px 18px", background: "linear-gradient(135deg,#00C6FF,#0072FF)", border: "none", borderRadius: 8, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        >
                          🔄 Thử kết nối lại
                        </button>
                      </div>
                    </div>
                  )}

                  {step === "idle" && !camError && (
                    <div style={{ position: "absolute", zIndex: 10, textAlign: "center", background: "rgba(0,0,0,0.65)", padding: "18px 28px", borderRadius: 14, backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "white", letterSpacing: "0.06em" }}>
                        CAM {user?.selectedCameraId ? "ĐÃ KẾT NỐI" : "MẶC ĐỊNH"} • SẴN SÀNG
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                        Nhấn "Bắt đầu thu nạp" để kích hoạt mô hình ArcFace thu thập 30 khung hình
                      </div>
                    </div>
                  )}

                  {step === "scanning" && (
                    <>
                      {/* Face bounding box / mesh overlay */}
                      <div style={{ position: "absolute", zIndex: 2, textAlign: "center" }}>
                        <div style={{ width: 140, height: 180, border: "2px solid rgba(0,212,170,0.7)", borderRadius: "50%", boxShadow: "0 0 30px rgba(0,212,170,0.3) inset", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(0,212,170,0.4)" strokeWidth="1"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
                        </div>
                        <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: "var(--accent-teal)", padding: "6px 16px", background: "rgba(0,212,170,0.15)", borderRadius: 20, display: "inline-block", letterSpacing: "0.05em", backdropFilter: "blur(4px)", border: "1px solid rgba(0,212,170,0.3)" }}>
                          {hudFeedback}
                        </div>
                      </div>
                      {/* Scan line */}
                      <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,var(--accent-teal),transparent)", top: `${progress}%`, transition: "top 0.17s linear", boxShadow: "0 0 14px rgba(0,212,170,0.6)", pointerEvents: "none", zIndex: 10 }} />
                      {/* Overlay mini stats */}
                      <div style={{ position: "absolute", bottom: 14, left: 16, display: "flex", gap: 8, zIndex: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "white", background: "rgba(0,0,0,0.7)", padding: "3px 8px", borderRadius: 6 }}>🔒 AES-256</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-teal)", background: "rgba(0,0,0,0.7)", padding: "3px 8px", borderRadius: 6 }}>● REC: {frames}/30</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-blue)", background: "rgba(0,0,0,0.7)", padding: "3px 8px", borderRadius: 6 }}>USER: {displayId}</div>
                      </div>
                    </>
                  )}

                  {step === "done" && (
                    <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease", zIndex: 10, background: "rgba(0,0,0,0.6)", padding: "30px 36px", borderRadius: 20, backdropFilter: "blur(8px)", border: "1px solid rgba(0,212,170,0.3)" }}>
                      <div style={{ fontSize: 54, marginBottom: 8 }}>✅</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent-teal)", marginBottom: 4 }}>Thu nạp hoàn tất!</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Đã thu thập đủ 30/30 khung hình hợp lệ • Vector 512-D đã mã hóa</div>
                      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "var(--accent-teal)", padding: "6px 16px", background: "rgba(0,212,170,0.12)", borderRadius: 20, display: "inline-block", border: "1px solid rgba(0,212,170,0.25)" }}>
                        LIVENESS 3D DETECTION: PASSED (100%)
                      </div>
                    </div>
                  )}
                </div>

                {/* Camera footer controls (IT02-015 test helper) */}
                <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10, background: "rgba(0,0,0,0.3)", alignItems: "center", flexWrap: "wrap" }}>
                  {step === "scanning" && (
                    <span style={{ fontSize: 12, color: "var(--accent-teal)", fontWeight: 600 }}>
                      ● Đang thu nhận mẫu sinh trắc học thời gian thực
                    </span>
                  )}
                  {/* Test action: Simulate camera disconnect (IT02-015) */}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                    {step === "scanning" && (
                      <button
                        type="button"
                        onClick={handleCamDisconnect}
                        style={{ fontSize: 11, padding: "4px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, color: "#ef4444", cursor: "pointer" }}
                      >
                        ⚡ Test ngắt kết nối Camera (IT02-015)
                      </button>
                    )}
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Auto-capture: Bật (ArcFace 3D)
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress section (IT02-006, IT02-011, IT02-012) */}
              <div style={{ background: "rgba(20,25,35,0.5)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Tiến trình thu nạp mẫu ảnh</span>
                    {step !== "idle" && <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(59,130,246,0.1)", color: "var(--accent-blue)", border: "1px solid rgba(59,130,246,0.2)" }}>ArcFace 3D Mesh</span>}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: step === "done" ? "var(--accent-teal)" : "var(--accent-blue)" }}>
                    {frames} / 30 khung hình ({progress}%)
                  </div>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: step === "done" ? "linear-gradient(90deg,#00D4AA,#3B82F6)" : "linear-gradient(90deg,#00C6FF,#0072FF)", borderRadius: 4, transition: "width 0.2s" }} />
                </div>

                {/* Angle cards (IT02-006) */}
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                  GÓC QUAY MẪU NHẬN DIỆN THỜI GIAN THỰC (HEAD POSE GUIDANCE):
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {ANGLE_STEPS.map((a, i) => {
                    const done   = frames >= a.threshold;
                    const active = !done && (i === 0 ? frames < a.threshold : frames >= ANGLE_STEPS[i - 1].threshold && frames < a.threshold);
                    return (
                      <div key={i} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center", background: done ? "rgba(0,212,170,0.08)" : active ? "rgba(0,198,255,0.08)" : "rgba(255,255,255,0.025)", border: `1px solid ${done ? "rgba(0,212,170,0.3)" : active ? "rgba(0,198,255,0.35)" : "rgba(255,255,255,0.07)"}`, transition: "all 0.2s" }}>
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{done ? "✅" : active ? "⟳" : a.icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: done ? "var(--accent-teal)" : active ? "var(--accent-blue)" : "var(--text-muted)", lineHeight: 1.3 }}>{a.label}</div>
                        <div style={{ fontSize: 10, color: done ? "var(--accent-teal)" : active ? "var(--accent-blue)" : "var(--text-muted)", marginTop: 3 }}>
                          {done ? "Đạt (100%)" : active ? "Đang nạp..." : "Chờ quét"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Start button (IT02-003) */}
              {step === "idle" && (
                <button
                  type="button"
                  onClick={startScan}
                  style={{ padding: "14px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 12, color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,212,170,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3h4M3 5v4M19 3h-4M21 5v4M5 21h4M3 19v-4M19 21h-4M21 19v-4"/><circle cx="12" cy="12" r="3"/></svg>
                  🚀 Bắt đầu thu nạp khuôn mặt
                </button>
              )}
            </div>

            {/* ── Right panel ── */}
            <div style={{ width: 290, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>

              {/* Quality panel (IT02-007, IT02-008, IT02-009, IT02-010: Realtime) */}
              <div style={{ background: "rgba(20,25,35,0.5)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Chất lượng mẫu sinh trắc</div>
                  {step !== "idle" && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Tổng điểm:</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: step === "done" ? "var(--accent-teal)" : "var(--accent-blue)", lineHeight: 1 }}>
                        {quality.total}<span style={{ fontSize: 12 }}>/100</span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                  {step === "done" ? "Thuật toán ArcFace ResNet-100 (Hoàn tất)" : step === "scanning" ? "Đang phân tích khung hình realtime..." : "Chờ bắt đầu thu nạp..."}
                </div>

                {[
                  { label: "Độ sắc nét ảnh (IT02-007)", val: quality.sharp,   color: "var(--accent-teal)" },
                  { label: "Độ mở mắt iris (IT02-008)", val: quality.iris,    color: "var(--accent-teal)" },
                  { label: "Không che khuất (IT02-009)", val: quality.occlude, color: "var(--accent-teal)" },
                  { label: "Chống giả mạo 3D (IT02-010)", val: quality.anti,  color: "var(--accent-blue)" },
                ].map(m => (
                  <div key={m.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{m.label}</span>
                      <span style={{ fontWeight: 600, color: m.val > 0 ? m.color : "var(--text-muted)" }}>
                        {m.val > 0 ? `${m.val}%` : "—"}
                      </span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${m.val}%`, height: "100%", background: m.color, borderRadius: 2, transition: "width 0.2s ease" }} />
                    </div>
                  </div>
                ))}

                {step === "done" && (
                  <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.2)", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "var(--accent-teal)" }}>
                    ✓ Liveness Detection: PASSED<br />
                    <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(Nhận diện thực thể sống 3D chuẩn xác)</span>
                  </div>
                )}
              </div>

              {/* Vector panel (IT02-013: Processing states) */}
              <div style={{ background: "rgba(20,25,35,0.5)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Mô phỏng Vector đặc trưng</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: 5 }}>AES-256</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>512-D Embedding Vector Space</div>

                {/* Waveform viz */}
                <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 40, marginBottom: 10 }}>
                  {Array.from({ length: 30 }).map((_, i) => {
                    const h = step === "done"
                      ? 8 + Math.abs(Math.sin(i * 0.7) * 28)
                      : step === "scanning"
                      ? 6 + Math.abs(Math.sin((i + frames) * 0.8) * 26)
                      : 4;
                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: `${h}px`,
                          background: step === "done"
                            ? (i % 3 === 0 ? "var(--accent-teal)" : "var(--accent-blue)")
                            : step === "scanning"
                            ? "var(--accent-blue)"
                            : "rgba(255,255,255,0.1)",
                          borderRadius: 2,
                          transition: "height 0.15s ease",
                        }}
                      />
                    );
                  })}
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: "var(--text-muted)" }}>Trạng thái trích xuất:</span>
                    {step === "done" && <span style={{ color: "var(--accent-teal)", fontWeight: 600 }}>Cosine Norm: 1.000</span>}
                    {step === "scanning" && <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>Đang xử lý {progress}%</span>}
                    {step === "idle" && <span style={{ color: "var(--text-muted)" }}>Chờ khởi tạo</span>}
                  </div>
                </div>

                {step === "scanning" && (
                  <div style={{ fontSize: 10, color: "var(--accent-blue)", fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.6, padding: "6px 8px", background: "rgba(0,114,255,0.06)", borderRadius: 6, border: "1px dashed rgba(0,114,255,0.2)" }}>
                    [{(Math.sin(frames * 0.4)).toFixed(4)}, {(Math.cos(frames * 0.3)).toFixed(4)}, {(Math.sin(frames * 0.8) * -0.2).toFixed(4)}, ...]
                  </div>
                )}

                {step === "done" && (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.6 }}>
                    [-0.0428, 0.1852, -0.0911, 0.3129, 0.0045, 0.2317, -0.1089, 0.0734, ...]
                  </div>
                )}

                {step === "done" && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(0,198,255,0.06)", borderRadius: 8, fontSize: 11, color: "var(--text-muted)", border: "1px solid rgba(0,198,255,0.15)" }}>
                    🔒 Gắn định danh: <strong style={{ color: "var(--accent-blue)" }}>{displayId}</strong> • Sẵn sàng nạp Vector DB
                  </div>
                )}
              </div>

              {/* Door sync panel (IT02-014: Online vs Offline states) */}
              <div style={{ background: "rgba(20,25,35,0.5)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Đồng bộ thiết bị cửa</div>
                  <span
                    onClick={() => setDoorStatus(d => d === "online" ? "offline" : "online")}
                    title="Bấm để chuyển đổi Online / Offline phục vụ kiểm thử IT02-014"
                    style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, cursor: "pointer",
                      background: doorStatus === "online" ? "rgba(0,212,170,0.12)" : "rgba(239,68,68,0.15)",
                      color: doorStatus === "online" ? "var(--accent-teal)" : "#ef4444",
                      border: `1px solid ${doorStatus === "online" ? "rgba(0,212,170,0.3)" : "rgba(239,68,68,0.3)"}`,
                    }}
                  >
                    {doorStatus === "online" ? "● 3/3 Trực tuyến" : "○ 0/3 Ngoại tuyến"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                  <span>Edge Controllers Auto-Sync</span>
                  <span style={{ fontSize: 10, color: "var(--accent-blue)", cursor: "pointer" }} onClick={() => setDoorStatus(d => d === "online" ? "offline" : "online")}>
                    (Đổi chế độ test)
                  </span>
                </div>

                {doorStatus === "offline" && (
                  <div style={{ marginBottom: 10, padding: "8px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 11, color: "#ef4444", lineHeight: 1.4 }}>
                    ⚠️ Thiết bị ngoại tuyến. Dữ liệu enrollment sẽ được lưu trữ cục bộ và đồng bộ khi kết nối lại.
                  </div>
                )}

                {DOOR_CONTROLLERS.map(d => (
                  <div key={d.name} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{d.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                          {d.ip} • {d.proto} {doorStatus === "online" ? `(${d.latency})` : ""}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 600,
                          color: doorStatus === "offline"
                            ? "#ef4444"
                            : step === "done"
                            ? "var(--accent-teal)"
                            : step === "scanning"
                            ? "var(--accent-blue)"
                            : "var(--text-muted)",
                        }}
                      >
                        {doorStatus === "offline" ? "Mất kết nối" : step === "done" ? "Sẵn sàng" : step === "scanning" ? "Kênh an toàn" : "Chờ..."}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Auto-activate info */}
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, cursor: "pointer" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: "var(--accent-blue)", border: "1px solid var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Tự động kích hoạt thẻ cho #{displayId} khi lưu</span>
                </label>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation Modal when canceling during scan (IT02-016) */}
      {showCancelModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#111722", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, width: "100%", maxWidth: 440, overflow: "hidden", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#ef4444" }}>
                ⚠️
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Xác nhận hủy phiên thu nạp?</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Tiến trình chưa hoàn tất</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              Hệ thống đang trong quá trình thu thập mẫu khuôn mặt (đã thu được <strong style={{ color: "var(--accent-blue)" }}>{frames}/30 khung hình</strong>).
              Nếu bạn hủy bỏ lúc này, dữ liệu chưa hoàn tất sẽ không được lưu và hồ sơ sẽ giữ trạng thái <em>Chờ nạp Face</em>.
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Tiếp tục thu nạp
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                style={{ flex: 1, padding: "10px", background: "#ef4444", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
        input, select { color-scheme: dark; }
      ` }} />
    </div>
  );
}
