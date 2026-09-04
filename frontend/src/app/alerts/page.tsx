"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

type Severity = "CRITICAL" | "WARNING" | "INFO";
type AlertStatus = "UNRESOLVED" | "INVESTIGATING" | "PENDING" | "RESOLVED";

interface Alert {
  id: string;
  type: string;
  description: string;
  location: string;
  camera: string;
  time: string;
  severity: Severity;
  status: AlertStatus;
}

const mockAlerts: Alert[] = [
  { id: "1", type: "Người không xác định", description: "Confidence: 98%", location: "Main Entrance", camera: "CAM-04", time: "10:42 SA", severity: "CRITICAL", status: "UNRESOLVED" },
  { id: "2", type: "Độ tin cậy thấp", description: "Match: 64% (Req. 85%)", location: "Server Room Hall", camera: "CAM-12", time: "10:15 SA", severity: "WARNING", status: "INVESTIGATING" },
  { id: "3", type: "Camera Offline", description: "Connection Lost", location: "East Parking", camera: "CAM-09", time: "09:30 SA", severity: "WARNING", status: "PENDING" },
  { id: "4", type: "Cửa bị mở bất thường", description: "Held Open > 60s", location: "Loading Dock", camera: "DOOR-02", time: "08:45 SA", severity: "INFO", status: "RESOLVED" },
  { id: "5", type: "Người không xác định", description: "Confidence: 92%", location: "Lobby", camera: "CAM-01", time: "02:11 SA", severity: "CRITICAL", status: "RESOLVED" },
];

const severityConfig: Record<Severity, { color: string; bg: string; icon: React.ReactNode }> = {
  CRITICAL: {
    color: "var(--accent-red)", bg: "rgba(239,68,68,0.12)",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  },
  WARNING: {
    color: "var(--accent-orange)", bg: "rgba(249,115,22,0.12)",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  },
  INFO: {
    color: "var(--accent-blue)", bg: "rgba(59,130,246,0.12)",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  },
};

const statusConfig: Record<AlertStatus, { color: string; bg: string; border: string }> = {
  UNRESOLVED: { color: "var(--accent-red)", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)" },
  INVESTIGATING: { color: "var(--accent-orange)", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.25)" },
  PENDING: { color: "var(--text-muted)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)" },
  RESOLVED: { color: "var(--accent-green)", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.25)" },
};

export default function AlertsPage() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const counts = {
    total: mockAlerts.length,
    critical: mockAlerts.filter((a) => a.severity === "CRITICAL").length,
    warning: mockAlerts.filter((a) => a.severity === "WARNING").length,
    info: mockAlerts.filter((a) => a.severity === "INFO").length,
  };

  const handleAckAll = () => setAcknowledged(new Set(mockAlerts.map((a) => a.id)));

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Cảnh báo bảo mật</h1>
              <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>Phát hiện mối đe dọa và giám sát bất thường theo thời gian thực.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                Tất cả mức độ
              </button>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                24 giờ qua
              </button>
              <button onClick={handleAckAll} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, color: "var(--accent-red)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                Xác nhận tất cả
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "TOTAL ALERTS", value: counts.total, color: "var(--text-primary)", border: "var(--border)", bg: "var(--bg-card)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg> },
              { label: "CRITICAL", value: counts.critical, color: "var(--accent-red)", border: "rgba(239,68,68,0.3)", bg: "rgba(239,68,68,0.06)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
              { label: "WARNING", value: counts.warning, color: "var(--accent-orange)", border: "rgba(249,115,22,0.3)", bg: "rgba(249,115,22,0.06)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
              { label: "INFO", value: counts.info, color: "var(--accent-blue)", border: "rgba(59,130,246,0.3)", bg: "rgba(59,130,246,0.06)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> },
            ].map((stat) => (
              <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: stat.color, letterSpacing: "0.1em", marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${stat.color}15`, border: `1px solid ${stat.color}25`, display: "flex", alignItems: "center", justifyContent: "center", color: stat.color }}>
                  {stat.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Main content */}
          <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
            {/* Alerts table */}
            <div style={{ flex: 1, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Mối đe dọa đang hoạt động</div>
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["", "LOẠI CẢNH BÁO", "VỊ TRÍ", "THỜI GIAN", "TRẠNG THÁI", "HÀNH ĐỘNG"].map((h) => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mockAlerts.map((alert) => {
                      const sev = severityConfig[alert.severity];
                      const stat = statusConfig[alert.status];
                      const isAck = acknowledged.has(alert.id);
                      return (
                        <tr key={alert.id}
                          onMouseEnter={() => setHovered(alert.id)}
                          onMouseLeave={() => setHovered(null)}
                          style={{ borderBottom: "1px solid var(--border)", background: hovered === alert.id ? "rgba(255,255,255,0.025)" : "transparent", transition: "background 0.15s", opacity: isAck ? 0.5 : 1 }}>
                          <td style={{ padding: "14px 14px 14px 16px" }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: sev.color, boxShadow: `0 0 6px ${sev.color}` }} />
                          </td>
                          <td style={{ padding: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: sev.bg, display: "flex", alignItems: "center", justifyContent: "center", color: sev.color, flexShrink: 0 }}>
                                {sev.icon}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: sev.color }}>{alert.type}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{alert.description}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "14px" }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{alert.camera}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>({alert.location})</div>
                          </td>
                          <td style={{ padding: "14px", fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{alert.time}</td>
                          <td style={{ padding: "14px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: stat.bg, color: stat.color, border: `1px solid ${stat.border}` }}>
                              {alert.status}
                            </span>
                          </td>
                          <td style={{ padding: "14px" }}>
                            {alert.status === "UNRESOLVED" ? (
                              <button style={{ padding: "5px 12px", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 6, color: "var(--accent-blue)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Review</button>
                            ) : alert.status === "INVESTIGATING" ? (
                              <button style={{ padding: "5px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>Details</button>
                            ) : alert.status === "PENDING" ? (
                              <button style={{ padding: "5px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>Ping</button>
                            ) : (
                              <button style={{ padding: "5px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>Log</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
                  <button style={{ color: "var(--accent-teal)", fontSize: 13, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>Xem toàn bộ lịch sử</button>
                </div>
              </div>
            </div>

            {/* Live evidence panel */}
            <div style={{ width: 260, background: "var(--bg-card)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, overflow: "hidden", flexShrink: 0 }}>
              {/* Live badge */}
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(239,68,68,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent-red)", animation: "blink 1s infinite" }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--accent-red)", letterSpacing: "0.1em" }}>LIVE EVIDENCE</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>CAM-04</span>
              </div>

              {/* Evidence footage */}
              <div style={{ position: "relative", background: "#050d18", height: 150, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 60% 40%, #0d1a2c, #050d18)" }} />
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(239,68,68,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.03) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
                {/* Unknown person box */}
                <div style={{ position: "absolute", left: "52%", top: "10%", width: 60, height: 80, border: "1px solid rgba(239,68,68,0.7)", boxShadow: "0 0 12px rgba(239,68,68,0.3)" }}>
                  <div style={{ position: "absolute", top: 2, right: -50, background: "rgba(239,68,68,0.9)", borderRadius: 4, padding: "2px 6px" }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: "white" }}>ID: UNKNOV</div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.8)" }}>Match:</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: "white" }}>Threat:HIGH</div>
                  </div>
                </div>
                {/* REC indicator */}
                <div style={{ position: "absolute", bottom: 8, left: 10, display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-red)", animation: "blink 1s infinite" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-red)", letterSpacing: "0.05em" }}>REC</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>• 10:42:15</span>
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Unauthorized Access Attempt</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                    Subject recognized as not belonging to any authorized access group. Main entrance doors remain locked.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 8, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Dispatch
                  </button>
                  <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "var(--accent-red)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Lockdown
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
