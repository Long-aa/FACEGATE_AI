"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/ToastNotification";
import { useRealtimeEvents } from "@/lib/useRealtimeEvents";

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

function getVirtualBadge(vState?: string, countdown?: number) {
  switch (vState) {
    case "UNLOCKING":
      return {
        text: `Đang mở (${countdown || 0}s)`,
        bg: "rgba(0, 212, 170, 0.15)",
        color: "var(--accent-teal)",
        border: "rgba(0, 212, 170, 0.4)",
        icon: "🔓",
      };
    case "OPEN":
      return {
        text: "Cửa đang mở (Người qua)",
        bg: "rgba(245, 158, 11, 0.15)",
        color: "#F59E0B",
        border: "rgba(245, 158, 11, 0.4)",
        icon: "🚪",
      };
    case "HELD_OPEN_WARNING":
      return {
        text: "Cảnh báo: Giữ cửa quá lâu!",
        bg: "rgba(249, 115, 22, 0.2)",
        color: "#F97316",
        border: "rgba(249, 115, 22, 0.5)",
        icon: "⚠️",
      };
    case "FORCED_OPEN_ALARM":
      return {
        text: "BÁO ĐỘNG: CẠY CỬA TRÁI PHÉP!",
        bg: "rgba(239, 68, 68, 0.25)",
        color: "var(--accent-red)",
        border: "rgba(239, 68, 68, 0.6)",
        icon: "🚨",
      };
    case "EMERGENCY_UNLOCKED":
      return {
        text: "SƠ TÁN KHẨN CẤP (TỰ DO)",
        bg: "rgba(168, 85, 247, 0.2)",
        color: "#A855F7",
        border: "rgba(168, 85, 247, 0.5)",
        icon: "🆘",
      };
    case "EMERGENCY_LOCKED":
      return {
        text: "PHONG TỎA KHẨN CẤP (KHÓA)",
        bg: "rgba(220, 38, 38, 0.25)",
        color: "#DC2626",
        border: "rgba(220, 38, 38, 0.6)",
        icon: "⛔",
      };
    default:
      return {
        text: "Đã khóa an toàn (Normal)",
        bg: "rgba(255, 255, 255, 0.05)",
        color: "var(--text-secondary)",
        border: "var(--border)",
        icon: "🔒",
      };
  }
}

export default function DoorsPage() {
  const [doors, setDoors] = useState<Door[]>([]);
  const [virtualStates, setVirtualStates] = useState<Record<string, any>>({});
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

  // Load real doors from DB & virtual state machine
  const loadDoors = useCallback(async () => {
    try {
      const data = await api.doors.list();
      if (Array.isArray(data)) {
        const mapped: Door[] = data.map((d: any) => {
          const isOnline = d.status?.toUpperCase() === "ONLINE" || d.status === "Online";
          const isUnlocked = d.lock_status === "UNLOCKED" || d.lock_status === "Unlocked";
          const nameLower = d.name.toLowerCase();
          return {
            id: d.id,
            name: d.name,
            doorId: d.door_code || d.name.toUpperCase().slice(0, 6),
            status: isOnline ? "Online" : "Offline",
            lockStatus: isUnlocked ? "Unlocked" : "Locked",
            lastActivity: d.last_activity ? new Date(d.last_activity).toLocaleTimeString("vi-VN") : "Vừa xong",
            lastUser: d.last_user_name || "Admin",
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

  const loadVirtualStates = useCallback(async () => {
    try {
      const vs = await api.doors.getVirtualStates();
      if (vs && typeof vs === "object") {
        setVirtualStates(vs);
      }
    } catch (err) {
      console.debug("Failed to fetch virtual states:", err);
    }
  }, []);

  useEffect(() => {
    loadDoors();
    loadVirtualStates();
  }, [loadDoors, loadVirtualStates]);

  // Real-time WebSocket event listener
  useRealtimeEvents((event) => {
    if (event.type === "VIRTUAL_DOOR_STATE_CHANGE") {
      const data = event.data;
      if (data && data.door_id) {
        setVirtualStates((prev) => ({
          ...prev,
          [data.door_id]: data,
        }));
      }
    } else if (event.type === "DOOR_UPDATE") {
      loadDoors();
    }
  });

  // Simulation handler for hardware sensor events
  const handleSimulate = async (doorId: string, simEvent: string) => {
    const actionKey = `${doorId}-${simEvent}`;
    setActionLoadingId(actionKey);
    try {
      const res = await api.doors.simulate(doorId, simEvent);
      setVirtualStates((prev) => ({
        ...prev,
        [doorId]: res,
      }));
      if (simEvent === "FORCE") {
        toast.error("ĐÃ KÍCH HOẠT BÁO ĐỘNG CẠY CỬA TRÁI PHÉP!", "BÁO ĐỘNG ĐỎ");
      } else if (simEvent === "HELD") {
        toast.warning("Phát hiện giữ cửa mở quá thời gian quy định!", "CẢNH BÁO");
      } else if (simEvent === "RESET_ALARM") {
        toast.success("Đã tắt báo động và đưa cửa về trạng thái khóa an toàn.", "TẮT BÁO ĐỘNG");
      } else {
        toast.info(`Cảm biến mô phỏng: ${simEvent}`, "PHẦN CỨNG ẢO");
      }
      await loadDoors();
    } catch (err: any) {
      toast.error(err.message || "Lỗi mô phỏng sự kiện.", "LỖI MÔ PHỎNG");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Emergency actions
  const handleEmergencyEvacuate = async () => {
    if (!confirm("Xác nhận kích hoạt SƠ TÁN KHẨN CẤP? Toàn bộ cửa sẽ được mở khóa tự do!")) return;
    try {
      await api.doors.emergencyEvacuate();
      toast.warning("ĐÃ KÍCH HOẠT SƠ TÁN KHẨN CẤP! TOÀN BỘ CỬA ĐÃ MỞ.", "SƠ TÁN KHẨN CẤP");
      await loadDoors();
      await loadVirtualStates();
    } catch (err: any) {
      toast.error("Lỗi kích hoạt sơ tán.", "THẤT BẠI");
    }
  };

  const handleEmergencyLockdown = async () => {
    if (!confirm("Xác nhận kích hoạt PHONG TỎA KHẨN CẤP? Toàn bộ cửa sẽ bị khóa cứng!")) return;
    try {
      await api.doors.emergencyLockdown();
      toast.error("ĐÃ PHONG TỎA TOÀN BỘ CỬA HỆ THỐNG!", "PHONG TỎA KHẨN CẤP");
      await loadDoors();
      await loadVirtualStates();
    } catch (err: any) {
      toast.error("Lỗi kích hoạt phong tỏa.", "THẤT BẠI");
    }
  };

  const handleEmergencyReset = async () => {
    try {
      await api.doors.emergencyReset();
      toast.success("Đã khôi phục trạng thái cửa bình thường.", "KHÔI PHỤC THÀNH CÔNG");
      await loadDoors();
      await loadVirtualStates();
    } catch (err: any) {
      toast.error("Lỗi khôi phục khẩn cấp.", "THẤT BẠI");
    }
  };

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
      toast.success("Đã khóa cửa an toàn!", "KHÓA CỬA THÀNH CÔNG");
      await loadDoors();
      await loadVirtualStates();
    } catch (err) {
      console.error("Failed to lock door:", err);
      toast.error("Lỗi khi khóa cửa trong CSDL.", "THAO TÁC THẤT BẠI");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Unlock Door in DB
  const handleUnlock = async (id: string, duration = 5) => {
    setActionLoadingId(id);
    try {
      await api.doors.unlock(id, duration);
      toast.success(`Đã gửi lệnh mở khóa cửa (Relay ${duration}s)!`, "MỞ KHÓA THÀNH CÔNG");
      await loadDoors();
      await loadVirtualStates();
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
        door_code: `D-${Date.now().toString().slice(-4)}`,
        name: newDoorName,
        door_type: newDoorType,
        location: "Khu vực chính",
        controller_ip: newDoorControllerIp,
        relay_pin: parseInt(newDoorRelayPin) || 1,
        unlock_duration: parseInt(newDoorDelay) || 5,
        status: "Online",
      });
      setIsAddModalOpen(false);
      setNewDoorName("");
      toast.success(`Đã thêm cửa "${newDoorName}" vào CSDL!`, "TẠO CỬA THÀNH CÔNG");
      await loadDoors();
      await loadVirtualStates();
    } catch (err: any) {
      console.error("Failed to create door:", err);
      toast.error(err.message || "Lỗi khi thêm cửa vào CSDL.", "TẠO THẤT BẠI");
    }
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Mô phỏng & Quản lý Cửa (Virtual Door Machine)</h1>
                <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "rgba(0, 212, 170, 0.15)", color: "var(--accent-teal)", border: "1px solid rgba(0, 212, 170, 0.3)", fontWeight: 600 }}>
                  Giai đoạn 3: Pure Software State Machine
                </span>
              </div>
              <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>
                Mô phỏng máy trạng thái cửa, tiếp điểm cảm biến (Door Sensor) & kiểm soát rơ-le không cần phần cứng vật lý.
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
                Thêm cửa mới
              </button>
            </div>
          </div>

          {/* Emergency Access Control Toolbar */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🚨</span>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Bảng điều khiển Khẩn cấp (Toàn hệ thống):</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 6 }}>Kích hoạt mở/khóa đồng bộ lập tức cho tất cả các điểm kiểm soát.</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleEmergencyEvacuate}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.4)", borderRadius: 8, color: "#C084FC", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
              >
                🆘 Sơ tán khẩn cấp (Mở hết)
              </button>
              <button
                onClick={handleEmergencyLockdown}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(220, 38, 38, 0.15)", border: "1px solid rgba(220, 38, 38, 0.4)", borderRadius: 8, color: "#F87171", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
              >
                ⛔ Phong tỏa khẩn cấp (Khóa hết)
              </button>
              <button
                onClick={handleEmergencyReset}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(255, 255, 255, 0.06)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
              >
                🔄 Khôi phục bình thường
              </button>
            </div>
          </div>

          {/* Summary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { label: "Tổng số cửa", value: doors.length, color: "var(--accent-teal)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6v18H3z"/><path d="M9 3h6l3 3v12l-3 3H9"/></svg> },
              { label: "Đang trực tuyến", value: doors.filter(d => d.status === "Online").length, color: "var(--accent-green)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg> },
              { label: "Đang mở khóa", value: doors.filter(d => d.lockStatus === "Unlocked").length, color: "var(--accent-orange)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> },
              { label: "Cảnh báo / Báo động", value: Object.values(virtualStates).filter((v: any) => v.alarm_active).length, color: "var(--accent-red)", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
              {doors.map((door) => {
                const vs = virtualStates[door.id];
                const vState = vs?.state || (door.lockStatus === "Unlocked" ? "UNLOCKING" : "LOCKED");
                const badge = getVirtualBadge(vState, vs?.countdown_seconds);
                const isAlarm = vs?.alarm_active;

                return (
                  <div
                    key={door.id}
                    onMouseEnter={() => setHovered(door.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      background: "var(--bg-card)",
                      border: `1px solid ${isAlarm ? "rgba(239,68,68,0.5)" : hovered === door.id ? "rgba(0,212,170,0.3)" : "var(--border)"}`,
                      borderRadius: 14,
                      padding: "18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      transition: "all 0.2s ease",
                      transform: hovered === door.id ? "translateY(-2px)" : "none",
                      boxShadow: isAlarm ? "0 0 25px rgba(239,68,68,0.2)" : hovered === door.id ? "0 8px 30px rgba(0,0,0,0.3)" : "none",
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
                        {door.doorId}
                      </span>
                    </div>

                    {/* Virtual State Machine Badge */}
                    <div style={{ background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{badge.icon}</span>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Máy trạng thái ảo</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: badge.color }}>{badge.text}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4 }}>
                        Sensor: {vs?.contact_sensor || "CLOSED"}
                      </span>
                    </div>

                    {/* Active Alarm Banner */}
                    {isAlarm && (
                      <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#FCA5A5", fontWeight: 500 }}>
                          {vs?.alarm_message || "Phát hiện sự cố an ninh tại cửa!"}
                        </span>
                        <button
                          onClick={() => handleSimulate(door.id, "RESET_ALARM")}
                          style={{ padding: "4px 8px", background: "rgba(239, 68, 68, 0.3)", border: "1px solid rgba(239, 68, 68, 0.6)", borderRadius: 6, color: "white", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                        >
                          Tắt còi
                        </button>
                      </div>
                    )}

                    {/* Standard Action buttons */}
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
                        Khóa lại
                      </button>
                      <button
                        onClick={() => handleUnlock(door.id, door.relayDelay || 5)}
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
                        Mở ({door.relayDelay || 5}s)
                      </button>
                      <button
                        onClick={() => setDoorToDelete(door)}
                        title="Xóa cửa"
                        style={{
                          width: 34, display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "8px 0", borderRadius: 8, fontSize: 12, cursor: "pointer",
                          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                          color: "var(--accent-red)", transition: "all 0.15s ease",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>

                    {/* Virtual Hardware Sensor Simulator Panel */}
                    <div style={{ background: "rgba(0,0,0,0.25)", border: "1px dashed var(--border)", borderRadius: 10, padding: "10px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                          🧪 Mô phỏng cảm biến (Virtual Hardware)
                        </span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Không cần phần cứng</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                        <button
                          onClick={() => handleSimulate(door.id, "OPEN")}
                          title="Mô phỏng người đẩy cửa mở (tiếp điểm hở)"
                          style={{ padding: "6px 2px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, cursor: "pointer" }}
                        >
                          🚪 Mở cửa
                        </button>
                        <button
                          onClick={() => handleSimulate(door.id, "CLOSE")}
                          title="Mô phỏng cửa đã đóng khít (tiếp điểm đóng)"
                          style={{ padding: "6px 2px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, cursor: "pointer" }}
                        >
                          🔒 Đóng cửa
                        </button>
                        <button
                          onClick={() => handleSimulate(door.id, "HELD")}
                          title="Mô phỏng chặn cửa quá lâu"
                          style={{ padding: "6px 2px", background: "rgba(249, 115, 22, 0.12)", border: "1px solid rgba(249, 115, 22, 0.3)", borderRadius: 6, color: "#FB923C", fontSize: 11, fontWeight: 500, cursor: "pointer" }}
                        >
                          ⏳ Giữ lâu
                        </button>
                        <button
                          onClick={() => handleSimulate(door.id, "FORCE")}
                          title="Mô phỏng phá khóa/cạy cửa trái phép"
                          style={{ padding: "6px 2px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: 6, color: "#F87171", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                        >
                          🚨 Cạy cửa
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
        }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 16, width: "100%", maxWidth: 450,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Thêm cửa kiểm soát mới</h2>
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
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>IP Controller ảo</label>
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
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Thời gian nhả rơ-le (giây)</label>
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
                  Lưu cửa
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
        }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 16, width: "100%", maxWidth: 440, padding: "24px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.15)",
            display: "flex", flexDirection: "column", gap: 16,
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
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              Bạn có chắc chắn muốn xóa cửa <strong>"{doorToDelete.name}"</strong>? Lịch sử quẹt thẻ và quyền truy cập liên quan có thể bị ảnh hưởng.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDoorToDelete(null)}
                disabled={Boolean(deletingId)}
                style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteDoor}
                disabled={Boolean(deletingId)}
                style={{ padding: "8px 16px", borderRadius: 8, background: "#EF4444", border: "none", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                {deletingId ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
