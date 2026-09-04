"use client";

import React, { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface StatCard {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  change: string;
  changeLabel: string;
  accent: string;
  trend: "up" | "down";
}

interface AccessLog {
  time: string;
  user: string;
  result: "GRANTED" | "DENIED";
}

// ─────────────────────────────────────────────
// Helper: animated counter
// ─────────────────────────────────────────────
function useCounter(target: number, duration = 1200) {
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

// ─────────────────────────────────────────────
// Stat Card Component
// ─────────────────────────────────────────────
function StatCardItem({ card, delay }: { card: StatCard; delay: number }) {
  const count = useCounter(card.value);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)"
          : "rgba(255,255,255,0.025)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 14,
        padding: "18px 20px",
        cursor: "default",
        transition: "all 0.25s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
        animation: `fadeInUp 0.5s ease ${delay}ms both`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow accent top-right */}
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: card.accent,
          opacity: 0.06,
          filter: "blur(20px)",
          transition: "opacity 0.3s",
        }}
      />

      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${card.accent}18`,
            border: `1px solid ${card.accent}30`,
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
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: card.trend === "up" ? "#22C55E" : "#EF4444",
            background: card.trend === "up" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            padding: "3px 8px",
            borderRadius: 20,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {card.trend === "up" ? (
              <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>
            ) : (
              <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>
            )}
          </svg>
          {card.change}
        </div>
      </div>

      {/* Change label */}
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 500 }}>{card.changeLabel}</div>

      {/* Label */}
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{card.label}</div>

      {/* Value */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {count.toLocaleString("vi-VN")}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Live Camera Feed
// ─────────────────────────────────────────────
function LiveCameraFeed() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [fps, setFps] = useState(30);
  const timeRef = useRef(0);
  const frameCount = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let boxX = 180, boxY = 80, boxW = 120, boxH = 160;
    let targetX = boxX, targetY = boxY;
    let scanY = 0;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const draw = (ts: number) => {
      const dt = ts - timeRef.current;
      timeRef.current = ts;
      frameCount.current++;

      if (frameCount.current % 60 === 0) {
        setFps(Math.round(1000 / dt));
        targetX = 160 + Math.random() * 40 - 20;
        targetY = 70 + Math.random() * 20 - 10;
      }

      boxX = lerp(boxX, targetX, 0.05);
      boxY = lerp(boxY, targetY, 0.05);
      scanY = (scanY + 0.8) % canvas.height;

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Background gradient (simulate CCTV)
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0D1A2D");
      bg.addColorStop(0.5, "#112030");
      bg.addColorStop(1, "#0A1520");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Noise grain
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.02})`;
        ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
      }

      // Floor perspective
      ctx.fillStyle = "rgba(30,50,80,0.3)";
      ctx.beginPath();
      ctx.moveTo(0, H * 0.7);
      ctx.lineTo(W, H * 0.7);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.fill();

      // Silhouette — walking person
      const px = boxX + boxW / 2;
      const py = boxY + boxH;
      ctx.fillStyle = "rgba(40,60,80,0.9)";
      // body
      ctx.beginPath();
      ctx.ellipse(px, py - 70, 22, 45, 0, 0, Math.PI * 2);
      ctx.fill();
      // head
      ctx.beginPath();
      ctx.arc(px, py - 130, 18, 0, Math.PI * 2);
      ctx.fill();
      // legs
      ctx.fillRect(px - 14, py - 30, 12, 40);
      ctx.fillRect(px + 2, py - 30, 12, 40);

      // Face bounding box (animated dashes)
      const dashOffset = (ts / 30) % 20;
      ctx.strokeStyle = "#00D4AA";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.lineDashOffset = -dashOffset;
      ctx.shadowColor = "#00D4AA";
      ctx.shadowBlur = 8;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Corner accents
      const cSize = 14;
      ctx.strokeStyle = "#00D4AA";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#00D4AA";
      ctx.shadowBlur = 12;
      [[boxX, boxY, 1, 1], [boxX + boxW, boxY, -1, 1], [boxX, boxY + boxH, 1, -1], [boxX + boxW, boxY + boxH, -1, -1]].forEach(
        ([cx, cy, dx, dy]) => {
          ctx.beginPath();
          ctx.moveTo(cx as number, (cy as number) + (dy as number) * cSize);
          ctx.lineTo(cx as number, cy as number);
          ctx.lineTo((cx as number) + (dx as number) * cSize, cy as number);
          ctx.stroke();
        }
      );
      ctx.shadowBlur = 0;

      // Label
      const labelX = boxX;
      const labelY = boxY + boxH + 8;
      ctx.fillStyle = "rgba(0,212,170,0.9)";
      ctx.fillRect(labelX, labelY, 140, 36);
      ctx.fillStyle = "#000";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.fillText("Nguyễn Văn A", labelX + 8, labelY + 14);
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.font = "bold 10px Inter, sans-serif";
      ctx.fillText("96.8%", labelX + 96, labelY + 14);
      ctx.fillStyle = "#004D3A";
      ctx.fillRect(labelX, labelY + 20, 140, 16);
      ctx.fillStyle = "#00D4AA";
      ctx.font = "bold 9px Inter, sans-serif";
      ctx.fillText("ACCESS GRANTED", labelX + 28, labelY + 31);

      // HUD overlay
      ctx.fillStyle = "rgba(0,212,170,0.7)";
      ctx.font = "11px monospace";
      ctx.fillText("LIVE", 14, 24);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "10px monospace";
      ctx.fillText("Camera 01 — Cửa chính", 44, 24);
      ctx.fillText(`1920×1080  FPS: ${fps}`, W - 120, 24);

      // Timestamp
      const now = new Date();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "10px monospace";
      ctx.fillText(now.toLocaleTimeString("vi-VN"), W - 64, H - 12);

      // Scan line
      const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      grad.addColorStop(0, "rgba(0,212,170,0)");
      grad.addColorStop(0.5, "rgba(0,212,170,0.05)");
      grad.addColorStop(1, "rgba(0,212,170,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 30, W, 60);

      // REC dot
      const blink = Math.sin(ts / 500) > 0;
      if (blink) {
        ctx.beginPath();
        ctx.arc(30, 22, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#EF4444";
        ctx.fill();
        ctx.shadowColor = "#EF4444";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return (
    <div
      style={{
        background: "#060D18",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(0,212,170,0.15)",
        position: "relative",
        flex: 1,
      }}
    >
      {/* Top HUD bar */}
      <div
        style={{
          padding: "10px 14px",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid rgba(0,212,170,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#EF4444",
              animation: "blink 1s ease-in-out infinite",
              boxShadow: "0 0 8px #EF4444",
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", letterSpacing: "0.08em" }}>LIVE</span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>|</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Camera 01 - Cửa chính</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
          1920×1080&nbsp;&nbsp;FPS: {fps}
        </span>
        <button
          style={{
            width: 22,
            height: 22,
            background: "rgba(255,255,255,0.08)",
            border: "none",
            borderRadius: 4,
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={520}
        height={340}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Door Control Panel
// ─────────────────────────────────────────────
function DoorControl() {
  const [isLocked, setIsLocked] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const toggle = (lock: boolean) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setIsLocked(lock);
      setIsAnimating(false);
    }, 600);
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#3B82F6",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><path d="M12 18h.01" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Điều khiển Cửa</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Cửa chính</div>
        </div>
      </div>

      {/* Lock icon + status */}
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: isLocked ? "rgba(0,212,170,0.1)" : "rgba(239,68,68,0.1)",
            border: `2px solid ${isLocked ? "rgba(0,212,170,0.3)" : "rgba(239,68,68,0.3)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
            transition: "all 0.4s ease",
            boxShadow: isLocked
              ? "0 0 20px rgba(0,212,170,0.15)"
              : "0 0 20px rgba(239,68,68,0.15)",
            animation: isAnimating ? "glow-pulse 0.6s ease" : isLocked ? "glow-pulse 3s ease-in-out infinite" : "none",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isLocked ? "#00D4AA" : "#EF4444"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: "all 0.4s ease" }}
          >
            {isLocked ? (
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </>
            ) : (
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </>
            )}
          </svg>
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: isLocked ? "#00D4AA" : "#EF4444",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {isLocked ? "Cửa Đang Khóa" : "Cửa Đang Mở"}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Trạng thái: {isLocked ? "An toàn" : "Không an toàn"}
        </div>
      </div>

      {/* Control buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          id="btn-open-door"
          onClick={() => toggle(false)}
          disabled={isAnimating || !isLocked}
          style={{
            flex: 1,
            padding: "9px 0",
            borderRadius: 8,
            border: "none",
            cursor: isLocked ? "pointer" : "not-allowed",
            background: isLocked
              ? "linear-gradient(135deg, #00D4AA 0%, #059669 100%)"
              : "rgba(255,255,255,0.05)",
            color: isLocked ? "white" : "var(--text-muted)",
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.2s ease",
            opacity: isAnimating ? 0.7 : 1,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
          Mở cửa
        </button>
        <button
          id="btn-lock-door"
          onClick={() => toggle(true)}
          disabled={isAnimating || isLocked}
          style={{
            flex: 1,
            padding: "9px 0",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: !isLocked ? "pointer" : "not-allowed",
            background: !isLocked ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
            color: !isLocked ? "#EF4444" : "var(--text-muted)",
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.2s ease",
            opacity: isAnimating ? 0.7 : 1,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Khóa cửa
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Access Log Table
// ─────────────────────────────────────────────
const DEMO_LOGS: AccessLog[] = [
  { time: "10:45:22", user: "Nguyễn Văn A", result: "GRANTED" },
  { time: "10:42:15", user: "Trần Thị B", result: "GRANTED" },
  { time: "10:38:05", user: "Unknown", result: "DENIED" },
  { time: "10:30:00", user: "Lê Văn C", result: "GRANTED" },
  { time: "10:22:44", user: "Phạm Thị D", result: "GRANTED" },
  { time: "10:18:11", user: "Unknown", result: "DENIED" },
];

function AccessLogTable() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Lịch sử gần đây</div>
        <a
          href="/access-logs"
          style={{
            fontSize: 11,
            color: "var(--accent-teal)",
            textDecoration: "none",
            fontWeight: 500,
            opacity: 0.8,
          }}
        >
          Xem tất cả →
        </a>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr 80px",
          padding: "8px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {["Thời gian", "Người dùng", "Kết quả"].map((h) => (
          <div key={h} style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      {DEMO_LOGS.map((log, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 80px",
            padding: "9px 16px",
            borderBottom: i < DEMO_LOGS.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
            transition: "background 0.15s ease",
            cursor: "default",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
        >
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace" }}>{log.time}</span>
          <span
            style={{
              fontSize: 12,
              color: log.user === "Unknown" ? "var(--text-muted)" : "var(--text-primary)",
              fontStyle: log.user === "Unknown" ? "italic" : "normal",
            }}
          >
            {log.user}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 4,
              background: log.result === "GRANTED" ? "rgba(0,212,170,0.12)" : "rgba(239,68,68,0.12)",
              color: log.result === "GRANTED" ? "#00D4AA" : "#EF4444",
              border: `1px solid ${log.result === "GRANTED" ? "rgba(0,212,170,0.2)" : "rgba(239,68,68,0.2)"}`,
              display: "inline-flex",
              alignItems: "center",
              letterSpacing: "0.04em",
              alignSelf: "center",
              justifySelf: "start",
            }}
          >
            {log.result === "GRANTED" ? "GRANTED" : "DENIED"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Quick Stats Row (mini)
// ─────────────────────────────────────────────
function QuickStats() {
  const items = [
    { label: "Camera Online", value: "4/4", color: "#22C55E" },
    { label: "Cửa đang mở", value: "0/3", color: "#00D4AA" },
    { label: "Cảnh báo hôm nay", value: "2", color: "#F97316" },
    { label: "Unknown Faces", value: "7", color: "#EF4444" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 4 }}>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0, boxShadow: `0 0 8px ${item.color}` }} />
          <div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Dashboard Page
// ─────────────────────────────────────────────
export default function DashboardPage() {
  const stats: StatCard[] = [
    {
      id: "users",
      label: "Tổng số người dùng",
      value: 128,
      change: "+12 tháng này",
      changeLabel: "+12 tháng này",
      trend: "up",
      accent: "#3B82F6",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: "access",
      label: "Lượt ra/vào hôm nay",
      value: 1284,
      change: "+8.4%",
      changeLabel: "+8.4%",
      trend: "up",
      accent: "#00D4AA",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      ),
    },
    {
      id: "recognized",
      label: "Nhận diện thành công",
      value: 1192,
      change: "92.8%",
      changeLabel: "92.8%",
      trend: "up",
      accent: "#22C55E",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      id: "denied",
      label: "Truy cập bị từ chối",
      value: 92,
      change: "7.2%",
      changeLabel: "7.2%",
      trend: "down",
      accent: "#EF4444",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", minHeight: "calc(100vh - 60px)", background: "var(--bg-primary)" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 24, animation: "fadeInUp 0.4s ease both" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
          Xin chào, Quản trị viên 👋
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Theo dõi hoạt động hệ thống kiểm soát ra vào bằng AI
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {stats.map((card, i) => (
          <StatCardItem key={card.id} card={card} delay={i * 80} />
        ))}
      </div>

      {/* Quick status */}
      <QuickStats />

      {/* Main content: Camera + Right panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14, marginTop: 20 }}>
        {/* Left: Live camera */}
        <LiveCameraFeed />

        {/* Right: Door + Logs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <DoorControl />
          <AccessLogTable />
        </div>
      </div>
    </div>
  );
}
