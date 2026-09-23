"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/ToastNotification";

function SliderInput({ value, onChange, min = 0, max = 1, step = 0.01 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
      <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
        <div style={{ height: "100%", width: `${Math.min(Math.max(pct, 0), 100)}%`, background: "linear-gradient(90deg,#00D4AA,#3B82F6)", borderRadius: 4 }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ position: "absolute", left: 0, right: 0, width: "100%", opacity: 0, cursor: "pointer", height: 20 }}
      />
      <div style={{ position: "absolute", left: `${Math.min(Math.max(pct, 0), 100)}%`, transform: "translateX(-50%)", width: 16, height: 16, borderRadius: "50%", background: "var(--accent-teal)", border: "2px solid white", boxShadow: "0 2px 8px rgba(0,212,170,0.5)", pointerEvents: "none" }} />
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)}
      style={{ width: 44, height: 24, borderRadius: 12, background: value ? "linear-gradient(135deg,#00D4AA,#3B82F6)" : "rgba(255,255,255,0.12)", cursor: "pointer", position: "relative", transition: "all 0.25s ease", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? "calc(100% - 21px)" : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.25s ease", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }} />
    </div>
  );
}

function RadioGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map((opt) => (
        <label key={opt} onClick={() => onChange(opt)}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", borderRadius: 8, background: value === opt ? "rgba(0,212,170,0.08)" : "transparent", transition: "background 0.15s" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${value === opt ? "var(--accent-teal)" : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {value === opt && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-teal)" }} />}
          </div>
          <span style={{ fontSize: 13, color: value === opt ? "var(--accent-teal)" : "var(--text-secondary)", fontWeight: value === opt ? 600 : 400 }}>{opt}</span>
        </label>
      ))}
    </div>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", width: 80 }}>
      <button onClick={() => onChange(Math.max(1, value - 1))} style={{ width: 26, height: 36, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>-</button>
      <input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value) || 1)}
        style={{ flex: 1, background: "none", border: "none", color: "var(--text-primary)", fontSize: 14, fontWeight: 700, textAlign: "center", outline: "none", width: 0 }} />
      <button onClick={() => onChange(value + 1)} style={{ width: 26, height: 36, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>+</button>
    </div>
  );
}

function SectionCard({ title, description, icon, children }: { title: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-teal)", flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{description}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function getActionBadge(action: string) {
  const act = (action || "").toUpperCase();
  if (act.includes("CREATE")) {
    return { color: "#10B981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.25)", label: act };
  }
  if (act.includes("DELETE")) {
    return { color: "#EF4444", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.25)", label: act };
  }
  if (act.includes("UPDATE")) {
    return { color: "#38BDF8", bg: "rgba(56, 189, 248, 0.12)", border: "rgba(56, 189, 248, 0.25)", label: act };
  }
  if (act.includes("UNLOCK") || act.includes("ALERT") || act.includes("RESOLVE")) {
    return { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.25)", label: act };
  }
  return { color: "#A855F7", bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.25)", label: act };
}

function getEntityBadge(entity: string) {
  const ent = (entity || "").toLowerCase();
  switch (ent) {
    case "user": return { label: "Người dùng", icon: "👤", color: "#38BDF8" };
    case "camera": return { label: "Camera", icon: "📹", color: "#A855F7" };
    case "door": return { label: "Cửa kiểm soát", icon: "🚪", color: "#F59E0B" };
    case "department": return { label: "Phòng ban", icon: "🏢", color: "#10B981" };
    case "settings": return { label: "Cài đặt", icon: "⚙️", color: "#00D4AA" };
    case "alert": return { label: "Cảnh báo", icon: "🚨", color: "#EF4444" };
    default: return { label: entity || "Hệ thống", icon: "🛡️", color: "#94A3B8" };
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"config" | "audit">("config");

  // Config State
  const [detectionThreshold, setDetectionThreshold] = useState(0.65);
  const [minFaceSize, setMinFaceSize] = useState(60);
  const [maxFaceSize, setMaxFaceSize] = useState(300);
  const [aiModel, setAiModel] = useState("MobileNet v3 (Fast)");
  const [similarityThreshold, setSimilarityThreshold] = useState(0.82);
  const [confidenceScore, setConfidenceScore] = useState(0.90);
  const [resolution, setResolution] = useState("1280 × 720 (720p)");
  const [targetFPS, setTargetFPS] = useState(15);
  const [tensorRT, setTensorRT] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [alertSound, setAlertSound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(15);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [auditEntityFilter, setAuditEntityFilter] = useState("ALL");
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  // Load real settings from DB
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.settings.get();
      const data = res?.settings || {};
      if (data) {
        if (data["recognition.threshold"]) setDetectionThreshold(parseFloat(data["recognition.threshold"]));
        if (data["recognition.min_face_size"]) setMinFaceSize(parseInt(data["recognition.min_face_size"]));
        if (data["recognition.max_face_size"]) setMaxFaceSize(parseInt(data["recognition.max_face_size"]));
        if (data["recognition.model"]) setAiModel(data["recognition.model"]);
        if (data["recognition.similarity_threshold"]) setSimilarityThreshold(parseFloat(data["recognition.similarity_threshold"]));
        if (data["recognition.confidence_required"]) setConfidenceScore(parseFloat(data["recognition.confidence_required"]));
        if (data["camera.resolution"]) setResolution(data["camera.resolution"]);
        if (data["camera.fps"]) setTargetFPS(parseInt(data["camera.fps"]));
        if (data["system.auto_lock_on_threat"] !== undefined) setAutoLock(data["system.auto_lock_on_threat"] === "true");
        if (data["system.alert_sound"] !== undefined) setAlertSound(data["system.alert_sound"] === "true");
        if (data["system.tensorrt"] !== undefined) setTensorRT(data["system.tensorrt"] === "true");
      }
    } catch (err) {
      console.error("Failed to load settings from DB:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load audit logs from DB
  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await api.audit.list({
        q: auditSearch.trim() || undefined,
        action: auditActionFilter,
        entity_type: auditEntityFilter,
        page: auditPage,
        limit: auditLimit,
      });
      if (res) {
        setAuditLogs(res.items || []);
        setAuditTotal(res.total || 0);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setAuditLoading(false);
    }
  }, [auditSearch, auditActionFilter, auditEntityFilter, auditPage, auditLimit]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (activeTab === "audit") {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  // Save settings to DB
  const handleSave = async () => {
    try {
      await api.settings.update({
        "recognition.threshold": detectionThreshold.toString(),
        "recognition.min_face_size": minFaceSize.toString(),
        "recognition.max_face_size": maxFaceSize.toString(),
        "recognition.model": aiModel,
        "recognition.similarity_threshold": similarityThreshold.toString(),
        "recognition.confidence_required": confidenceScore.toString(),
        "camera.resolution": resolution,
        "camera.fps": targetFPS.toString(),
        "system.auto_lock_on_threat": autoLock.toString(),
        "system.alert_sound": alertSound.toString(),
        "system.tensorrt": tensorRT.toString(),
      });
      setSaved(true);
      toast.success("Đã lưu toàn bộ cấu hình AI & Hệ thống vào CSDL!", "LƯU CẤU HÌNH THÀNH CÔNG");
      setTimeout(() => setSaved(false), 2500);
      // Reload audit logs in background
      loadAuditLogs();
    } catch (err) {
      console.error("Failed to save settings to DB:", err);
      toast.error("Lỗi khi lưu cấu hình vào cơ sở dữ liệu.", "LƯU THẤT BẠI");
    }
  };

  // Reset defaults
  const handleReset = async () => {
    setDetectionThreshold(0.60);
    setMinFaceSize(60);
    setMaxFaceSize(300);
    setAiModel("MobileNet v3 (Fast)");
    setSimilarityThreshold(0.80);
    setConfidenceScore(0.85);
    setResolution("1280 × 720 (720p)");
    setTargetFPS(15);
    setTensorRT(true);
    setAutoLock(true);
    setAlertSound(true);
  };

  // Export audit logs CSV
  const handleExportAudit = () => {
    const url = api.audit.getExportUrl({
      action: auditActionFilter,
      entity_type: auditEntityFilter,
      q: auditSearch.trim() || undefined,
    });
    window.open(url, "_blank");
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── TAB NAVIGATION ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <button
              onClick={() => setActiveTab("config")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 10,
                border: activeTab === "config" ? "1px solid rgba(0,212,170,0.35)" : "1px solid transparent",
                background: activeTab === "config" ? "rgba(0,212,170,0.12)" : "rgba(255,255,255,0.03)",
                color: activeTab === "config" ? "var(--accent-teal)" : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Cấu hình hệ thống & AI
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 10,
                border: activeTab === "audit" ? "1px solid rgba(0,212,170,0.35)" : "1px solid transparent",
                background: activeTab === "audit" ? "rgba(0,212,170,0.12)" : "rgba(255,255,255,0.03)",
                color: activeTab === "audit" ? "var(--accent-teal)" : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Nhật ký hệ thống (Audit Logs)
              {auditTotal > 0 && (
                <span style={{ fontSize: 11, background: "rgba(0,212,170,0.2)", color: "#00D4AA", padding: "1px 8px", borderRadius: 12, fontWeight: 700 }}>
                  {auditTotal}
                </span>
              )}
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 1: CẤU HÌNH HỆ THỐNG & AI                                  */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === "config" && (
            <>
              {/* Header bar */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>CSDL PostgreSQL:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-teal)", background: "rgba(0,212,170,0.1)", padding: "2px 10px", borderRadius: 6, border: "1px solid rgba(0,212,170,0.2)" }}>
                    {loading ? "Đang tải..." : "Đã kết nối facegate_ai"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={handleReset}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                    Khôi phục mặc định
                  </button>
                  <button onClick={handleSave}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: saved ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg,#00D4AA,#3B82F6)", border: saved ? "1px solid rgba(34,197,94,0.4)" : "none", borderRadius: 10, color: saved ? "var(--accent-green)" : "white", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.3s", boxShadow: saved ? "none" : "0 4px 15px rgba(0,212,170,0.3)" }}>
                    {saved ? (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Đã lưu vào CSDL!</>
                    ) : (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Lưu cấu hình vào CSDL</>
                    )}
                  </button>
                </div>
              </div>

              {/* 2-column layout */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Face Detection */}
                <SectionCard title="Phát hiện khuôn mặt (Face Detection)" description="Tham số nhận diện khuôn mặt từ luồng camera."
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12a4 4 0 0 0 8 0"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>NGƯỠNG PHÁT HIỆN (DETECTION THRESHOLD)</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-teal)", background: "rgba(0,212,170,0.1)", padding: "1px 8px", borderRadius: 4 }}>{detectionThreshold.toFixed(2)}</span>
                      </div>
                      <SliderInput value={detectionThreshold} onChange={setDetectionThreshold} min={0.1} max={1} step={0.01} />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Nhạy hơn</span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Nghiêm ngặt</span>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[{ label: "KÍCH THƯỚC TỐI THIỂU (PX)", value: minFaceSize, onChange: setMinFaceSize }, { label: "KÍCH THƯỚC TỐI ĐA (PX)", value: maxFaceSize, onChange: setMaxFaceSize }].map(({ label, value, onChange }) => (
                        <div key={label}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
                          <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                            <input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                              style={{ flex: 1, background: "none", border: "none", color: "var(--text-primary)", fontSize: 14, fontWeight: 600, padding: "8px 10px", outline: "none" }} />
                            <div style={{ padding: "8px 10px", color: "var(--text-muted)" }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                {/* Face Recognition */}
                <SectionCard title="Nhận diện khuôn mặt (Face Recognition)" description="Thuật toán và mô hình trích xuất vector đặc trưng."
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s5-8 10-8 10 8 10 8-5 8-10 8-10-8-10-8z"/><circle cx="12" cy="12" r="3"/></svg>}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>MÔ HÌNH AI ĐƯỢC CHỌN</div>
                      <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                        <option value="MobileNet v3 (Fast)">MobileNet v3 (Fast - Tối ưu Edge)</option>
                        <option value="ResNet-50 (Accurate)">ResNet-50 512D (Độ chính xác cao)</option>
                        <option value="ArcFace (Premium)">ArcFace (Khuyên dùng kiểm soát cửa)</option>
                        <option value="FaceNet (Balanced)">FaceNet 128D (Cân bằng tốc độ/chính xác)</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>NGƯỠNG TƯƠNG ĐỒNG (SIMILARITY THRESHOLD)</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-teal)", background: "rgba(0,212,170,0.1)", padding: "1px 8px", borderRadius: 4 }}>{similarityThreshold.toFixed(2)}</span>
                      </div>
                      <SliderInput value={similarityThreshold} onChange={setSimilarityThreshold} min={0.5} max={1} step={0.01} />
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>ĐỘ TIN CẬY YÊU CẦU ĐỂ MỞ CỬA</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-teal)", background: "rgba(0,212,170,0.1)", padding: "1px 8px", borderRadius: 4 }}>{Math.round(confidenceScore * 100)}%</span>
                      </div>
                      <SliderInput value={confidenceScore} onChange={setConfidenceScore} min={0.5} max={1} step={0.01} />
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Global Camera Defaults */}
              <SectionCard title="Cấu hình luồng Camera mặc định" description="Các tham số mặc định áp dụng cho tất cả camera khi thêm mới."
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="15" height="10" rx="2"/><polyline points="17 11 21 7 21 17 17 13"/></svg>}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>ĐỘ PHÂN GIẢI XỬ LÝ</div>
                    <RadioGroup
                      options={["640 × 480 (VGA)", "1280 × 720 (720p)", "1920 × 1080 (1080p)"]}
                      value={resolution}
                      onChange={setResolution}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>TỐC ĐỘ KHUNG HÌNH (FPS)</div>
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <NumberInput value={targetFPS} onChange={setTargetFPS} />
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>FPS càng cao nhận diện càng mượt nhưng tốn CPU/GPU hơn.</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>TĂNG TỐC PHẦN CỨNG</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <Toggle value={tensorRT} onChange={setTensorRT} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Bật TensorRT / CUDA</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>Tự động kích hoạt GPU NVIDIA khi khả dụng, fallback sang CPU nếu không có.</div>
                  </div>
                </div>
              </SectionCard>

              {/* System & Notifications */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <SectionCard title="Hệ thống & Cảnh báo an ninh" description="Cấu hình xử lý sự kiện bất thường và phản hồi tự động."
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      { label: "Tự động khóa cửa khi phát hiện đe dọa", hint: "Tự động kích hoạt khóa rơ-le khi cảnh báo CRITICAL", value: autoLock, onChange: setAutoLock },
                      { label: "Âm thanh cảnh báo tại Edge Node", hint: "Phát tiếng còi cảnh báo khi phát hiện người lạ chưa cấp quyền", value: alertSound, onChange: setAlertSound },
                    ].map(({ label, hint, value, onChange }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{hint}</div>
                        </div>
                        <Toggle value={value} onChange={onChange} />
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 2: NHẬT KÝ HỆ THỐNG (AUDIT LOGS)                           */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === "audit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header & Controls bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Nhật ký kiểm toán hệ thống (Audit Logs)
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4, margin: 0 }}>
                    Theo dõi toàn bộ lịch sử thao tác thêm, sửa, xóa, khóa/mở cửa và cập nhật cài đặt bảo mật trong PostgreSQL.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={loadAuditLogs}
                    disabled={auditLoading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: auditLoading ? "rotate(180deg)" : "none", transition: "transform 0.4s" }}>
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Làm mới
                  </button>

                  <button
                    onClick={handleExportAudit}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      background: "rgba(0,212,170,0.1)",
                      border: "1px solid rgba(0,212,170,0.3)",
                      borderRadius: 10,
                      color: "var(--accent-teal)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Xuất CSV
                  </button>
                </div>
              </div>

              {/* Filters row */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", alignItems: "center" }}>
                {/* Search input */}
                <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Tìm theo người thực hiện, hành động, ID..."
                    value={auditSearch}
                    onChange={(e) => {
                      setAuditSearch(e.target.value);
                      setAuditPage(1);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 34px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--text-primary)",
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>

                {/* Action filter */}
                <select
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  style={{
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">Tất cả hành động</option>
                  <option value="USER_CREATE">USER_CREATE (Tạo người dùng)</option>
                  <option value="USER_UPDATE">USER_UPDATE (Sửa người dùng)</option>
                  <option value="USER_DELETE">USER_DELETE (Xóa người dùng)</option>
                  <option value="CAMERA_CREATE">CAMERA_CREATE (Thêm camera)</option>
                  <option value="CAMERA_DELETE">CAMERA_DELETE (Xóa camera)</option>
                  <option value="DOOR_CREATE">DOOR_CREATE (Thêm cửa)</option>
                  <option value="DOOR_DELETE">DOOR_DELETE (Xóa cửa)</option>
                  <option value="DOOR_UNLOCK">DOOR_UNLOCK (Mở cửa từ xa)</option>
                  <option value="DEPARTMENT_CREATE">DEPARTMENT_CREATE (Tạo phòng ban)</option>
                  <option value="DEPARTMENT_UPDATE">DEPARTMENT_UPDATE (Sửa phòng ban)</option>
                  <option value="DEPARTMENT_DELETE">DEPARTMENT_DELETE (Xóa phòng ban)</option>
                  <option value="SETTINGS_UPDATE">SETTINGS_UPDATE (Cập nhật cài đặt)</option>
                  <option value="ALERT_RESOLVE">ALERT_RESOLVE (Xử lý cảnh báo)</option>
                  <option value="ALERT_ACKNOWLEDGE_ALL">ALERT_ACK_ALL (Xác nhận tất cả)</option>
                </select>

                {/* Entity filter */}
                <select
                  value={auditEntityFilter}
                  onChange={(e) => {
                    setAuditEntityFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  style={{
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">Tất cả đối tượng</option>
                  <option value="user">Người dùng (user)</option>
                  <option value="camera">Camera (camera)</option>
                  <option value="door">Cửa kiểm soát (door)</option>
                  <option value="department">Phòng ban (department)</option>
                  <option value="settings">Cài đặt (settings)</option>
                  <option value="alert">Cảnh báo (alert)</option>
                </select>
              </div>

              {/* Audit Table */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", color: "var(--text-muted)", textAlign: "left" }}>
                        <th style={{ padding: "12px 16px", fontWeight: 600 }}>Thời gian</th>
                        <th style={{ padding: "12px 16px", fontWeight: 600 }}>Người thực hiện</th>
                        <th style={{ padding: "12px 16px", fontWeight: 600 }}>Hành động</th>
                        <th style={{ padding: "12px 16px", fontWeight: 600 }}>Đối tượng</th>
                        <th style={{ padding: "12px 16px", fontWeight: 600 }}>IP</th>
                        <th style={{ padding: "12px 16px", fontWeight: 600 }}>Chi tiết / Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLoading ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                            Đang tải nhật ký kiểm toán từ PostgreSQL...
                          </td>
                        </tr>
                      ) : auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Không có bản ghi nhật ký phù hợp</div>
                            <div style={{ fontSize: 12, marginTop: 4 }}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</div>
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => {
                          const actionBadge = getActionBadge(log.action);
                          const entityBadge = getEntityBadge(log.entity_type);
                          const dateObj = log.timestamp ? new Date(log.timestamp) : null;
                          const timeStr = dateObj ? dateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--";
                          const dateStr = dateObj ? dateObj.toLocaleDateString("vi-VN") : "--/--/----";

                          return (
                            <tr
                              key={log.id}
                              style={{
                                borderBottom: "1px solid rgba(255,255,255,0.04)",
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              {/* Timestamp */}
                              <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                                <div style={{ fontFamily: "monospace", color: "var(--text-primary)", fontWeight: 600 }}>{timeStr}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{dateStr}</div>
                              </td>

                              {/* User */}
                              <td style={{ padding: "12px 16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #00D4AA, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white" }}>
                                    {(log.user_name || "A").slice(0, 1).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{log.user_name || "Quản trị viên (Admin)"}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>{log.user_id ? log.user_id.slice(0, 8) + "..." : "SYSTEM"}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Action */}
                              <td style={{ padding: "12px 16px" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "3px 9px",
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    fontFamily: "monospace",
                                    color: actionBadge.color,
                                    background: actionBadge.bg,
                                    border: `1px solid ${actionBadge.border}`,
                                  }}
                                >
                                  {actionBadge.label}
                                </span>
                              </td>

                              {/* Entity */}
                              <td style={{ padding: "12px 16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span>{entityBadge.icon}</span>
                                  <div>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: entityBadge.color }}>{entityBadge.label}</span>
                                    {log.entity_id && (
                                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
                                        #{log.entity_id.slice(0, 8)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* IP */}
                              <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--text-muted)", fontSize: 12 }}>
                                {log.ip_address || "127.0.0.1"}
                              </td>

                              {/* Details button */}
                              <td style={{ padding: "12px 16px" }}>
                                <button
                                  onClick={() => setSelectedAuditLog(log)}
                                  style={{
                                    padding: "5px 12px",
                                    borderRadius: 6,
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    background: "rgba(255,255,255,0.03)",
                                    color: "var(--text-secondary)",
                                    fontSize: 12,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "var(--accent-teal)";
                                    e.currentTarget.style.borderColor = "rgba(0,212,170,0.3)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "var(--text-secondary)";
                                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                  </svg>
                                  Xem Payload
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Hiển thị {auditLogs.length} / {auditTotal} bản ghi nhật ký kiểm toán
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      disabled={auditPage <= 1}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.03)",
                        color: auditPage <= 1 ? "var(--text-muted)" : "var(--text-primary)",
                        cursor: auditPage <= 1 ? "not-allowed" : "pointer",
                        fontSize: 12,
                      }}
                    >
                      Trang trước
                    </button>
                    <span style={{ fontSize: 12, color: "var(--accent-teal)", fontWeight: 700 }}>
                      Trang {auditPage}
                    </span>
                    <button
                      onClick={() => setAuditPage((p) => p + 1)}
                      disabled={auditLogs.length < auditLimit || auditPage * auditLimit >= auditTotal}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.03)",
                        color: (auditLogs.length < auditLimit || auditPage * auditLimit >= auditTotal) ? "var(--text-muted)" : "var(--text-primary)",
                        cursor: (auditLogs.length < auditLimit || auditPage * auditLimit >= auditTotal) ? "not-allowed" : "pointer",
                        fontSize: 12,
                      }}
                    >
                      Trang sau
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* MODAL: CHI TIẾT AUDIT LOG / PAYLOAD                            */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {selectedAuditLog && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: 16,
              }}
              onClick={() => setSelectedAuditLog(null)}
            >
              <div
                style={{
                  background: "#0D1321",
                  border: "1px solid rgba(0,212,170,0.3)",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.8), 0 0 25px rgba(0,212,170,0.15)",
                  borderRadius: 16,
                  maxWidth: 600,
                  width: "100%",
                  maxHeight: "85vh",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,212,170,0.12)", color: "#00D4AA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      📋
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Chi tiết kiểm toán hệ thống</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>ID: {selectedAuditLog.id}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAuditLog(null)}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Meta items */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Hành động</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#00D4AA", marginTop: 2, fontFamily: "monospace" }}>
                        {selectedAuditLog.action}
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Đối tượng</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "white", marginTop: 2 }}>
                        {selectedAuditLog.entity_type} {selectedAuditLog.entity_id ? `(${selectedAuditLog.entity_id})` : ""}
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Người thực hiện</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "white", marginTop: 2 }}>
                        {selectedAuditLog.user_name || "Admin"}
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>IP & Thời gian</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, fontFamily: "monospace" }}>
                        {selectedAuditLog.ip_address || "127.0.0.1"} • {selectedAuditLog.timestamp ? new Date(selectedAuditLog.timestamp).toLocaleString("vi-VN") : "--"}
                      </div>
                    </div>
                  </div>

                  {/* JSON Payload */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>
                      Chi tiết dữ liệu (Payload JSON)
                    </div>
                    <pre
                      style={{
                        background: "#080C14",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        padding: 14,
                        color: "#38BDF8",
                        fontSize: 12,
                        fontFamily: "monospace",
                        overflowX: "auto",
                        maxHeight: 240,
                        margin: 0,
                      }}
                    >
                      {JSON.stringify(selectedAuditLog.details || {}, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setSelectedAuditLog(null)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.08)",
                      border: "none",
                      color: "white",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
