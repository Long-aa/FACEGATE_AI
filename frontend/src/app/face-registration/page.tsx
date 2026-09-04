"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

type Step = 1 | 2 | 3 | 4;

const POSES = [
  { key: "straight", label: "Nhìn thẳng" },
  { key: "left", label: "Quay trái" },
  { key: "right", label: "Quay phải" },
  { key: "up", label: "Nhìn lên" },
  { key: "down", label: "Nhìn xuống" },
  { key: "smile", label: "Mím cười" },
];

export default function FaceRegistrationPage() {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState({ name: "", employeeId: "", department: "", position: "" });
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(0);
  const [currentPose, setCurrentPose] = useState(0);
  const [completedPoses, setCompletedPoses] = useState<number[]>([]);
  const [scanLine, setScanLine] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalPhotos = 30;
  const progress = Math.round((captured / totalPhotos) * 100);

  // Animate scan line
  useEffect(() => {
    if (capturing) {
      scanRef.current = setInterval(() => {
        setScanLine((prev) => (prev + 2) % 100);
      }, 30);
    } else {
      if (scanRef.current) clearInterval(scanRef.current);
    }
    return () => { if (scanRef.current) clearInterval(scanRef.current); };
  }, [capturing]);

  // Simulate capture
  useEffect(() => {
    if (capturing && captured < totalPhotos) {
      intervalRef.current = setInterval(() => {
        setCaptured((prev) => {
          const next = prev + 1;
          // Advance pose every 5 photos
          const poseIdx = Math.floor(next / 5);
          setCurrentPose(Math.min(poseIdx, POSES.length - 1));
          if (next % 5 === 0 && poseIdx > 0) {
            setCompletedPoses((cp) => [...new Set([...cp, poseIdx - 1])]);
          }
          if (next >= totalPhotos) {
            setCapturing(false);
            setCompletedPoses([0, 1, 2, 3, 4, 5]);
          }
          return next;
        });
      }, 200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [capturing, captured]);

  const steps = [
    { n: 1, label: "Thông tin" },
    { n: 2, label: "Camera" },
    { n: 3, label: "Thu thập" },
    { n: 4, label: "Hoàn tất" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Title */}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Đăng ký khuôn mặt mới</h1>
          </div>

          {/* Steps */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, position: "relative", maxWidth: 600 }}>
            {steps.map((s, i) => {
              const done = (s.n as number) < step;
              const active = s.n === step;
              return (
                <React.Fragment key={s.n}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 1 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      background: done ? "var(--accent-teal)" : active ? "linear-gradient(135deg,#00D4AA,#3B82F6)" : "rgba(255,255,255,0.05)",
                      color: done || active ? "white" : "var(--text-muted)",
                      border: active ? "2px solid rgba(0,212,170,0.5)" : done ? "none" : "1px solid var(--border)",
                      boxShadow: active ? "0 0 20px rgba(0,212,170,0.5)" : "none",
                      transform: active ? "scale(1.1)" : "scale(1)",
                    }}>
                      {done ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : s.n}
                    </div>
                    <span style={{ fontSize: 11, color: active ? "var(--accent-teal)" : done ? "var(--text-secondary)" : "var(--text-muted)", fontWeight: active ? 600 : 400 }}>
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: done ? "var(--accent-teal)" : "rgba(255,255,255,0.08)", transition: "background 0.4s", marginBottom: 20 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Step 1 - Info form */}
          {step === 1 && (
            <div style={{ maxWidth: 560, background: "rgba(255, 255, 255, 0.02)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", animation: "fadeInUp 0.4s ease-out" }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Thông tin nhân viên</h2>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Nhập thông tin cơ bản của nhân viên cần đăng ký</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { key: "name", label: "Họ và tên", placeholder: "Nguyễn Văn A" },
                  { key: "employeeId", label: "Mã nhân viên", placeholder: "EMP-XXXX" },
                  { key: "department", label: "Phòng ban", placeholder: "IT, HR, Sales..." },
                  { key: "position", label: "Chức vụ", placeholder: "Staff, Manager, Admin..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>{label}</label>
                    <input
                      value={formData[key as keyof typeof formData]}
                      onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none", transition: "all 0.2s" }}
                      onFocus={(e) => { e.target.style.borderColor = "var(--accent-teal)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,212,170,0.15)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button 
                  onClick={() => setStep(2)} 
                  style={{ padding: "10px 28px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,212,170,0.3)", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,212,170,0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,212,170,0.3)"; }}
                >
                  Tiếp theo →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 - Camera setup */}
          {step === 2 && (
            <div style={{ maxWidth: 560, background: "rgba(255, 255, 255, 0.02)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", animation: "fadeInUp 0.4s ease-out" }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Chọn camera</h2>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Chọn thiết bị camera để thu thập dữ liệu khuôn mặt</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {["Camera chính (USB 0)", "Camera IP - Cổng chính", "Webcam tích hợp"].map((cam, i) => (
                  <label key={cam} 
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: i === 0 ? "rgba(0,212,170,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${i === 0 ? "rgba(0,212,170,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { if(i !== 0) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; } }}
                    onMouseLeave={(e) => { if(i !== 0) { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; } }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${i === 0 ? "var(--accent-teal)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {i === 0 && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-teal)" }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{cam}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>1920×1080 • 30fps</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: i < 2 ? "var(--accent-green)" : "var(--accent-red)" }} />
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button 
                  onClick={() => setStep(1)} 
                  style={{ padding: "10px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >← Quay lại</button>
                <button 
                  onClick={() => setStep(3)} 
                  style={{ padding: "10px 28px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,212,170,0.3)", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,212,170,0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,212,170,0.3)"; }}
                >Tiếp theo →</button>
              </div>
            </div>
          )}

          {/* Step 3 - Capture */}
          {step === 3 && (
            <div style={{ display: "flex", gap: 24, animation: "fadeInUp 0.4s ease-out" }}>
              {/* Camera view */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Camera feed */}
                <div style={{
                  position: "relative", background: "#070d1a", border: "1px solid rgba(0,212,170,0.2)", borderRadius: 20, overflow: "hidden",
                  aspectRatio: "16/10", boxShadow: "0 15px 50px rgba(0,0,0,0.4), inset 0 0 30px rgba(0,0,0,0.6)",
                }}>
                  {/* Fake camera background with gradient */}
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, #0d1f35 0%, #050b14 70%)" }} />

                  {/* Grid overlay */}
                  <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

                  {/* Face detection frame */}
                  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-55%)", width: 180, height: 220 }}>
                    {/* Animated corners */}
                    {[{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }].map((pos, i) => (
                      <div key={i} style={{
                        position: "absolute", ...pos, width: 24, height: 24,
                        borderTop: i < 2 ? "2px solid var(--accent-teal)" : "none",
                        borderBottom: i >= 2 ? "2px solid var(--accent-teal)" : "none",
                        borderLeft: i % 2 === 0 ? "2px solid var(--accent-teal)" : "none",
                        borderRight: i % 2 === 1 ? "2px solid var(--accent-teal)" : "none",
                        boxShadow: "0 0 10px rgba(0,212,170,0.5)",
                      }} />
                    ))}
                    {/* Dashed border */}
                    <div style={{ position: "absolute", inset: 0, border: "1px dashed rgba(0,212,170,0.3)", borderRadius: 4 }} />
                    {/* Fake face shape */}
                    <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 110, height: 130, borderRadius: "50%", background: "rgba(0,212,170,0.04)", border: "1px solid rgba(0,212,170,0.15)" }} />
                  </div>

                  {/* Scan line */}
                  {capturing && (
                    <div style={{ position: "absolute", left: 0, right: 0, top: `${scanLine}%`, height: 1, background: "linear-gradient(90deg, transparent, var(--accent-teal), transparent)", opacity: 0.7 }} />
                  )}

                  {/* Status badge */}
                  <div style={{ position: "absolute", top: 14, left: 14, display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", borderRadius: 20, border: "1px solid rgba(0,212,170,0.3)" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: capturing ? "var(--accent-teal)" : "var(--accent-orange)", animation: capturing ? "blink 1s infinite" : "none" }} />
                    <span style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 500 }}>{capturing ? "ĐANG QUÉT" : "SẴN SÀNG"}</span>
                  </div>

                  {/* Instruction overlay */}
                  <div style={{ position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)", textAlign: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", borderRadius: 10, padding: "8px 16px" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "white" }}>
                      {capturing ? POSES[currentPose].label : "Đưa khuôn mặt vào giữa khung"}
                    </div>
                  </div>

                  {/* Corner label */}
                  <div style={{ position: "absolute", bottom: 14, right: 14, fontSize: 10, color: "rgba(0,212,170,0.6)", fontWeight: 500 }}>
                    FaceGate AI v3.5
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => { setCapturing(false); setCaptured(0); setCompletedPoses([]); setCurrentPose(0); setStep(2); }}
                    style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => captured >= totalPhotos ? setStep(4) : setCapturing((c) => !c)}
                    style={{
                      flex: 1, padding: "12px", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
                      background: captured >= totalPhotos ? "linear-gradient(135deg,#22C55E,#00D4AA)" : capturing ? "linear-gradient(135deg,#F97316,#EF4444)" : "linear-gradient(135deg,#00D4AA,#3B82F6)",
                      color: "white", boxShadow: capturing ? "0 8px 25px rgba(239,68,68,0.4)" : "0 8px 25px rgba(0,212,170,0.4)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.filter = "brightness(1.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.filter = "brightness(1)"; }}
                  >
                    {captured >= totalPhotos ? "✓ Hoàn tất" : capturing ? "Dừng thu thập" : "Bắt đầu thu thập"}
                  </button>
                </div>
              </div>

              {/* Right: status panel */}
              <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Progress */}
                <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Trạng thái thu thập</div>

                  {/* Circle progress */}
                  <div style={{ position: "relative", width: 100, height: 100 }}>
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="42" fill="none" stroke="url(#prog)" strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        style={{ transition: "stroke-dashoffset 0.3s ease" }}
                      />
                      <defs>
                        <linearGradient id="prog" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#00D4AA" />
                          <stop offset="100%" stopColor="#3B82F6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-teal)" }}>{progress}%</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Đã thu thập: {captured}/{totalPhotos} ảnh</div>
                </div>

                {/* Poses */}
                <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px", display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
                  {POSES.map((pose, i) => {
                    const done = completedPoses.includes(i);
                    const active = i === currentPose && capturing && !done;
                    return (
                      <div key={pose.key} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 10px", borderRadius: 8, transition: "all 0.2s",
                        background: active ? "rgba(0,212,170,0.08)" : done ? "rgba(34,197,94,0.06)" : "transparent",
                        border: `1px solid ${active ? "rgba(0,212,170,0.25)" : done ? "rgba(34,197,94,0.15)" : "transparent"}`,
                      }}>
                        <span style={{ fontSize: 13, color: active ? "var(--accent-teal)" : done ? "var(--text-secondary)" : "var(--text-muted)", fontWeight: active ? 600 : 400 }}>
                          {pose.label}
                        </span>
                        {done ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : active ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" strokeWidth="2">
                            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                          </svg>
                        ) : (
                          <div style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid var(--border)" }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 4 - Complete */}
          {step === 4 && (
            <div style={{ maxWidth: 520, margin: "0 auto", background: "rgba(255,255,255,0.02)", backdropFilter: "blur(10px)", border: "1px solid rgba(0,212,170,0.3)", borderRadius: 20, padding: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center", boxShadow: "0 20px 60px rgba(0,212,170,0.15)", animation: "fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(34,197,94,0.25)" }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Đăng ký thành công!</h2>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Dữ liệu khuôn mặt đã được thu thập và lưu vào hệ thống AI.</p>
              </div>
              <div style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Nhân viên", value: formData.name || "Nguyễn Văn An" },
                  { label: "Mã NV", value: formData.employeeId || "EMP-2041" },
                  { label: "Ảnh thu thập", value: `${totalPhotos} ảnh` },
                  { label: "Trạng thái", value: "Đã đồng bộ" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 16, width: "100%", marginTop: 8 }}>
                <button onClick={() => { setStep(1); setCaptured(0); setCompletedPoses([]); setCurrentPose(0); setCapturing(false); setFormData({ name: "", employeeId: "", department: "", position: "" }); }}
                  style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  Đăng ký mới
                </button>
                <button style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 12, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,212,170,0.3)", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,212,170,0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,212,170,0.3)"; }}
                >
                  Xem danh sách
                </button>
              </div>
            </div>
          )}
          {/* Animations styles */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
          `}} />
        </main>
      </div>
    </div>
  );
}
