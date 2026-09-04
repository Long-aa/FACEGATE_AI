"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

interface AccessLog {
  id: string;
  time: string;
  date: string;
  userName: string;
  userCode: string;
  camera: string;
  action: "Entry" | "Exit";
  confidence: number;
  result: "Granted" | "Denied" | "Manual Verify";
  unknown?: boolean;
}

const mockLogs: AccessLog[] = [
  { id: "1", time: "10:42:15 SA", date: "24/10/2023", userName: "Nguyễn Văn An", userCode: "EMP-2041", camera: "Cửa chính", action: "Entry", confidence: 98.5, result: "Granted" },
  { id: "2", time: "10:38:02 SA", date: "24/10/2023", userName: "Trần Minh Đức", userCode: "EMP-2042", camera: "Phòng Server B", action: "Entry", confidence: 72.1, result: "Manual Verify" },
  { id: "3", time: "10:15:45 SA", date: "24/10/2023", userName: "Người lạ", userCode: "Chưa đăng ký", camera: "Sảnh phía Tây", action: "Entry", confidence: 15.0, result: "Denied", unknown: true },
  { id: "4", time: "09:55:10 SA", date: "24/10/2023", userName: "Lê Hoàng Nam", userCode: "EMP-2195", camera: "Cửa ra chính", action: "Exit", confidence: 99.2, result: "Granted" },
  { id: "5", time: "09:30:44 SA", date: "24/10/2023", userName: "Phạm Thị Mai", userCode: "EMP-2196", camera: "Cửa chính", action: "Entry", confidence: 97.8, result: "Granted" },
  { id: "6", time: "09:15:22 SA", date: "24/10/2023", userName: "Võ Quốc Bảo", userCode: "EMP-2197", camera: "Phòng họp A", action: "Entry", confidence: 88.3, result: "Granted" },
];

function avatarColor(id: string) {
  const colors = [
    "linear-gradient(135deg,#00D4AA,#3B82F6)",
    "linear-gradient(135deg,#8B5CF6,#EC4899)",
    "linear-gradient(135deg,#F97316,#EF4444)",
    "linear-gradient(135deg,#22C55E,#3B82F6)",
    "linear-gradient(135deg,#F59E0B,#EF4444)",
  ];
  return colors[parseInt(id) % colors.length];
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(-2).join("");
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 90 ? "#00D4AA" : value >= 60 ? "#F97316" : "#EF4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 4, maxWidth: 80, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 4, transition: "width 0.3s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 38 }}>{value}%</span>
    </div>
  );
}

export default function AccessLogsPage() {
  const [selectedCamera, setSelectedCamera] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered = mockLogs.filter((l) => {
    const matchCamera = selectedCamera === "all" || l.camera.includes(selectedCamera);
    const matchStatus = selectedStatus === "all" || l.result === selectedStatus;
    return matchCamera && matchStatus;
  });

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Lịch sử truy cập</h1>
              <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>
                Xem chi tiết nhật ký của tất cả các sự kiện quét nhận diện khuôn mặt.
              </p>
            </div>

            {/* Filter controls */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {/* Date */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span style={{ fontSize: 13, color: "var(--text-primary)" }}>24/10/2023</span>
              </div>
              {/* Camera filter */}
              <select value={selectedCamera} onChange={(e) => setSelectedCamera(e.target.value)}
                style={{ padding: "8px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                <option value="all">Tất cả Camera</option>
                <option value="Cửa chính">Cửa chính</option>
                <option value="Server">Phòng Server</option>
                <option value="Sảnh">Sảnh</option>
              </select>
              {/* Status filter */}
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ padding: "8px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                <option value="all">Trạng thái</option>
                <option value="Granted">Granted</option>
                <option value="Denied">Denied</option>
                <option value="Manual Verify">Manual Verify</option>
              </select>
              {/* Apply */}
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", borderRadius: 10, color: "var(--accent-teal)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
                </svg>
                Áp dụng bộ lọc
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["THỜI GIAN", "NGƯỜI DÙNG", "CAMERA", "HÀNH ĐỘNG", "ĐỘ CHÍNH XÁC", "KẾT QUẢ", "CHI TIẾT"].map((h) => (
                      <th key={h} style={{ padding: "13px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr
                      key={log.id}
                      onMouseEnter={() => setHovered(log.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        borderBottom: "1px solid var(--border)", transition: "background 0.15s",
                        background: hovered === log.id ? "rgba(255,255,255,0.025)" : "transparent",
                        opacity: log.unknown ? 0.9 : 1,
                      }}
                    >
                      {/* Time */}
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: log.result === "Denied" ? "var(--accent-red)" : "var(--text-primary)" }}>{log.time}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{log.date}</div>
                      </td>
                      {/* User */}
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
                            background: log.unknown ? "rgba(239,68,68,0.2)" : avatarColor(log.id),
                            color: log.unknown ? "var(--accent-red)" : "white",
                            border: log.unknown ? "1px solid rgba(239,68,68,0.4)" : "none",
                          }}>
                            {log.unknown ? "?" : initials(log.userName)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: log.unknown ? "var(--accent-red)" : "var(--text-primary)" }}>{log.userName}</div>
                            <div style={{ fontSize: 11, color: log.unknown ? "rgba(239,68,68,0.7)" : "var(--text-muted)" }}>{log.userCode}</div>
                          </div>
                        </div>
                      </td>
                      {/* Camera */}
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{log.camera}</td>
                      {/* Action */}
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={log.action === "Entry" ? "var(--accent-teal)" : "var(--accent-blue)"} strokeWidth="2">
                            {log.action === "Entry"
                              ? <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></>
                              : <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>
                            }
                          </svg>
                          <span style={{ fontSize: 13, color: log.action === "Entry" ? "var(--accent-teal)" : "var(--accent-blue)" }}>
                            {log.action === "Entry" ? "→ Vào" : "← Ra"}
                          </span>
                        </div>
                      </td>
                      {/* Confidence */}
                      <td style={{ padding: "13px 16px" }}>
                        {log.unknown ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 4, background: "var(--accent-red)", borderRadius: 2 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-red)" }}>15.0%</span>
                          </div>
                        ) : (
                          <ConfidenceBar value={log.confidence} />
                        )}
                      </td>
                      {/* Result */}
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                          background:
                            log.result === "Granted" ? "rgba(34,197,94,0.15)" :
                            log.result === "Denied" ? "rgba(239,68,68,0.15)" :
                            "rgba(249,115,22,0.15)",
                          color:
                            log.result === "Granted" ? "var(--accent-green)" :
                            log.result === "Denied" ? "var(--accent-red)" :
                            "var(--accent-orange)",
                          border: `1px solid ${
                            log.result === "Granted" ? "rgba(34,197,94,0.25)" :
                            log.result === "Denied" ? "rgba(239,68,68,0.25)" :
                            "rgba(249,115,22,0.25)"
                          }`,
                        }}>
                          {log.result}
                        </span>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: "13px 16px" }}>
                        <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Hiển thị 1 đến {filtered.length} trong số 248 sự kiện</span>
              <div style={{ display: "flex", gap: 4 }}>
                {["‹", "1", "2", "3", "›"].map((p, i) => (
                  <button key={i} style={{
                    width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)",
                    background: p === "1" ? "var(--accent-teal)" : "rgba(255,255,255,0.04)",
                    color: p === "1" ? "#000" : "var(--text-secondary)", fontSize: 12, cursor: "pointer", fontWeight: p === "1" ? 700 : 400,
                  }}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
