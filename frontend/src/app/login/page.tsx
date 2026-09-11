"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { login, getSession, MOCK_USERS } from "@/lib/auth";

// ─── Particle canvas animation ───────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; color: string;
    }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = ["#00D4AA", "#3B82F6", "#8B5CF6", "#06B6D4"];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,212,170,${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}
    />
  );
}

// ─── Scan line effect ─────────────────────────────────────────────────────────
function ScanLine() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "2px",
          background: "linear-gradient(90deg, transparent, rgba(0,212,170,0.15), transparent)",
          animation: "scanline 6s linear infinite",
        }}
      />
    </div>
  );
}

// ─── Eye icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ─── FaceGate Logo SVG ────────────────────────────────────────────────────────
function FaceGateLogo() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <rect width="52" height="52" rx="14" fill="url(#logoGrad)" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4AA" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      {/* Face outline */}
      <ellipse cx="26" cy="22" rx="10" ry="12" stroke="white" strokeWidth="1.5" fill="none" strokeOpacity="0.9" />
      {/* Eyes */}
      <circle cx="22" cy="20" r="1.5" fill="white" fillOpacity="0.9" />
      <circle cx="30" cy="20" r="1.5" fill="white" fillOpacity="0.9" />
      {/* Scan lines */}
      <line x1="16" y1="14" x2="36" y2="14" stroke="white" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 2" />
      <line x1="16" y1="30" x2="36" y2="30" stroke="white" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 2" />
      {/* Corner brackets */}
      <path d="M14 14 L14 10 L18 10" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M38 14 L38 10 L34 10" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M14 38 L14 42 L18 42" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M38 38 L38 42 L34 42" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <div style={{
        width: 18, height: 18,
        border: "2px solid rgba(255,255,255,0.2)",
        borderTopColor: "white",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }} />
      <span>Đang xác thực...</span>
    </div>
  );
}

// ─── Demo credentials hint card ───────────────────────────────────────────────
function DemoHint({ onFill }: { onFill: (u: string, p: string) => void }) {
  const [open, setOpen] = useState(false);
  const demos = [
    { label: "Super Admin", username: "admin", password: "Admin@123", color: "#EF4444" },
    { label: "Bảo Vệ", username: "security", password: "Security@123", color: "#00D4AA" },
    { label: "Quản Lý", username: "manager", password: "Manager@123", color: "#8B5CF6" },
  ];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none", border: "1px solid rgba(0,212,170,0.3)",
          color: "#00D4AA", fontSize: 12, padding: "6px 14px",
          borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          transition: "all 0.2s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,170,0.08)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "none";
        }}
      >
        <span>🔑</span> Demo Credentials
        <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(13,19,33,0.98)",
            border: "1px solid rgba(0,212,170,0.2)",
            borderRadius: 12,
            padding: 16,
            minWidth: 260,
            boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
            animation: "fadeInUp 0.2s ease both",
            zIndex: 10,
          }}
        >
          <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
            Tài Khoản Demo
          </p>
          {demos.map((d) => (
            <button
              key={d.username}
              onClick={() => { onFill(d.username, d.password); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "10px 12px", marginBottom: 6,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8, cursor: "pointer", color: "white", fontSize: 13,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                <div>
                  <div style={{ fontWeight: 600, color: "#F1F5F9" }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>{d.username} / {d.password}</div>
                </div>
              </div>
              <span style={{ fontSize: 11, color: "#00D4AA", opacity: 0.7 }}>Dùng →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If already logged in → redirect
    if (getSession()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      triggerShake();
      return;
    }
    setLoading(true);
    setError("");

    // Simulate network delay for realism
    await new Promise((r) => setTimeout(r, 1200));

    const session = login(username, password);
    if (session) {
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 800));
      router.replace("/dashboard");
    } else {
      setLoading(false);
      setError("Sai tên đăng nhập hoặc mật khẩu. Vui lòng thử lại.");
      triggerShake();
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError("");
  };

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scanline {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-8px); }
          40%     { transform: translateX(8px); }
          60%     { transform: translateX(-6px); }
          80%     { transform: translateX(6px); }
        }
        @keyframes glow-pulse {
          0%,100% { box-shadow: 0 0 20px rgba(0,212,170,0.2); }
          50%      { box-shadow: 0 0 50px rgba(0,212,170,0.5), 0 0 100px rgba(59,130,246,0.2); }
        }
        @keyframes logo-float {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes success-flash {
          0%   { opacity:0; transform:scale(0.8); }
          50%  { opacity:1; transform:scale(1.05); }
          100% { opacity:1; transform:scale(1); }
        }
        @keyframes ring-expand {
          0%   { transform:scale(1); opacity:0.8; }
          100% { transform:scale(2.5); opacity:0; }
        }
        @keyframes data-stream {
          0%   { transform:translateY(0); opacity:0.6; }
          100% { transform:translateY(-100vh); opacity:0; }
        }
        @keyframes border-flow {
          0%,100% { border-color: rgba(0,212,170,0.3); }
          50%      { border-color: rgba(59,130,246,0.5); }
        }
        .login-card {
          animation: glow-pulse 4s ease-in-out infinite;
        }
        .logo-wrap {
          animation: logo-float 4s ease-in-out infinite;
        }
        .shake {
          animation: shake 0.5s ease both !important;
        }
        .input-focus:focus {
          outline: none;
          border-color: rgba(0,212,170,0.6) !important;
          box-shadow: 0 0 0 3px rgba(0,212,170,0.1) !important;
        }
      `}</style>

      {/* Backgrounds */}
      <ParticleCanvas />
      <ScanLine />

      {/* Grid overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }} />

      {/* Radial glow center */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,212,170,0.06) 0%, transparent 70%)",
      }} />

      {/* Data stream columns (decorative) */}
      {[15, 85].map((left) => (
        <div
          key={left}
          style={{
            position: "fixed", top: 0, left: `${left}%`, zIndex: 0,
            width: 1, height: "60vh",
            background: "linear-gradient(180deg, transparent, rgba(0,212,170,0.15), transparent)",
            animation: `data-stream ${3 + left * 0.02}s linear infinite`,
            animationDelay: `${left * 0.05}s`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Main layout */}
      <div style={{
        position: "relative", zIndex: 2,
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
      }}>
        {/* Success overlay */}
        {success && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 100,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(8,12,20,0.95)",
            animation: "success-flash 0.6s ease both",
          }}>
            <div style={{ position: "relative", marginBottom: 24 }}>
              <div style={{
                position: "absolute", inset: -20,
                border: "2px solid rgba(0,212,170,0.4)",
                borderRadius: "50%",
                animation: "ring-expand 1s ease-out infinite",
              }} />
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "linear-gradient(135deg, #00D4AA, #3B82F6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36,
              }}>✓</div>
            </div>
            <p style={{ color: "#00D4AA", fontSize: 20, fontWeight: 700 }}>Xác Thực Thành Công</p>
            <p style={{ color: "#64748B", fontSize: 14, marginTop: 8 }}>Đang chuyển vào hệ thống...</p>
          </div>
        )}

        {/* Card */}
        <div
          className={`login-card${shake ? " shake" : ""}`}
          style={{
            width: "100%", maxWidth: 440,
            background: "rgba(13,19,33,0.85)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(0,212,170,0.2)",
            borderRadius: 24,
            padding: "48px 40px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top-left corner accent */}
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: 120, height: 120,
            background: "radial-gradient(circle, rgba(0,212,170,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          {/* Bottom-right corner accent */}
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 100, height: 100,
            background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Corner brackets */}
          {[
            { top: 12, left: 12, borderTop: "1.5px solid", borderLeft: "1.5px solid" },
            { top: 12, right: 12, borderTop: "1.5px solid", borderRight: "1.5px solid" },
            { bottom: 12, left: 12, borderBottom: "1.5px solid", borderLeft: "1.5px solid" },
            { bottom: 12, right: 12, borderBottom: "1.5px solid", borderRight: "1.5px solid" },
          ].map((style, i) => (
            <div key={i} style={{
              position: "absolute", width: 18, height: 18,
              borderColor: "rgba(0,212,170,0.4)", ...style,
              pointerEvents: "none",
            }} />
          ))}

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 36, animation: "fadeInUp 0.5s ease both" }}>
            <div className="logo-wrap" style={{ display: "inline-block", marginBottom: 20 }}>
              <FaceGateLogo />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.5px", marginBottom: 6 }}>
              FaceGate AI
            </h1>
            <p style={{ color: "#64748B", fontSize: 13, letterSpacing: "0.5px" }}>
              Hệ Thống Kiểm Soát Ra Vào Thông Minh
            </p>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              marginTop: 10,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", animation: "blink 1.5s ease-in-out infinite" }} />
              <span style={{ fontSize: 11, color: "#22C55E", letterSpacing: "0.5px" }}>HỆ THỐNG TRỰC TUYẾN</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ animation: "fadeInUp 0.5s 0.1s ease both" }}>
            {/* Username */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600,
                color: "#94A3B8", letterSpacing: "1px",
                textTransform: "uppercase", marginBottom: 8,
              }}>
                Tên Đăng Nhập
              </label>
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  color: "#4B5563", pointerEvents: "none",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder="admin / security / manager"
                  autoComplete="username"
                  className="input-focus"
                  style={{
                    width: "100%", padding: "13px 14px 13px 40px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, color: "#F1F5F9",
                    fontSize: 14, fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600,
                color: "#94A3B8", letterSpacing: "1px",
                textTransform: "uppercase", marginBottom: 8,
              }}>
                Mật Khẩu
              </label>
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  color: "#4B5563", pointerEvents: "none",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className="input-focus"
                  style={{
                    width: "100%", padding: "13px 44px 13px 40px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, color: "#F1F5F9",
                    fontSize: 14, fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#4B5563", padding: 4, transition: "color 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#00D4AA")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#4B5563")}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 10, padding: "10px 14px",
                marginBottom: 18, animation: "fadeInUp 0.3s ease both",
              }}>
                <span style={{ color: "#EF4444", fontSize: 14 }}>⚠</span>
                <span style={{ color: "#FCA5A5", fontSize: 13 }}>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "15px",
                background: loading
                  ? "rgba(0,212,170,0.3)"
                  : "linear-gradient(135deg, #00D4AA 0%, #3B82F6 100%)",
                border: "none", borderRadius: 12,
                color: "white", fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", letterSpacing: "0.3px",
                transition: "all 0.2s",
                position: "relative", overflow: "hidden",
              }}
              onMouseEnter={e => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 30px rgba(0,212,170,0.4)";
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              {loading ? <Spinner /> : "🔐 Đăng Nhập Hệ Thống"}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            marginTop: 28, display: "flex", alignItems: "center",
            justifyContent: "center", gap: 12,
            animation: "fadeInUp 0.5s 0.2s ease both",
          }}>
            <DemoHint onFill={fillDemo} />
          </div>

          {/* Security badge */}
          <div style={{
            marginTop: 20, textAlign: "center",
            animation: "fadeInUp 0.5s 0.3s ease both",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "#374151",
              letterSpacing: "0.5px",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Kết nối được mã hóa end-to-end · AES-256
            </span>
          </div>
        </div>

        {/* Version badge */}
        <div style={{
          position: "fixed", bottom: 20, right: 20,
          fontSize: 11, color: "#1E293B",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: 6, padding: "4px 10px",
        }}>
          v2.0.0 · FaceGate AI
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%,100% { opacity:1; }
          50% { opacity:0.4; }
        }
      `}</style>
    </>
  );
}
