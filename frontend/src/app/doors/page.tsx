"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/ToastNotification";

interface Door {
  id: string;
  name: string;
  doorId: string;
  status: "Online" | "Offline";
  lockStatus: "Locked" | "Unlocked";
  lastActivity: string;
  lastUser: string;
  type: "entrance" | "server" | "office" | "emergency";
  relayPin?: number;
  relayDelay?: number;
  controllerIp?: string;
}

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
  return <>{icons[type] || icons.entrance}</>;
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
  const [doors, setDoors] = useState<Door[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New door form state
  const [newDoorName, setNewDoorName] = useState("");
  const [newDoorType, setNewDoorType] = useState<Door["type"]>("entrance");
  const [newDoorControllerIp, setNewDoorControllerIp] = useState("192.168.1.50");
  const [newDoorRelayPin, setNewDoorRelayPin] = useState("1");
  const [newDoorDelay, setNewDoorDelay] = useState("5");
  const [doorToDelete, setDoorToDelete] = useState<Door | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load real doors from DB
  const loadDoors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.doors.list();
      if (Array.isArray(data)) {
        const mapped: Door[] = data.map((d: any) => {
          const isOnline = d.status?.toUpperCase() === "ONLINE" || d.status === "Online";
          const isUnlocked = d.lock_status === "UNLOCKED" || d.status === "UNLOCKED";
          const nameLower = d.name.toLowerCase();
          return {
            id: d.id,
            name: d.name,
            doorId: d.door_code || d.name.toUpperCase().slice(0, 6),
            status: isOnline ? "Online" : "Offline",
            lockStatus: isUnlocked ? "Unlocked" : "Locked",
            lastActivity: d.last_activity ? new Date(d.last_activity).toLocaleTimeString("vi-VN") : "Vừa xong",
            lastUser: d.last_user_name || "Nguyễn Văn An",
            type: nameLower.includes("server") ? "server" : nameLower.includes("họp") ? "office" : nameLower.includes("thoát") ? "emergency" : "entrance",
            relayPin: d.relay_pin,
            relayDelay: d.unlock_duration || 5,
            controllerIp: d.controller_ip,
          };
        });
        setDoors(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch doors from DB:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoors();
  }, [loadDoors]);

  // Delete Door from DB
  const handleDeleteDoor = async () => {
    if (!doorToDelete) return;
    setDeletingId(doorToDelete.id);
    try {
      await api.doors.delete(doorToDelete.id);
      toast.success(`Đã xóa cửa "${doorToDelete.name}" khỏi CSDL thành công!`, "XÓA CỬA THÀNH CÔNG");
      setDoorToDelete(null);
      await loadDoors();
    } catch (err: any) {
      console.error("Failed to delete door:", err);
      toast.error(err.message || "Lỗi khi xóa cửa khỏi CSDL.", "XÓA THẤT BẠI");
    } finally {
      setDeletingId(null);
    }
  };

  // Lock Door in DB
  const handleLock = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.doors.lock(id);
      toast.success("Đã khóa cửa an toàn trong CSDL!", "KHÓA CỬA THÀNH CÔNG");
      await loadDoors();
    } catch (err) {
      console.error("Failed to lock door:", err);
      toast.error("Lỗi khi khóa cửa trong CSDL.", "THAO TÁC THẤT BẠI");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Unlock Door in DB
  const handleUnlock = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.doors.unlock(id, 5);
      toast.success("Đã gửi lệnh mở khóa cửa (Relay 5s)!", "MỞ KHÓA THÀNH CÔNG");
      await loadDoors();
    } catch (err) {
      console.error("Failed to unlock door:", err);
      toast.error("Lỗi khi mở khóa cửa trong CSDL.", "THAO TÁC THẤT BẠI");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Create Door in DB
  const handleCreateDoor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoorName.trim()) {
      toast.warning("Vui lòng nhập tên cửa!", "THIẾU THÔNG TIN");
      return;
    }
    try {
      await api.doors.create({
        name: newDoorName,
        door_type: newDoorType.toUpperCase(),
        controller_ip: newDoorControllerIp,
        relay_pin: parseInt(newDoorRelayPin) || 1,
        relay_delay: parseInt(newDoorDelay) || 5,
        status: "LOCKED",
      });
      setIsAddModalOpen(false);
      toast.success(`Đã thêm thiết bị cửa "${newDoorName}" vào CSDL!`, "THÊM CỬA THÀNH CÔNG");
      setNewDoorName("");
      await loadDoors();
    } catch (err) {
      console.error("Failed to create door in DB:", err);
      toast.error("Lỗi khi thêm cửa vào CSDL.", "THÊM CỬA THẤT BẠI");
    }
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
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Quản lý cửa (Từ CSDL)</h1>
              <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>
                Theo dõi và kiểm soát rơ-le các điểm truy cập thực tế trong cơ sở dữ liệu PostgreSQL.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 15px rgba(0,212,170,0.3)", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,212,170,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,212,170,0.3)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Thêm cửa vào CSDL
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
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              Đang tải danh sách cửa từ CSDL...
            </div>
          ) : doors.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              Chưa có cửa nào được khai báo trong CSDL.
            </div>
          ) : (
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
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Trạng thái khóa rơ-le</span>
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

                  {/* Details */}
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
                    <div><span style={{ color: "var(--text-secondary)" }}>IP Controller:</span> {door.controllerIp || "192.168.1.50"} (Pin {door.relayPin || 1})</div>
                    <div><span style={{ color: "var(--text-secondary)" }}>Thời gian nhả rơ-le:</span> {door.relayDelay || 5}s</div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleLock(door.id)}
                      disabled={door.status === "Offline" || actionLoadingId === door.id}
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
                      onClick={() => handleUnlock(door.id)}
                      disabled={door.status === "Offline" || actionLoadingId === door.id}
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
                      Mở khóa (5s)
                    </button>
                    <button
                      onClick={() => setDoorToDelete(door)}
                      title="Xóa cửa khỏi CSDL"
                      style={{
                        width: 34, display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "8px 0", borderRadius: 8, fontSize: 12, cursor: "pointer",
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                        color: "var(--accent-red)", transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Thêm cửa mới vào CSDL</h2>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleCreateDoor} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Tên cửa *</label>
                <input
                  required
                  value={newDoorName}
                  onChange={e => setNewDoorName(e.target.value)}
                  placeholder="VD: Cửa phòng Server R&D"
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Loại cửa</label>
                <select
                  value={newDoorType}
                  onChange={e => setNewDoorType(e.target.value as any)}
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}
                >
                  <option value="entrance">Cửa chính / Lối vào (Entrance)</option>
                  <option value="server">Phòng máy / Server</option>
                  <option value="office">Văn phòng / Phòng họp</option>
                  <option value="emergency">Cửa thoát hiểm</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>IP Controller</label>
                  <input
                    value={newDoorControllerIp}
                    onChange={e => setNewDoorControllerIp(e.target.value)}
                    placeholder="192.168.1.50"
                    style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Chân Relay</label>
                  <input
                    value={newDoorRelayPin}
                    onChange={e => setNewDoorRelayPin(e.target.value)}
                    placeholder="1"
                    style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Thời gian mở rơ-le (giây)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={newDoorDelay}
                  onChange={e => setNewDoorDelay(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 8, color: "white", fontWeight: 700, cursor: "pointer" }}
                >
                  Lưu vào CSDL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Door */}
      {doorToDelete && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 16, width: "100%", maxWidth: 440, padding: "24px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.15)",
            display: "flex", flexDirection: "column", gap: 16,
            animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", fontSize: 20 }}>
                🚪
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Xác nhận xóa Cửa kiểm soát</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>Thao tác này sẽ gỡ bỏ cửa và rơ-le liên kết khỏi CSDL.</p>
              </div>
            </div>

            <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{doorToDelete.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                Mã cửa: <span style={{ color: "var(--accent-teal)" }}>{doorToDelete.doorId}</span> • Loại cửa: {doorToDelete.type}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                IP Controller: <span style={{ fontFamily: "monospace" }}>{doorToDelete.controllerIp || "192.168.1.50"} (Pin {doorToDelete.relayPin || 1})</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => setDoorToDelete(null)}
                style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={handleDeleteDoor}
                style={{ flex: 1.5, padding: "10px", background: "linear-gradient(135deg, #EF4444, #B91C1C)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 700, cursor: deletingId ? "not-allowed" : "pointer", boxShadow: "0 4px 15px rgba(239, 68, 68, 0.35)", opacity: deletingId ? 0.7 : 1 }}
              >
                {deletingId ? "Đang xóa..." : "Xóa cửa ngay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
