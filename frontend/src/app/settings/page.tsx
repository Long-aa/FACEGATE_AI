"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

function SliderInput({ value, onChange, min = 0, max = 1, step = 0.01 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
      <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#00D4AA,#3B82F6)", borderRadius: 4 }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ position: "absolute", left: 0, right: 0, width: "100%", opacity: 0, cursor: "pointer", height: 20 }}
      />
      <div style={{ position: "absolute", left: `${pct}%`, transform: "translateX(-50%)", width: 16, height: 16, borderRadius: "50%", background: "var(--accent-teal)", border: "2px solid white", boxShadow: "0 2px 8px rgba(0,212,170,0.5)", pointerEvents: "none" }} />
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

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, opacity: 0.7 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
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

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header bar */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Model Version:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-teal)", background: "rgba(0,212,170,0.1)", padding: "2px 10px", borderRadius: 6, border: "1px solid rgba(0,212,170,0.2)" }}>v3.4.1-rc</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                Khôi phục mặc định
              </button>
              <button onClick={handleSave}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: saved ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg,#00D4AA,#3B82F6)", border: saved ? "1px solid rgba(34,197,94,0.4)" : "none", borderRadius: 10, color: saved ? "var(--accent-green)" : "white", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.3s", boxShadow: saved ? "none" : "0 4px 15px rgba(0,212,170,0.3)" }}>
                {saved ? (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Đã lưu!</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Lưu cấu hình</>
                )}
              </button>
            </div>
          </div>

          {/* 2-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Face Detection */}
            <SectionCard title="Face Detection" description="Parameters for identifying faces in video streams."
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12a4 4 0 0 0 8 0"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>DETECTION THRESHOLD</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-teal)", background: "rgba(0,212,170,0.1)", padding: "1px 8px", borderRadius: 4 }}>{detectionThreshold.toFixed(2)}</span>
                  </div>
                  <SliderInput value={detectionThreshold} onChange={setDetectionThreshold} min={0.1} max={1} step={0.01} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>More False Positives</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Stricter</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[{ label: "MIN FACE SIZE (PX)", value: minFaceSize, onChange: setMinFaceSize }, { label: "MAX FACE SIZE (PX)", value: maxFaceSize, onChange: setMaxFaceSize }].map(({ label, value, onChange }) => (
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
            <SectionCard title="Face Recognition" description="Identity matching logic."
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s5-8 10-8 10 8 10 8-5 8-10 8-10-8-10-8z"/><circle cx="12" cy="12" r="3"/></svg>}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>AI MODEL</div>
                  <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                    <option>MobileNet v3 (Fast)</option>
                    <option>ResNet-50 (Accurate)</option>
                    <option>ArcFace (Premium)</option>
                    <option>FaceNet (Balanced)</option>
                  </select>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>SIMILARITY THRESHOLD</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-teal)", background: "rgba(0,212,170,0.1)", padding: "1px 8px", borderRadius: 4 }}>{similarityThreshold.toFixed(2)}</span>
                  </div>
                  <SliderInput value={similarityThreshold} onChange={setSimilarityThreshold} min={0.5} max={1} step={0.01} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>CONFIDENCE SCORE REQ.</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-teal)", background: "rgba(0,212,170,0.1)", padding: "1px 8px", borderRadius: 4 }}>{Math.round(confidenceScore * 100)}%</span>
                  </div>
                  <SliderInput value={confidenceScore} onChange={setConfidenceScore} min={0.5} max={1} step={0.01} />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Global Camera Defaults */}
          <SectionCard title="Global Camera Defaults" description="Base settings applied to new stream endpoints."
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="15" height="10" rx="2"/><polyline points="17 11 21 7 21 17 17 13"/></svg>}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
              {/* Resolution */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>PROCESSING RESOLUTION</div>
                <RadioGroup
                  options={["640 × 480 (VGA)", "1280 × 720 (720p)", "1920 × 1080 (1080p)"]}
                  value={resolution}
                  onChange={setResolution}
                />
              </div>
              {/* FPS */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>TARGET FPS (PROCESSING)</div>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <NumberInput value={targetFPS} onChange={setTargetFPS} />
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Frames per second. Lower FPS reduces CPU load.</div>
                </div>
              </div>
              {/* Hardware */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>HARDWARE ACCELERATION</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Toggle value={tensorRT} onChange={setTensorRT} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Enable TensorRT</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>Requires compatible NVIDIA GPU. Falls back to CPU if unavailable.</div>
              </div>
            </div>
          </SectionCard>

          {/* System & Notifications */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <SectionCard title="Hệ thống" description="Cấu hình hành vi chung của hệ thống."
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Tự động khóa khi phát hiện đe dọa", hint: "Khóa tất cả cửa khi mức độ CRITICAL", value: autoLock, onChange: setAutoLock },
                  { label: "Âm thanh cảnh báo", hint: "Phát tiếng khi có cảnh báo mới", value: alertSound, onChange: setAlertSound },
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

            <SectionCard title="Thông tin hệ thống" description="Phiên bản và trạng thái các dịch vụ."
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "AI Engine", value: "v3.4.1-rc", status: "running" },
                  { label: "Database", value: "PostgreSQL 15.2", status: "running" },
                  { label: "Camera Service", value: "v2.1.0", status: "running" },
                  { label: "Alert Worker", value: "v1.8.3", status: "warning" },
                ].map(({ label, value, status }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{value}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: status === "running" ? "var(--accent-green)" : "var(--accent-orange)" }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: status === "running" ? "var(--accent-green)" : "var(--accent-orange)" }}>
                        {status === "running" ? "Running" : "Warning"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </main>
      </div>
    </div>
  );
}
