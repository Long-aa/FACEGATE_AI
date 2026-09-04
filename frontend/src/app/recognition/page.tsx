"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

const recentHistory = [
  { name: "Trần Thị B", code: "EMP042", time: "08:38:12", status: "granted" },
  { name: "Nguyễn Văn C", code: "EMP019", time: "08:35:44", status: "granted" },
  { name: "Người lạ", code: "UNKNOWN", time: "08:31:07", status: "denied" },
  { name: "Lê Minh D", code: "EMP088", time: "08:28:33", status: "granted" },
];

export default function RecognitionPage() {
  const [scanAngle, setScanAngle] = useState(0);
  const [scanLine, setScanLine] = useState(20);
  const [showToast, setShowToast] = useState(true);
  const [confidence] = useState(96.8);
  const [time, setTime] = useState("08:32:15");
  const [boxPulse, setBoxPulse] = useState(false);

  useEffect(() => {
    const t1 = setInterval(() => setScanLine((v) => (v + 1) % 100), 25);
    const t2 = setInterval(() => setScanAngle((v) => (v + 1) % 360), 16);
    const t3 = setInterval(() => setBoxPulse((v) => !v), 1200);
    const t4 = setTimeout(() => setShowToast(false), 6000);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); clearTimeout(t4); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", gap: 20 }}>

          {/* Camera Feed */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div style={{
              position: "relative", background: "#050d18", borderRadius: 16, overflow: "hidden",
              border: "1px solid var(--border)", flex: 1, minHeight: 400,
            }}>
              {/* Fake CCTV background */}
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 40% 50%, #0d2035 0%, #050d18 60%)" }} />

              {/* Architectural elements (simulated) */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(180deg, transparent, rgba(5,13,24,0.8))" }} />

              {/* Grid overlay */}
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,170,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

              {/* Scan line */}
              <div style={{ position: "absolute", left: 0, right: 0, top: `${scanLine}%`, height: 1, background: "linear-gradient(90deg, transparent 10%, rgba(0,212,170,0.5) 50%, transparent 90%)", pointerEvents: "none" }} />

              {/* Face detection box */}
              <div style={{
                position: "absolute", left: "30%", top: "20%", width: 200, height: 240,
                border: `1px solid ${boxPulse ? "rgba(0,212,170,0.9)" : "rgba(0,212,170,0.5)"}`,
                boxShadow: boxPulse ? "0 0 20px rgba(0,212,170,0.4), inset 0 0 20px rgba(0,212,170,0.05)" : "none",
                transition: "all 0.5s ease",
              }}>
                {/* Corners */}
                {[{ t: -1, l: -1 }, { t: -1, r: -1 }, { b: -1, l: -1 }, { b: -1, r: -1 }].map((c, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    ...(c.t !== undefined ? { top: c.t } : { bottom: c.b }),
                    ...(c.l !== undefined ? { left: c.l } : { right: c.r }),
                    width: 16, height: 16,
                    borderTop: c.t !== undefined ? "2px solid var(--accent-teal)" : "none",
                    borderBottom: c.b !== undefined ? "2px solid var(--accent-teal)" : "none",
                    borderLeft: c.l !== undefined ? "2px solid var(--accent-teal)" : "none",
                    borderRight: c.r !== undefined ? "2px solid var(--accent-teal)" : "none",
                  }} />
                ))}
                {/* Confidence label */}
                <div style={{
                  position: "absolute", bottom: -34, left: "50%", transform: "translateX(-50%)",
                  background: "rgba(0,0,0,0.8)", border: "1px solid rgba(0,212,170,0.4)", borderRadius: 6,
                  padding: "4px 10px", backdropFilter: "blur(8px)",
                }}>
                  <div style={{ fontSize: 9, color: "var(--accent-teal)", fontWeight: 700, letterSpacing: "0.1em" }}>CONFIDENCE</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "white", textAlign: "center" }}>{confidence}%</div>
                </div>
                {/* Scanning crosshair */}
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 40, height: 40 }}>
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(0,212,170,0.3)" strokeWidth="1" strokeDasharray="4 4" style={{ transformOrigin: "20px 20px", transform: `rotate(${scanAngle}deg)` }} />
                    <circle cx="20" cy="20" r="2" fill="var(--accent-teal)" />
                  </svg>
                </div>
              </div>

              {/* Top bar overlay */}
              <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", borderRadius: 8, padding: "5px 12px" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-red)", animation: "blink 1s infinite" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "white", letterSpacing: "0.05em" }}>MAIN ENTRANCE - CAM 01</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["1080p", "60fps", "H.265"].map((tag) => (
                    <span key={tag} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", borderRadius: 4, color: "var(--accent-teal)", border: "1px solid rgba(0,212,170,0.3)" }}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* Bottom status */}
              <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", borderRadius: 20, padding: "7px 18px", border: "1px solid rgba(0,212,170,0.2)" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent-teal)", animation: "blink 1.2s infinite" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.05em" }}>ĐANG QUÉT KHUÔN MẶT...</span>
              </div>

              {/* Toast notification */}
              {showToast && (
                <div style={{
                  position: "absolute", bottom: 60, right: 16, background: "rgba(17,24,39,0.95)", backdropFilter: "blur(12px)",
                  border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start",
                  maxWidth: 240, boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                  animation: "fadeInUp 0.3s ease",
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Thành công</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Đã gửi lệnh mở cửa chốt 1.</div>
                  </div>
                  <button onClick={() => setShowToast(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 16, flexShrink: 0 }}>
            {/* Recognition info */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" strokeWidth="2"><circle cx="12" cy="8" r="5"/><path d="M3 21a9 9 0 0 1 18 0"/></svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Thông tin nhận diện</span>
              </div>

              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Avatar */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#0d2035,#1a3a5c)", border: "3px solid var(--accent-teal)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "var(--accent-teal)", boxShadow: "0 0 20px rgba(0,212,170,0.4)" }}>
                      VA
                    </div>
                    <div style={{ position: "absolute", bottom: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "var(--accent-green)", border: "2px solid var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Nguyễn Văn A</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>ID: EMP001</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 20 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-green)" }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-green)" }}>ĐƯỢC PHÉP TRUY CẬP</span>
                  </div>
                </div>

                {/* Info grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Vai trò", value: "Nhân viên" },
                    { label: "Độ chính xác", value: `${confidence}%`, highlight: true },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: highlight ? "var(--accent-teal)" : "var(--text-primary)", marginTop: 4 }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Time */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Thời gian nhận diện</div>
                  <div suppressHydrationWarning style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{time} AM</div>
                </div>

                {/* Open door button */}
                <button style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 12, color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(0,212,170,0.35)" }}
                  onClick={() => setShowToast(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                  Mở cửa
                </button>
              </div>
            </div>

            {/* Recent history */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Lịch sử gần đây</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div style={{ padding: "8px" }}>
                {recentHistory.map((h, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 8, marginBottom: 4, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: h.status === "denied" ? "rgba(239,68,68,0.2)" : "linear-gradient(135deg,#00D4AA,#3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: h.status === "denied" ? "var(--accent-red)" : "white", flexShrink: 0 }}>
                      {h.code === "UNKNOWN" ? "?" : h.name.split(" ").map((n) => n[0]).slice(-2).join("")}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: h.status === "denied" ? "var(--accent-red)" : "var(--text-primary)" }}>{h.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{h.code}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{h.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
