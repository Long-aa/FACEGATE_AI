"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/ToastNotification";

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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"ALL" | Severity>("ALL");
  const [dbCounts, setDbCounts] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
    unresolved: 0,
  });

  // Load real alerts from DB
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.alerts.list({
        severity: severityFilter !== "ALL" ? severityFilter : undefined,
      });

      if (data && data.total !== undefined) {
        setDbCounts({
          total: data.total ?? 0,
          critical: data.critical_count ?? 0,
          warning: data.warning_count ?? 0,
          info: data.info_count ?? 0,
          unresolved: data.unresolved_count ?? 0,
        });
      }

      const alertItems = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];

      const mapped: Alert[] = alertItems.map((a: any) => {
        const sev: Severity = (a.severity === "CRITICAL" ? "CRITICAL" : a.severity === "WARNING" ? "WARNING" : "INFO");
        const stat: AlertStatus = (a.status === "RESOLVED" ? "RESOLVED" : a.status === "INVESTIGATING" ? "INVESTIGATING" : a.status === "PENDING" ? "PENDING" : "UNRESOLVED");
        const ts = a.created_at || a.timestamp;
        const timeStr = ts ? new Date(ts).toLocaleTimeString("vi-VN") : "10:42 SA";
        return {
          id: a.id,
          type: a.alert_type || "Cảnh báo an ninh",
          description: a.description || "Phát hiện sự kiện bất thường",
          location: a.location || "Cổng chính",
          camera: a.camera_name || "CAM-01",
          time: timeStr,
          severity: sev,
          status: stat,
        };
      });
      setAlerts(mapped);
      if (mapped.length > 0) {
        setSelectedAlert(mapped[0]);
      }
    } catch (err) {
      console.error("Failed to load alerts from DB:", err);
    } finally {
      setLoading(false);
    }
  }, [severityFilter]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Acknowledge all alerts in DB
  const handleAckAll = async () => {
    try {
      await api.alerts.acknowledgeAll();
      toast.success("Đã xác nhận toàn bộ cảnh báo an ninh trong CSDL!", "XÁC NHẬN CẢNH BÁO");
      await loadAlerts();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi xác nhận cảnh báo trong CSDL.", "THAO TÁC THẤT BẠI");
    }
  };

  // Resolve single alert in DB
  const handleResolve = async (id: string) => {
    try {
      await api.alerts.resolve(id, "Đã kiểm tra & xác nhận an toàn bởi Quản trị viên");
      toast.success("Đã đánh dấu xử lý cảnh báo thành công!", "XỬ LÝ AN NINH");
      await loadAlerts();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi cập nhật trạng thái cảnh báo.", "THAO TÁC THẤT BẠI");
    }
  };

  const counts = {
    total: dbCounts.total || alerts.length,
    critical: dbCounts.critical || alerts.filter((a) => a.severity === "CRITICAL").length,
    warning: dbCounts.warning || alerts.filter((a) => a.severity === "WARNING").length,
    info: dbCounts.info || alerts.filter((a) => a.severity === "INFO").length,
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Cảnh báo bảo mật (Dữ liệu CSDL Thực)</h1>
              <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>Phát hiện mối đe dọa và giám sát bất thường theo thời gian thực từ PostgreSQL.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value as any)}
                style={{ padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer", outline: "none" }}
              >
                <option value="ALL">Tất cả mức độ</option>
                <option value="CRITICAL">Nghiêm trọng (CRITICAL)</option>
                <option value="WARNING">Cảnh báo (WARNING)</option>
                <option value="INFO">Thông tin (INFO)</option>
              </select>
              <button
                onClick={handleAckAll}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, color: "var(--accent-red)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                Xác nhận tất cả trong CSDL
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "TỔNG SỐ CẢNH BÁO", value: counts.total, color: "var(--text-primary)", border: "var(--border)", bg: "var(--bg-card)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg> },
              { label: "NGHIÊM TRỌNG (CRITICAL)", value: counts.critical, color: "var(--accent-red)", border: "rgba(239,68,68,0.3)", bg: "rgba(239,68,68,0.06)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
              { label: "CẢNH BÁO (WARNING)", value: counts.warning, color: "var(--accent-orange)", border: "rgba(249,115,22,0.3)", bg: "rgba(249,115,22,0.06)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
              { label: "THÔNG TIN (INFO)", value: counts.info, color: "var(--accent-blue)", border: "rgba(59,130,246,0.3)", bg: "rgba(59,130,246,0.06)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> },
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
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Mối đe dọa đang hoạt động trong CSDL</div>
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
                    {loading ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                          Đang tải danh sách cảnh báo từ CSDL...
                        </td>
                      </tr>
                    ) : alerts.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                          Không có cảnh báo nào trong cơ sở dữ liệu.
                        </td>
                      </tr>
                    ) : (
                      alerts.map((alert) => {
                        const sev = severityConfig[alert.severity];
                        const stat = statusConfig[alert.status];
                        const isSelected = selectedAlert?.id === alert.id;
                        return (
                          <tr key={alert.id}
                            onClick={() => setSelectedAlert(alert)}
                            onMouseEnter={() => setHovered(alert.id)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ borderBottom: "1px solid var(--border)", background: isSelected ? "rgba(0,212,170,0.06)" : hovered === alert.id ? "rgba(255,255,255,0.025)" : "transparent", transition: "background 0.15s", cursor: "pointer" }}>
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
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleResolve(alert.id); }}
                                  style={{ padding: "5px 12px", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 6, color: "var(--accent-blue)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                                >
                                  Xử lý ngay
                                </button>
                              ) : (
                                <span style={{ fontSize: 11, color: "var(--accent-green)", fontWeight: 600 }}>✓ Đã xử lý</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live evidence panel */}
            <div style={{ width: 280, background: "var(--bg-card)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, overflow: "hidden", flexShrink: 0 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(239,68,68,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent-red)", animation: "blink 1s infinite" }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--accent-red)", letterSpacing: "0.1em" }}>CHI TIẾT ĐỐI SOÁT</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{selectedAlert?.camera || "CAM-01"}</span>
              </div>

              {/* Evidence footage */}
              <div style={{ position: "relative", background: "#050d18", height: 150, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 60% 40%, #0d1a2c, #050d18)" }} />
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(239,68,68,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.03) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
                
                <div style={{ position: "absolute", left: "40%", top: "20%", width: 70, height: 90, border: "1px solid rgba(239,68,68,0.7)", boxShadow: "0 0 12px rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", fontSize: 24, fontWeight: 800 }}>
                  ?
                </div>

                <div style={{ position: "absolute", bottom: 8, left: 10, display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-red)", animation: "blink 1s infinite" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-red)", letterSpacing: "0.05em" }}>REC</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>• {selectedAlert?.time || "10:42:15"}</span>
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{selectedAlert?.type || "Cảnh báo an ninh"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                    {selectedAlert?.description || "Phát hiện đối tượng lạ không có hồ sơ sinh trắc học được lưu trong PostgreSQL."}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--accent-teal)", marginTop: 4 }}>
                    Vị trí: {selectedAlert?.location || "Cửa chính"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {selectedAlert?.status === "UNRESOLVED" ? (
                    <button
                      onClick={() => handleResolve(selectedAlert.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 8, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      Xác nhận giải quyết
                    </button>
                  ) : (
                    <div style={{ width: "100%", padding: "8px", textAlign: "center", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, color: "var(--accent-green)", fontSize: 12, fontWeight: 600 }}>
                      ✓ Đã giải quyết an toàn
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
