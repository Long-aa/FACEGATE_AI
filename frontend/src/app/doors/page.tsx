"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

interface Door {
  id: string;
  name: string;
  doorId: string;
  status: "Online" | "Offline";
  lockStatus: "Locked" | "Unlocked";
  lastActivity: string;
  lastUser: string;
  type: "entrance" | "server" | "office" | "emergency";
}

const mockDoors: Door[] = [
  { id: "1", name: "Cửa chính", doorId: "D-001", status: "Online", lockStatus: "Unlocked", lastActivity: "2 phút trước", lastUser: "Nguyễn Văn An", type: "entrance" },
  { id: "2", name: "Phòng Server", doorId: "D-002", status: "Online", lockStatus: "Locked", lastActivity: "1 giờ trước", lastUser: "Admin", type: "server" },
  { id: "3", name: "Phòng họp A", doorId: "D-003", status: "Online", lockStatus: "Unlocked", lastActivity: "15 phút trước", lastUser: "Lê Hoàng Nam", type: "office" },
  { id: "4", name: "Lối thoát hiểm", doorId: "D-004", status: "Offline", lockStatus: "Locked", lastActivity: "3 giờ trước", lastUser: "System", type: "emergency" },
];

function DoorIcon({ type }: { type: Door["type"] }) {
  const icons: Record<Door["type"], React.ReactNode> = {
    entrance: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h6v18H3z" /><path d="M9 3h6l3 3v12l-3 3H9" /><circle cx="16" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
    server: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
        <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
      </svg>
    ),
    office: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
      </svg>
    ),
    emergency: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  };
  return <>{icons[type]}</>;
}

const typeColors: Record<Door["type"], string> = {
  entrance: "rgba(0,212,170,0.15)",
  server: "rgba(59,130,246,0.15)",
  office: "rgba(139,92,246,0.15)",
  emergency: "rgba(239,68,68,0.15)",
};
const typeIconColors: Record<Door["type"], string> = {
  entrance: "var(--accent-teal)",
  server: "var(--accent-blue)",
  office: "var(--accent-purple)",
  emergency: "var(--accent-red)",
};

export default function DoorsPage() {
  const [doors, setDoors] = useState<Door[]>(mockDoors);
  const [hovered, setHovered] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const toggleLock = (id: string) => {
    setDoors((prev) =>
      prev.map((d) => d.id === id ? { ...d, lockStatus: d.lockStatus === "Locked" ? "Unlocked" : "Locked" } : d)
    );
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Quản lý cửa</h1>
              <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>
                Theo dõi và kiểm soát các điểm truy cập trong toàn bộ cơ sở.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
                </svg>
                Bộ lọc
              </button>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 15px rgba(0,212,170,0.3)", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,212,170,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,212,170,0.3)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Thêm cửa
              </button>
            </div>
          </div>

          {/* Summary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[
              { label: "Tổng số cửa", value: doors.length, color: "var(--accent-teal)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6v18H3z"/><path d="M9 3h6l3 3v12l-3 3H9"/></svg> },
              { label: "Đang trực tuyến", value: doors.filter(d => d.status === "Online").length, color: "var(--accent-green)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg> },
              { label: "Đang mở khóa", value: doors.filter(d => d.lockStatus === "Unlocked").length, color: "var(--accent-orange)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> },
              { label: "Ngoại tuyến", value: doors.filter(d => d.status === "Offline").length, color: "var(--accent-red)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg> },
            ].map((stat) => (
              <div key={stat.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${stat.color}18`, border: `1px solid ${stat.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: stat.color, flexShrink: 0 }}>
                  {stat.icon}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Door cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {doors.map((door) => (
              <div
                key={door.id}
                onMouseEnter={() => setHovered(door.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: "var(--bg-card)", border: `1px solid ${hovered === door.id ? "rgba(0,212,170,0.2)" : "var(--border)"}`,
                  borderRadius: 14, padding: "18px", display: "flex", flexDirection: "column", gap: 14,
                  transition: "all 0.2s ease", transform: hovered === door.id ? "translateY(-2px)" : "none",
                  boxShadow: hovered === door.id ? "0 8px 30px rgba(0,0,0,0.3)" : "none",
                }}
              >
                {/* Door header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: typeColors[door.type], display: "flex", alignItems: "center", justifyContent: "center", color: typeIconColors[door.type], flexShrink: 0 }}>
                      <DoorIcon type={door.type} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{door.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: door.status === "Online" ? "var(--accent-green)" : "var(--accent-red)", boxShadow: door.status === "Online" ? "0 0 6px var(--accent-green)" : "none" }} />
                        <span style={{ fontSize: 12, color: door.status === "Online" ? "var(--accent-green)" : "var(--accent-red)" }}>{door.status}</span>
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)" }}>
                    ID: {door.doorId}
                  </span>
                </div>

                {/* Lock status */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Trạng thái khóa</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={door.lockStatus === "Unlocked" ? "var(--accent-teal)" : "var(--accent-orange)"} strokeWidth="2">
                      {door.lockStatus === "Unlocked"
                        ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>
                        : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>
                      }
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 600, color: door.lockStatus === "Unlocked" ? "var(--accent-teal)" : "var(--accent-orange)" }}>
                      {door.lockStatus === "Unlocked" ? "Đã mở khóa" : "Đã khóa"}
                    </span>
                  </div>
                </div>

                {/* Last activity */}
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Hoạt động cuối:</span> {door.lastActivity} ({door.lastUser})
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => toggleLock(door.id)}
                    disabled={door.status === "Offline"}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: door.status === "Offline" ? "not-allowed" : "pointer",
                      background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                      color: door.status === "Offline" ? "var(--text-muted)" : "var(--text-secondary)",
                      opacity: door.status === "Offline" ? 0.5 : 1,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Khóa
                  </button>
                  <button
                    onClick={() => toggleLock(door.id)}
                    disabled={door.status === "Offline"}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: door.status === "Offline" ? "not-allowed" : "pointer",
                      background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.2)",
                      color: door.status === "Offline" ? "var(--text-muted)" : "var(--accent-teal)",
                      opacity: door.status === "Offline" ? 0.5 : 1,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                    </svg>
                    Mở khóa
                  </button>
                  <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                    Cấu hình
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Add Door Modal */}
      {isAddModalOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 16, width: "100%", maxWidth: 450,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            display: "flex", flexDirection: "column",
            animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Thêm cửa mới</h2>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Tên cửa</label>
                <input placeholder="VD: Cửa chính Tòa nhà A" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", transition: "all 0.2s" }} onFocus={(e) => { e.target.style.borderColor = "var(--accent-teal)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }} />
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Mã ID</label>
                  <input placeholder="D-005" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", transition: "all 0.2s" }} onFocus={(e) => { e.target.style.borderColor = "var(--accent-teal)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Loại cửa</label>
                  <select style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                    <option value="entrance">Lối vào / Cửa chính</option>
                    <option value="office">Văn phòng / Phòng họp</option>
                    <option value="server">Phòng Server (Bảo mật cao)</option>
                    <option value="emergency">Lối thoát hiểm</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Camera liên kết (Tùy chọn)</label>
                <select style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                  <option value="">-- Không liên kết --</option>
                  <option value="CAM-01">CAM-01 - Cửa chính</option>
                  <option value="CAM-02">CAM-02 - Hầm B1</option>
                  <option value="CAM-04">CAM-04 - Lối vào phụ</option>
                </select>
              </div>
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, background: "rgba(0,0,0,0.1)" }}>
              <button onClick={() => setIsAddModalOpen(false)} style={{ padding: "9px 16px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Hủy bỏ</button>
              <button onClick={() => setIsAddModalOpen(false)} style={{ padding: "9px 24px", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", boxShadow: "0 4px 12px rgba(0,212,170,0.2)" }}>Thêm mới</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}} />
    </div>
  );
}
