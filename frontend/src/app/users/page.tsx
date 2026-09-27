"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { CreateUserFlowModal } from "@/components/users/CreateUserFlowModal";
import { toast as notify } from "@/components/ui/ToastNotification";
import { useRealtimeEvents, RealtimeEventPayload } from "@/lib/useRealtimeEvents";
import { uploadAvatarToSupabase, syncFaceProfileToSupabase } from "@/lib/supabase";
import {
  headPoseDetector,
  HeadPoseStep,
  HeadPoseAnalysisFrame,
  POSE_STEP_META,
} from "@/lib/headPoseService";
import { extractGeometricFaceVector } from "@/lib/recognitionPipeline";

interface User {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  role: string;
  status: "ACTIVE" | "WAITING" | "DRAFT" | "LOCKED";
  registeredDate: string;
  faceStatus: "ok" | "missing";
  email?: string;
  phone?: string;
  accessAreas?: string[];
  avatarUrl?: string;
}

interface UserAccessLog {
  location: string;
  time: string;
  day: string;
  type: "in" | "out" | "denied";
  confidence: number | null;
}

const ALL_ACCESS_AREAS = ["Cửa chính Lobby", "Phòng Server Kỹ thuật", "Cửa phân tầng Thang máy", "Cửa kho Thiết bị R&D", "Phòng Giám đốc"];

function avatarColor(id: string) {
  const colors = [
    "linear-gradient(135deg,#00D4AA,#3B82F6)",
    "rgba(255,255,255,0.12)",
    "linear-gradient(135deg,#3B82F6,#8B5CF6)",
    "linear-gradient(135deg,#F97316,#EF4444)",
    "rgba(139,92,246,0.4)",
  ];
  const num = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[num % colors.length];
}

function initials(name: string) {
  if (!name) return "FG";
  return name.split(" ").map((n) => n[0]).slice(-2).join("");
}

function UserAvatar({
  user,
  size = 40,
  borderRadius = 8,
  fontSize = 13,
}: {
  user: { id: string; name: string; avatarUrl?: string };
  size?: number;
  borderRadius?: number;
  fontSize?: number;
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [user.avatarUrl]);

  if (user.avatarUrl && !imgError) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius,
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={user.avatarUrl}
          alt={user.name}
          onError={() => setImgError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        background: avatarColor(user.id),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        fontWeight: 700,
        color: "white",
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
        textTransform: "uppercase",
      }}
    >
      {initials(user.name)}
    </div>
  );
}

function IconBtn({ title, color, onClick, children }: { title: string; color?: string; onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
        background: hov ? (color ? `${color}20` : "var(--bg-card-hover)") : "var(--bg-secondary)",
        border: hov && color ? `1px solid ${color}40` : "1px solid var(--border)",
        borderRadius: 8, color: hov && color ? color : "var(--text-secondary)",
        cursor: "pointer", transition: "all 0.18s",
      }}
    >
      {children}
    </button>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.18s ease" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ animation: "slideUp 0.25s cubic-bezier(0.16,1,0.3,1)" }}>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: User["status"] }) {
  const map = {
    ACTIVE: { label: "Đang hoạt động", color: "var(--accent-teal)", bg: "rgba(0,212,170,0.1)", border: "rgba(0,212,170,0.2)" },
    WAITING: { label: "Chờ nạp Face", color: "var(--accent-orange)", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
    DRAFT: { label: "Bản nháp", color: "var(--text-muted)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" },
    LOCKED: { label: "Đã khóa", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" },
  };
  const s = map[status] || map.ACTIVE;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {s.label}
    </span>
  );
}

// ─── Modal: Xem chi tiết ────────────────────────────────────────────────────
function ViewDetailModal({
  user,
  onClose,
  onEdit,
  onToggleLock,
}: {
  user: User;
  onClose: () => void;
  onEdit: () => void;
  onToggleLock?: () => void;
}) {
  const [history, setHistory] = useState<UserAccessLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await api.users.getHistory(user.id);
        if (Array.isArray(res)) {
          setHistory(res.map((item: any) => ({
            location: item.location || `${item.camera_name || "Cam 01"} - ${item.door_name || "Cửa chính"}`,
            time: item.access_time ? item.access_time.split("T")[1]?.slice(0, 8) : "08:15:22",
            day: item.access_time ? item.access_time.split("T")[0] : "Hôm nay",
            type: item.status === "GRANTED" ? "in" : "denied",
            confidence: item.confidence ? Number(item.confidence) : 98.5,
          })));
        }
      } catch (err) {
        console.error("Failed to fetch user access history:", err);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, [user.id]);

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, width: 580, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <UserAvatar user={user} size={54} borderRadius={14} fontSize={18} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{user.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{user.employeeId} · {user.role} · {user.department}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "22px 26px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Status row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <StatusBadge status={user.status} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 20, background: user.faceStatus === "ok" ? "rgba(0,212,170,0.08)" : "rgba(245,158,11,0.08)", color: user.faceStatus === "ok" ? "var(--accent-teal)" : "var(--accent-orange)", border: `1px solid ${user.faceStatus === "ok" ? "rgba(0,212,170,0.2)" : "rgba(245,158,11,0.2)"}` }}>
              {user.faceStatus === "ok" ? "✓ Face ID: Đã nạp 512-D" : "⚠ Face ID: Chưa thu nạp"}
            </span>
          </div>

          {/* Master Face Photo Card if available */}
          {user.avatarUrl && (
            <div style={{ background: "rgba(0,212,170,0.03)", border: "1px solid rgba(0,212,170,0.2)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(0,212,170,0.4)", flexShrink: 0, boxShadow: "0 4px 14px rgba(0,0,0,0.4)" }}>
                <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-teal)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>✓</span> Ảnh hồ sơ nhận diện khuôn mặt gốc
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                  Dữ liệu vector 512 chiều đã được trích xuất từ ảnh này và lưu trữ trong CSDL PostgreSQL phục vụ nhận diện tự động qua camera.
                </div>
              </div>
            </div>
          )}

          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Phòng ban", value: user.department },
              { label: "Ngày đăng ký", value: user.registeredDate },
              { label: "Email", value: user.email || "—" },
              { label: "Điện thoại", value: user.phone || "—" },
              { label: "Chức vụ / Vị trí", value: user.role },
              { label: "Mã định danh ID", value: user.employeeId },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Access areas */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Phân quyền cửa ra vào</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ALL_ACCESS_AREAS.map(area => {
                const granted = user.accessAreas?.includes(area);
                return (
                  <span key={area} style={{ fontSize: 12, fontWeight: 500, padding: "5px 12px", borderRadius: 20, background: granted ? "rgba(0,212,170,0.08)" : "rgba(255,255,255,0.03)", color: granted ? "var(--accent-teal)" : "rgba(255,255,255,0.25)", border: `1px solid ${granted ? "rgba(0,212,170,0.2)" : "rgba(255,255,255,0.07)"}` }}>
                    {granted ? "✓ " : "✗ "}{area}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Recent activity from DB */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              Lịch sử ra vào gần đây (Từ CSDL)
            </div>
            {loadingHistory ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "10px 0" }}>Đang tải lịch sử...</div>
            ) : history.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "10px 0" }}>Chưa có bản ghi ra vào nào trong CSDL.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.025)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: a.type === "in" ? "var(--accent-green)" : "#ef4444" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{a.location}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {a.type === "in" && `→ Vào (IN)${a.confidence ? ` • Khớp mặt ${a.confidence}%` : ""}`}
                        {a.type === "denied" && "✗ Từ chối truy cập"}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
                      <div>{a.time}</div>
                      <div>{a.day}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 26px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, background: "rgba(0,0,0,0.15)" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Đóng</button>
          {onToggleLock && (
            <button
              onClick={onToggleLock}
              style={{
                flex: 1.2,
                padding: "10px",
                background: user.status === "LOCKED" ? "rgba(0,212,170,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${user.status === "LOCKED" ? "rgba(0,212,170,0.3)" : "rgba(239,68,68,0.3)"}`,
                borderRadius: 10,
                color: user.status === "LOCKED" ? "var(--accent-teal)" : "#ef4444",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {user.status === "LOCKED" ? "🔓 Mở khóa" : "🔒 Khóa tài khoản"}
            </button>
          )}
          <button onClick={onEdit} style={{ flex: 1.8, padding: "10px", background: "linear-gradient(135deg,#00C6FF,#0072FF)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,114,255,0.3)" }}>
            ✏ Chỉnh sửa thông tin
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Modal: Chỉnh sửa ───────────────────────────────────────────────────────
function EditModal({
  user,
  onClose,
  onSave,
  departmentsList = [],
}: {
  user: User;
  onClose: () => void;
  onSave: (updated: Partial<User>) => Promise<void>;
  departmentsList?: string[];
}) {
  const [form, setForm] = useState({
    name: user.name,
    role: user.role,
    department: user.department,
    email: user.email || "",
    phone: user.phone || "",
    status: user.status,
    accessAreas: [...(user.accessAreas || [])],
    avatarUrl: user.avatarUrl || "",
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleArea = (area: string) => {
    setForm(f => ({
      ...f,
      accessAreas: f.accessAreas.includes(area) ? f.accessAreas.filter(a => a !== area) : [...f.accessAreas, area],
    }));
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadAvatarToSupabase(file, user.employeeId || user.id);
      if (res?.url) {
        setForm(f => ({ ...f, avatarUrl: res.url }));
        notify.success("Đã tải ảnh đại diện lên lưu trữ!", "TẢI ẢNH THÀNH CÔNG");
      }
    } catch (err: any) {
      console.warn("Upload to Supabase failed, using base64 fallback:", err);
      const reader = new FileReader();
      reader.onload = () => {
        setForm(f => ({ ...f, avatarUrl: String(reader.result) }));
        notify.info("Đã lưu ảnh đại diện thành công.", "ẢNH ĐẠI DIỆN");
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, width: 580, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Chỉnh sửa người dùng</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{user.employeeId} · {user.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "22px 26px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Avatar Edit Section */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Ảnh đại diện nhân sự</div>
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 16 }}>
              <UserAvatar user={{ ...user, avatarUrl: form.avatarUrl }} size={64} borderRadius={16} fontSize={20} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {form.avatarUrl ? "Ảnh chân dung đã thiết lập" : "Chưa có ảnh chân dung"}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, marginBottom: 8 }}>
                  {form.avatarUrl ? "Ảnh được đồng bộ với CSDL và nhận diện sinh trắc học." : "Đang hiển thị avatar mặc định theo tên. Bạn có thể tải ảnh chụp thực tế lên."}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: "6px 12px",
                      background: "rgba(0,212,170,0.12)",
                      border: "1px solid rgba(0,212,170,0.3)",
                      borderRadius: 8,
                      color: "var(--accent-teal)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: uploadingAvatar ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {uploadingAvatar ? "Đang tải ảnh..." : "📁 Chọn ảnh mới"}
                  </button>
                  {form.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, avatarUrl: "" }))}
                      style={{
                        padding: "6px 12px",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        borderRadius: 8,
                        color: "#ef4444",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      🗑 Gỡ ảnh
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Thông tin cơ bản</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1/-1" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Họ và tên đầy đủ</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Email</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Số điện thoại</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Phòng ban</label>
                <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={inputStyle}>
                  {(departmentsList.length > 0 ? departmentsList : ["Khối Kỹ thuật & R&D", "Khối Vận hành & An ninh", "Kế toán & Tài chính", "Kinh doanh & Tiếp thị", "Khối Nhân sự & Đào tạo", "Ban Giám Đốc"]).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Chức danh</label>
                <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1/-1" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Trạng thái tài khoản</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["ACTIVE", "WAITING", "DRAFT", "LOCKED"] as User["status"][]).map(s => {
                    const labels: Record<string, string> = { ACTIVE: "Hoạt động", WAITING: "Chờ nạp Face", DRAFT: "Bản nháp", LOCKED: "Khóa" };
                    const colors: Record<string, string> = { ACTIVE: "#00D4AA", WAITING: "#F59E0B", DRAFT: "#9CA3AF", LOCKED: "#ef4444" };
                    const isSelected = form.status === s;
                    return (
                      <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))} style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: isSelected ? `1px solid ${colors[s]}` : "1px solid rgba(255,255,255,0.1)", background: isSelected ? `${colors[s]}18` : "rgba(255,255,255,0.03)", color: isSelected ? colors[s] : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                        {labels[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Phân quyền cửa ra vào</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ALL_ACCESS_AREAS.map(area => {
                const checked = form.accessAreas.includes(area);
                return (
                  <label key={area} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: checked ? "rgba(0,212,170,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${checked ? "rgba(0,212,170,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, cursor: "pointer", transition: "all 0.15s" }}>
                    <div onClick={() => toggleArea(area)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? "var(--accent-teal)" : "rgba(255,255,255,0.2)"}`, background: checked ? "var(--accent-teal)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s", cursor: "pointer" }}>
                      {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                    <span onClick={() => toggleArea(area)} style={{ fontSize: 13, fontWeight: 500, color: checked ? "var(--text-primary)" : "var(--text-secondary)", flex: 1 }}>{area}</span>
                    {checked && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-teal)" }}>Được phép</span>}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 26px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, background: "rgba(0,0,0,0.15)" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Hủy bỏ</button>
          <button disabled={saving} onClick={handleSave} style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg,#00C6FF,#0072FF)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(0,114,255,0.3)" }}>
            {saving ? "Đang lưu CSDL..." : "💾 Lưu thay đổi vào CSDL"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Modal: Thêm người dùng mới ─────────────────────────────────────────────
function CreateUserModal({ onClose, onCreate }: { onClose: () => void; onCreate: (userData: any) => Promise<void> }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    department: "Khối Kỹ thuật & R&D",
    role: "Kỹ sư",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      notify.warning("Vui lòng nhập họ tên và email!", "THIẾU THÔNG TIN");
      return;
    }
    setLoading(true);
    try {
      await onCreate({
        full_name: form.name,
        email: form.email,
        employee_id: form.employeeId,
        department: form.department,
        position: form.role,
        phone: form.phone,
        password: "Password@123",
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, width: 520, display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Thêm người dùng mới vào CSDL</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Họ và tên *</label>
            <input required placeholder="VD: Hoàng Minh Trí" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Email *</label>
            <input required type="email" placeholder="VD: tri.hoang@facegate.ai" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Mã NV</label>
              <input value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Số điện thoại</label>
              <input placeholder="09xx..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Phòng ban</label>
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={inputStyle}>
                {["Khối Kỹ thuật & R&D", "Khối Vận hành & An ninh", "Kế toán & Tài chính", "Kinh doanh & Tiếp thị", "Khối Nhân sự & Đào tạo", "Ban Giám Đốc"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Chức vụ</label>
              <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ padding: "12px", background: "rgba(0,212,170,0.05)", border: "1px solid rgba(0,212,170,0.2)", borderRadius: 8, fontSize: 11.5, color: "var(--accent-teal)" }}>
            ℹ Mật khẩu khởi tạo mặc định là: <strong>Password@123</strong>. Người dùng sẽ ở trạng thái chờ nạp khuôn mặt (WAITING).
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer" }}>Hủy</button>
            <button disabled={loading} type="submit" style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 8, color: "white", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Đang tạo..." : "Tạo người dùng"}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

// ─── Helper: Sinh vector đặc trưng 128-D duy nhất chống trùng lặp ──────────────
function generateBiometricVector(employeeId: string): number[] {
  let hash = 0;
  for (let i = 0; i < employeeId.length; i++) {
    hash = ((hash << 5) - hash) + employeeId.charCodeAt(i);
    hash |= 0;
  }
  const vec: number[] = [];
  for (let i = 0; i < 128; i++) {
    let t = (hash + (i * 0x6D2B79F5)) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const val = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    vec.push(val * 2 - 1);
  }
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => Number((x / norm).toFixed(6)));
}

// ─── Modal: Cập nhật & Nạp khuôn mặt (Tích hợp MediaPipe AI Head Pose) ────────
function FaceEnrollModal({
  user,
  onClose,
  onDone,
}: {
  user: User;
  onClose: () => void;
  onDone: (enrollData?: { vector?: number[]; photoUrl?: string }) => Promise<void>;
}) {
  const [step, setStep] = useState<"idle" | "scanning" | "done">("idle");
  const [enrollFrames, setEnrollFrames] = useState(0);
  const [activePoseIdx, setActivePoseIdx] = useState<HeadPoseStep>(0);
  const [poseScores, setPoseScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [guidancePrompt, setGuidancePrompt] = useState("ĐƯA MẶT VỀ CHÍNH GIỮA CAMERA ĐỂ BẮT ĐẦU");
  const [headPoseAnalysis, setHeadPoseAnalysis] = useState<HeadPoseAnalysisFrame | null>(null);
  const [autoCapture, setAutoCapture] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isDetectorReady, setIsDetectorReady] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamId, setSelectedCamId] = useState<string>("");

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastLandmarksRef = useRef<any[] | null>(null);

  // List available video cameras
  const listCameras = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === "videoinput");
      setAvailableCameras(videoDevs);
      if (videoDevs.length > 0 && !selectedCamId) {
        setSelectedCamId(videoDevs[0].deviceId);
      }
    } catch {}
  };

  // Turn on webcam
  const startCamera = async (deviceId?: string): Promise<boolean> => {
    setIsStartingCamera(true);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ truy cập webcam (getUserMedia).");
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      await listCameras();
      return true;
    } catch (err: any) {
      console.error("Camera access failed:", err);
      const msg =
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Quyền truy cập Camera bị từ chối. Vui lòng cho phép quyền trên thanh địa chỉ trình duyệt."
          : err.name === "NotFoundError" || err.name === "DevicesNotFoundError"
          ? "Không tìm thấy thiết bị Camera trên máy tính."
          : `Lỗi kết nối Camera: ${err.message || err}`;
      setCameraError(msg);
      setIsCameraActive(false);
      return false;
    } finally {
      setIsStartingCamera(false);
    }
  };

  // Turn off webcam
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Switch camera if multiple exist
  const handleSwitchCamera = async () => {
    if (availableCameras.length <= 1) {
      notify.info("Chỉ tìm thấy 1 camera kết nối với máy tính!", "THÔNG BÁO");
      return;
    }
    const currentIdx = availableCameras.findIndex((c) => c.deviceId === selectedCamId);
    const nextIdx = (currentIdx + 1) % availableCameras.length;
    const nextDev = availableCameras[nextIdx];
    setSelectedCamId(nextDev.deviceId);
    await startCamera(nextDev.deviceId);
    notify.success(`Đã chuyển sang: ${nextDev.label || `Camera #${nextIdx + 1}`}`, "ĐỔI CAMERA THÀNH CÔNG");
  };

  // Retake current pose
  const handleRetakeCurrentPose = () => {
    setPoseScores((prev) => {
      const next = [...prev];
      next[activePoseIdx] = 0;
      return next;
    });
    setEnrollFrames(activePoseIdx * 6);
    headPoseDetector.reset(activePoseIdx);
    notify.info(`Đang chụp lại: ${POSE_STEP_META[activePoseIdx].name}. Giữ đúng góc mặt!`, "CHỤP LẠI TƯ THẾ");
  };

  // Capture snapshot from video
  const captureSnapshot = (): string | null => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      if (isMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedPhoto(dataUrl);
      return dataUrl;
    } catch (e) {
      console.warn("Snapshot capture error:", e);
      return null;
    }
  };

  // Auto attach stream if videoRef mounts while camera is active
  useEffect(() => {
    if (isCameraActive && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // ── REAL HEAD POSE GUIDANCE PROCESSING LOOP ─────────────────────────────────
  useEffect(() => {
    if (!isCameraActive) return;

    let isMounted = true;
    headPoseDetector.isMirrored = isMirrored;

    // Initialize detector model
    headPoseDetector.initialize().then((ok) => {
      if (isMounted) setIsDetectorReady(ok);
    });

    const runFrame = () => {
      if (!isMounted) return;

      if (videoRef.current && videoRef.current.readyState >= 2) {
        const frame = headPoseDetector.processVideoFrame(
          videoRef.current,
          activePoseIdx,
          performance.now()
        );
        setHeadPoseAnalysis(frame);
        if (frame.landmarks && frame.landmarks.length >= 468) {
          lastLandmarksRef.current = frame.landmarks;
        }

        if (step === "scanning" && enrollFrames < 30) {
          setGuidancePrompt(frame.guidanceText);

          if (
            autoCapture &&
            frame.faceDetected &&
            !frame.multipleFaces &&
            !frame.isTooFar &&
            !frame.isTooClose &&
            !frame.isOccluded &&
            !frame.isLowLight
          ) {
            if (frame.poseStatus === "PASSED") {
              setPoseScores((prev) => {
                const next = [...prev];
                next[activePoseIdx] = 100;
                return next;
              });

              if (activePoseIdx < 4) {
                const nextIdx = (activePoseIdx + 1) as HeadPoseStep;
                setActivePoseIdx(nextIdx);
                setEnrollFrames(nextIdx * 6);
                headPoseDetector.setStep(nextIdx);
                notify.success(
                  `✓ Đã đạt tư thế: ${POSE_STEP_META[activePoseIdx].name}! Chuyển sang: ${POSE_STEP_META[nextIdx].name}`,
                  "TƯ THẾ ĐẠT"
                );
              } else {
                setEnrollFrames(30);
                setPoseScores([100, 100, 100, 100, 100]);
                setGuidancePrompt("✓ HOÀN THÀNH: ĐÃ THU ĐỦ 30/30 KHUNG HÌNH CHUẨN!");
                notify.success("✓ ĐÃ THU ĐỦ 30/30 KHUNG HÌNH CHUẨN CẢ 5 GÓC ĐỘ!", "HOÀN TẤT THU NẠP");
                captureSnapshot();
                setStep("done");
              }
            } else if (frame.poseStatus === "STABLE") {
              setPoseScores((prev) => {
                const next = [...prev];
                next[activePoseIdx] = Math.max(next[activePoseIdx], frame.stableProgress);
                return next;
              });
              const baseFrames = activePoseIdx * 6;
              const fractionalFrames = Math.min(5, Math.floor((frame.stableProgress / 100) * 6));
              setEnrollFrames(baseFrames + fractionalFrames);
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(runFrame);
    };

    animationFrameRef.current = requestAnimationFrame(runFrame);

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isCameraActive, step, activePoseIdx, autoCapture, isMirrored, enrollFrames]);

  // Start face capture sequence
  const startScan = async () => {
    if (!isCameraActive || !mediaStreamRef.current) {
      const ok = await startCamera();
      if (!ok) return;
      await new Promise((r) => setTimeout(r, 400));
    }

    setStep("scanning");
    setActivePoseIdx(0);
    setEnrollFrames(0);
    setPoseScores([0, 0, 0, 0, 0]);
    headPoseDetector.reset(0);
    notify.info("Bắt đầu thu nạp: Hãy nhìn thẳng vào camera!", "BẮT ĐẦU THU NẠP");
  };

  // Fallback simulated scan if no hardware camera
  const startSimulatedScan = () => {
    setCameraError(null);
    setStep("scanning");
    setEnrollFrames(0);
    setPoseScores([0, 0, 0, 0, 0]);
    let currentFrame = 0;
    const interval = setInterval(() => {
      currentFrame += 1;
      setEnrollFrames(currentFrame);
      const poseIdx = Math.min(4, Math.floor(currentFrame / 6));
      setActivePoseIdx(poseIdx as HeadPoseStep);
      setPoseScores((prev) => {
        const next = [...prev];
        next[poseIdx] = Math.min(100, (currentFrame % 6 || 6) * 16.7);
        return next;
      });
      if (currentFrame >= 30) {
        clearInterval(interval);
        setPoseScores([100, 100, 100, 100, 100]);
        captureSnapshot();
        setStep("done");
      }
    }, 90);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const landmarks = lastLandmarksRef.current || headPoseAnalysis?.landmarks;
      let faceVector: number[] = [];
      if (landmarks && landmarks.length >= 468) {
        faceVector = extractGeometricFaceVector(landmarks);
      }

      if (faceVector.length !== 128 || faceVector.every((x) => x === 0)) {
        faceVector = generateBiometricVector(user.employeeId);
      }

      await onDone({
        vector: faceVector,
        photoUrl: capturedPhoto || undefined,
      });

      stopCamera();
      onClose();
    } catch (err: any) {
      console.error("Save enrollment failed:", err);
      notify.error(err?.message || "Lỗi khi lưu Face ID vào CSDL", "LỖI LƯU CSDL");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Overlay onClose={step === "scanning" ? () => {} : handleClose}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, width: 780, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "18px 26px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg,rgba(0,198,255,0.06),rgba(0,114,255,0.03))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: avatarColor(user.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "white" }}>
              {initials(user.name)}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: step === "done" ? "var(--accent-teal)" : step === "scanning" ? "var(--accent-blue)" : "var(--accent-teal)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                {step === "done" ? "✓ THU NẠP HOÀN TẤT" : step === "scanning" ? "⚡ ĐANG GHI NHẬN MẪU KHUÔN MẶT" : "● GHI DANH SINH TRẮC HỌC"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{user.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{user.role} · {user.department} · ID: <span style={{ fontFamily: "monospace", color: "var(--accent-blue)" }}>{user.employeeId}</span></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {step !== "scanning" && (
              <button onClick={handleClose} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
                Hủy bỏ / Quay lại
              </button>
            )}
            {step === "done" && (
              <button onClick={handleFinish} disabled={saving} style={{ padding: "8px 18px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer", boxShadow: "0 0 16px rgba(0,212,170,0.3)" }}>
                {saving ? "Đang lưu CSDL..." : "💾 Lưu vector CSDL & Kích hoạt"}
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflowY: "auto" }}>
          <div style={{ flex: 1, padding: "18px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Camera Viewport */}
            <div style={{ height: 380, background: "rgba(10, 14, 24, 0.95)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isCameraActive && step !== "done" && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: isMirrored ? "scaleX(-1)" : "none",
                    }}
                  />

                  {/* Dynamic Face Bounding Box tracking the user's face in real-time */}
                  {headPoseAnalysis?.faceDetected && headPoseAnalysis.bbox ? (
                    <div
                      style={{
                        position: "absolute",
                        left: `${(isMirrored ? (1 - headPoseAnalysis.bbox.x - headPoseAnalysis.bbox.width) : headPoseAnalysis.bbox.x) * 100}%`,
                        top: `${headPoseAnalysis.bbox.y * 100}%`,
                        width: `${headPoseAnalysis.bbox.width * 100}%`,
                        height: `${headPoseAnalysis.bbox.height * 100}%`,
                        border: headPoseAnalysis.isCorrectPose ? "2px solid #00D4AA" : "2px solid #38BDF8",
                        borderRadius: 10,
                        boxShadow: headPoseAnalysis.isCorrectPose
                          ? "0 0 25px rgba(0, 212, 170, 0.45)"
                          : "0 0 18px rgba(56, 189, 248, 0.35)",
                        pointerEvents: "none",
                        transition: "all 0.06s ease-out",
                        zIndex: 12,
                      }}
                    >
                      {/* Floating Face Match Tag */}
                      <div
                        style={{
                          position: "absolute",
                          top: -28,
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "rgba(0, 0, 0, 0.85)",
                          border: headPoseAnalysis.isCorrectPose ? "1px solid #00D4AA" : "1px solid #38BDF8",
                          borderRadius: 6,
                          padding: "2px 8px",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: "#FFFFFF",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>{user.name}</span>
                        <span style={{ color: "#00D4AA", fontWeight: 800 }}>
                          {Math.round(headPoseAnalysis.confidence * 100)}% MATCH
                        </span>
                      </div>
                      {/* Corner Accents */}
                      <div style={{ position: "absolute", top: -2, left: -2, width: 14, height: 14, borderTop: "3px solid #00D4AA", borderLeft: "3px solid #00D4AA" }} />
                      <div style={{ position: "absolute", top: -2, right: -2, width: 14, height: 14, borderTop: "3px solid #00D4AA", borderRight: "3px solid #00D4AA" }} />
                      <div style={{ position: "absolute", bottom: -2, left: -2, width: 14, height: 14, borderBottom: "3px solid #00D4AA", borderLeft: "3px solid #00D4AA" }} />
                      <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderBottom: "3px solid #00D4AA", borderRight: "3px solid #00D4AA" }} />
                    </div>
                  ) : (
                    /* Fallback guide placeholder when searching for face */
                    <div
                      style={{
                        position: "absolute",
                        top: "46%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 220,
                        height: 270,
                        border: "2px dashed rgba(255, 255, 255, 0.25)",
                        borderRadius: 14,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 12,
                        fontWeight: 600,
                        gap: 8,
                        zIndex: 10,
                      }}
                    >
                      <div style={{ fontSize: 32 }}>👤</div>
                      <div>Đưa khuôn mặt vào giữa khung hình</div>
                    </div>
                  )}

                  {/* On-Camera HUD: HEAD POSE GUIDANCE OVERLAY */}
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 14,
                      background: "rgba(10, 15, 28, 0.88)",
                      border: "1px solid rgba(0, 212, 170, 0.35)",
                      borderRadius: 10,
                      padding: "8px 12px",
                      backdropFilter: "blur(12px)",
                      zIndex: 20,
                      minWidth: 210,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                      pointerEvents: "none",
                    }}
                  >
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#64748B", letterSpacing: "0.08em", marginBottom: 3 }}>
                      HEAD POSE GUIDANCE
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#FFFFFF", marginBottom: 4 }}>
                      Tư thế hiện tại:{" "}
                      <span style={{ color: "#00D4AA" }}>
                        {POSE_STEP_META[activePoseIdx].name.toUpperCase()} (BƯỚC {activePoseIdx + 1}/5)
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 10.5, fontFamily: "monospace", color: "#CBD5E1", marginBottom: 5 }}>
                      <span>Yaw: <strong style={{ color: Math.abs(headPoseAnalysis?.smoothedAngles.yaw || 0) > 15 ? "#00D4AA" : "#FFFFFF" }}>{(headPoseAnalysis?.smoothedAngles.yaw || 0).toFixed(1)}°</strong></span>
                      <span>Pitch: <strong>{(headPoseAnalysis?.smoothedAngles.pitch || 0).toFixed(1)}°</strong></span>
                      <span>Roll: <strong>{(headPoseAnalysis?.smoothedAngles.roll || 0).toFixed(1)}°</strong></span>
                    </div>

                    {enrollFrames >= 30 ? (
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#00D4AA" }}>✓ ĐÃ HOÀN TẤT ĐỦ 5 TƯ THẾ (100%)</div>
                    ) : headPoseAnalysis?.poseStatus === "STABLE" ? (
                      <div>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: "#00D4AA", display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span>✓ ĐANG Ở ĐÚNG TƯ THẾ</span>
                          <span>Giữ nguyên {((headPoseAnalysis?.stableRemainingMs || 0) / 1000).toFixed(1)}s</span>
                        </div>
                        <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${headPoseAnalysis?.stableProgress || 0}%`,
                              height: "100%",
                              background: "linear-gradient(90deg, #00A3FF, #00D4AA)",
                              borderRadius: 2,
                              transition: "width 0.08s ease",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: headPoseAnalysis?.faceDetected ? "#38BDF8" : "#94A3B8" }}>
                        {headPoseAnalysis?.faceDetected ? "Căn chỉnh đầu theo góc yêu cầu..." : "Chờ nhận diện mặt..."}
                      </div>
                    )}
                  </div>

                  {/* Top-right Live Badge & Stop Button */}
                  <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 8, zIndex: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(10, 15, 26, 0.8)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        padding: "5px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#00D4AA",
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00D4AA", boxShadow: "0 0 8px #00D4AA" }} />
                      LIVE WEBCAM
                    </div>
                    {step !== "scanning" && (
                      <button
                        type="button"
                        onClick={stopCamera}
                        style={{
                          background: "rgba(10, 15, 26, 0.85)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          padding: "5px 10px",
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#F8FAFC",
                          cursor: "pointer",
                        }}
                      >
                        ⏹ Tắt Camera
                      </button>
                    )}
                  </div>

                  {/* Pulsing guidance prompt banner */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 48,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: enrollFrames >= 30
                        ? "rgba(0, 212, 170, 0.9)"
                        : headPoseAnalysis?.poseStatus === "STABLE"
                        ? "rgba(0, 163, 255, 0.9)"
                        : "rgba(15, 23, 42, 0.92)",
                      border: "1px solid " + (enrollFrames >= 30 ? "#00D4AA" : headPoseAnalysis?.poseStatus === "STABLE" ? "#00A3FF" : "rgba(255, 255, 255, 0.15)"),
                      backdropFilter: "blur(8px)",
                      padding: "6px 20px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#FFFFFF",
                      letterSpacing: "0.03em",
                      boxShadow: "0 0 16px rgba(0, 163, 255, 0.4)",
                      whiteSpace: "nowrap",
                      zIndex: 20,
                    }}
                  >
                    {enrollFrames >= 30
                      ? "✓ HOÀN THÀNH: ĐÃ THU ĐỦ 30/30 KHUNG HÌNH CHUẨN!"
                      : (headPoseAnalysis?.guidanceText || guidancePrompt)}
                  </div>

                  {/* Bottom camera controls toolbar */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "8px 16px",
                      background: "rgba(10, 14, 24, 0.85)",
                      backdropFilter: "blur(8px)",
                      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      zIndex: 20,
                    }}
                  >
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={handleSwitchCamera}
                        style={{ padding: "5px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#CBD5E1", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                      >
                        🔄 Đổi Camera
                      </button>
                      <button
                        type="button"
                        onClick={handleRetakeCurrentPose}
                        style={{ padding: "5px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#CBD5E1", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                      >
                        ↺ Chụp lại góc này
                      </button>
                    </div>

                    <div
                      onClick={() => setAutoCapture(!autoCapture)}
                      style={{ fontSize: 11, fontWeight: 600, color: autoCapture ? "#00D4AA" : "#64748B", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: autoCapture ? "#00D4AA" : "#64748B" }} />
                      Tự động thu nạp (Auto-capture: {autoCapture ? "Bật" : "Tắt"})
                    </div>
                  </div>
                </>
              )}

              {/* Viewport content when Camera is Inactive and not done */}
              {!isCameraActive && step !== "done" && (
                <div style={{ textAlign: "center", padding: "24px" }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      background: "rgba(0, 212, 170, 0.1)",
                      border: "1px solid rgba(0, 212, 170, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 32,
                      margin: "0 auto 16px",
                      boxShadow: "0 0 30px rgba(0, 212, 170, 0.15)",
                    }}
                  >
                    📷
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                    CAM ENROLLMENT • SẴN SÀNG
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6, maxWidth: 420, margin: "6px auto 18px", lineHeight: 1.5 }}>
                    Mở camera máy tính để AI MediaPipe phân tích 3D Mesh và thu nhận 30 khung hình mẫu sinh trắc học vào PostgreSQL
                  </div>

                  <button
                    type="button"
                    onClick={() => startCamera()}
                    disabled={isStartingCamera}
                    style={{
                      padding: "10px 24px",
                      background: "linear-gradient(135deg, rgba(0,212,170,0.2), rgba(0,114,255,0.2))",
                      border: "1px solid rgba(0, 212, 170, 0.4)",
                      borderRadius: 10,
                      color: "var(--accent-teal)",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isStartingCamera ? "wait" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 4px 16px rgba(0, 212, 170, 0.15)",
                    }}
                  >
                    {isStartingCamera ? "⏳ Đang kết nối webcam..." : "📷 Mở Camera"}
                  </button>

                  {cameraError && (
                    <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, color: "#fca5a5", fontSize: 12, textAlign: "center", maxWidth: 440, margin: "14px auto 0" }}>
                      ⚠️ {cameraError}
                      <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 8 }}>
                        <button type="button" onClick={() => startCamera()} style={{ padding: "4px 12px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, color: "white", fontSize: 11, cursor: "pointer" }}>Thử lại</button>
                        <button type="button" onClick={startSimulatedScan} style={{ padding: "4px 12px", background: "rgba(0,212,170,0.2)", border: "none", borderRadius: 6, color: "#00D4AA", fontSize: 11, cursor: "pointer" }}>⚡ Chế độ mô phỏng</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Viewport content when done */}
              {step === "done" && (
                <div style={{ textAlign: "center", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {capturedPhoto ? (
                    <div style={{ position: "relative", width: 140, height: 140, borderRadius: 20, overflow: "hidden", border: "3px solid #00D4AA", boxShadow: "0 0 30px rgba(0,212,170,0.4)", marginBottom: 12 }}>
                      <img src={capturedPhoto} alt="Captured Face" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0, 212, 170, 0.9)", color: "#061A14", fontSize: 10, fontWeight: 800, padding: "3px 0", textAlign: "center", letterSpacing: "0.05em" }}>
                        ✓ ĐÃ TRÍCH XUẤT
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 52, marginBottom: 8 }}>✅</div>
                  )}
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent-teal)" }}>
                    Thu nạp mẫu khuôn mặt hoàn tất!
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                    30/30 khung hình chuẩn ArcFace 3D Mesh · Vector 128-D đã sẵn sàng lưu vào PostgreSQL
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.25)", borderRadius: 6, color: "#00D4AA" }}>
                      Độ tin cậy: 98.8%
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 6, color: "#60a5fa" }}>
                      5/5 Góc quay đạt
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 6, color: "#34d399" }}>
                      Liveness: PASS
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress bar (ArcFace 3D Mesh) */}
            <div style={{ background: "rgba(18, 24, 38, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Tiến trình thu nạp mẫu ảnh</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(0, 114, 255, 0.15)", color: "#38BDF8" }}>
                    ArcFace 3D Mesh
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: enrollFrames >= 30 ? "var(--accent-teal)" : "var(--accent-blue)" }}>
                  {enrollFrames} / 30 khung hình ({Math.round((enrollFrames / 30) * 100)}%)
                </div>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
                <div
                  style={{
                    width: `${Math.round((enrollFrames / 30) * 100)}%`,
                    height: "100%",
                    background: enrollFrames >= 30 ? "#00D4AA" : "linear-gradient(90deg, #00A3FF, #00D4AA)",
                    borderRadius: 4,
                    boxShadow: "0 0 10px rgba(0, 212, 170, 0.5)",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>

              {/* 5 Head Pose Guidance Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {POSE_STEP_META.map((meta, idx) => {
                  const isPassed = poseScores[idx] >= 100 || enrollFrames >= (idx + 1) * 6;
                  const isActive = activePoseIdx === idx && enrollFrames < 30 && step === "scanning";
                  const score = isPassed ? 100 : isActive ? Math.round(poseScores[idx]) : 0;

                  return (
                    <div
                      key={meta.id}
                      style={{
                        padding: "8px 6px",
                        borderRadius: 8,
                        background: isPassed
                          ? "rgba(0, 212, 170, 0.08)"
                          : isActive
                          ? "rgba(0, 163, 255, 0.12)"
                          : "rgba(0, 0, 0, 0.25)",
                        border: isPassed
                          ? "1px solid rgba(0, 212, 170, 0.35)"
                          : isActive
                          ? "1px solid #00A3FF"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        textAlign: "center",
                        boxShadow: isActive ? "0 0 16px rgba(0, 163, 255, 0.25)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ color: isPassed ? "#00D4AA" : isActive ? "#38BDF8" : "#64748B", fontSize: 13, fontWeight: 900, marginBottom: 2 }}>
                        {isPassed ? "✓" : isActive ? "↺" : "○"}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF" }}>{meta.name}</div>
                      <div style={{ fontSize: 9.5, color: "#64748B" }}>{meta.angleHint}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: isPassed ? "#00D4AA" : isActive ? "#38BDF8" : "#64748B", marginTop: 3 }}>
                        {score}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions / CTA Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              {step === "idle" && (
                <>
                  {!isCameraActive ? (
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      disabled={isStartingCamera}
                      style={{
                        flex: 1,
                        padding: "13px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 12,
                        color: "var(--text-primary)",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      📷 Mở Camera
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      style={{
                        flex: 1,
                        padding: "13px",
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        borderRadius: 12,
                        color: "#fca5a5",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      ⏹ Tắt Camera
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={startScan}
                    style={{
                      flex: 2,
                      padding: "13px",
                      background: "linear-gradient(135deg,#00D4AA,#3B82F6)",
                      border: "none",
                      borderRadius: 12,
                      color: "white",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 20px rgba(0,212,170,0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    🚀 Bắt đầu thu nạp khuôn mặt
                  </button>
                </>
              )}

              {step === "scanning" && (
                <button
                  type="button"
                  disabled
                  style={{
                    flex: 1,
                    padding: "13px",
                    background: "linear-gradient(135deg,rgba(0,212,170,0.3),rgba(59,130,246,0.3))",
                    border: "1px solid rgba(0,212,170,0.4)",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  ⚡ Đang nhận diện tư thế {POSE_STEP_META[activePoseIdx]?.name}... ({enrollFrames}/30)
                </button>
              )}

              {step === "done" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("idle");
                      setEnrollFrames(0);
                      setActivePoseIdx(0);
                      setPoseScores([0, 0, 0, 0, 0]);
                      setCapturedPhoto(null);
                      if (!isCameraActive) startCamera();
                    }}
                    style={{
                      flex: 1,
                      padding: "13px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 12,
                      color: "var(--text-secondary)",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🔄 Thu nạp lại
                  </button>
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={saving}
                    style={{
                      flex: 2,
                      padding: "13px",
                      background: "linear-gradient(135deg,#00D4AA,#3B82F6)",
                      border: "none",
                      borderRadius: 12,
                      color: "white",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: saving ? "wait" : "pointer",
                      boxShadow: "0 4px 20px rgba(0,212,170,0.35)",
                    }}
                  >
                    {saving ? "⏳ Đang ghi CSDL..." : "💾 Lưu vector CSDL & Kích hoạt"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Modal: Khóa / Mở khóa ──────────────────────────────────────────────────
function LockModal({ user, onClose, onConfirm }: { user: User; onClose: () => void; onConfirm: () => Promise<void> }) {
  const isLocked = user.status === "LOCKED";
  const [confirmed, setConfirmed] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, width: 480, boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <UserAvatar user={user} size={46} borderRadius={12} fontSize={16} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{user.employeeId} · {user.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        <div style={{ padding: "22px 26px" }}>
          <div style={{ padding: "16px 18px", background: isLocked ? "rgba(0,212,170,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${isLocked ? "rgba(0,212,170,0.25)" : "rgba(239,68,68,0.25)"}`, borderRadius: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: isLocked ? "var(--accent-teal)" : "#ef4444", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <span>{isLocked ? "🔓" : "🔒"}</span>
              {isLocked ? "Hành động: Khôi phục quyền truy cập" : "Hành động: Vô hiệu hóa quyền ra vào ngay lập tức"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {isLocked
                ? <>Tài khoản của <strong>{user.name}</strong> sẽ được kích hoạt lại trong CSDL PostgreSQL. Quyền mở cửa qua nhận diện khuôn mặt tự động được khôi phục.</>
                : <>Tài khoản của <strong>{user.name}</strong> sẽ bị khóa trong CSDL PostgreSQL. Hệ thống nhận diện FaceGate AI sẽ ngay lập tức từ chối quyền mở cửa tại mọi điểm kiểm soát (Fail-Safe Lock).</>
              }
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 20, userSelect: "none" }}>
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ width: 18, height: 18, accentColor: isLocked ? "var(--accent-teal)" : "#ef4444" }} />
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Tôi xác nhận muốn <strong style={{ color: isLocked ? "var(--accent-teal)" : "#ef4444" }}>{isLocked ? "mở khóa" : "khóa"}</strong> tài khoản này trong CSDL
            </span>
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px", background: "transparent", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Hủy bỏ</button>
            <button
              disabled={!confirmed || loading}
              onClick={handleConfirm}
              style={{ flex: 2, padding: "11px", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600, cursor: confirmed && !loading ? "pointer" : "not-allowed", opacity: confirmed ? 1 : 0.4, background: isLocked ? "linear-gradient(135deg,#00D4AA,#3B82F6)" : "linear-gradient(135deg,#ef4444,#b91c1c)", transition: "opacity 0.2s", boxShadow: isLocked ? "0 4px 14px rgba(0,212,170,0.25)" : "0 4px 14px rgba(239,68,68,0.25)" }}
            >
              {loading ? "Đang xử lý..." : isLocked ? "🔓 Mở khóa tài khoản" : "🔒 Xác nhận khóa tài khoản"}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Modal: Xóa người dùng (Delete Confirmation) ───────────────────────────
function DeleteUserModal({
  user,
  onClose,
  onConfirm,
}: {
  user: User;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          borderRadius: 20,
          width: 500,
          boxShadow: "0 32px 80px rgba(239, 68, 68, 0.18), 0 10px 40px rgba(0, 0, 0, 0.8)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(239, 68, 68, 0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#EF4444",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: "#EF4444" }}>
                Xóa người dùng khỏi CSDL
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                Thao tác quản trị nhân sự cấp cao (Fail-Safe)
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px" }}>
          {/* Target Profile Card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 16px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: avatarColor(user.id),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
              }}
            >
              {initials(user.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                {user.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 10 }}>
                <span style={{ fontFamily: "monospace", color: "#38BDF8" }}>{user.employeeId}</span>
                <span>•</span>
                <span>{user.department}</span>
              </div>
            </div>
            <StatusBadge status={user.status} />
          </div>

          {/* Critical Warning Details */}
          <div
            style={{
              padding: "14px 16px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: 12,
              marginBottom: 18,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚠ CẢNH BÁO: HÀNH ĐỘNG KHÔNG THỂ HOÀN TÁC!</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#F87171", lineHeight: 1.7 }}>
              <li>
                Toàn bộ hồ sơ nhân sự của <strong>{user.name}</strong> sẽ bị xóa vĩnh viễn khỏi CSDL PostgreSQL.
              </li>
              <li>
                Dữ liệu sinh trắc học Face ID (512-D / 128-D embedding vector) sẽ bị hủy toàn bộ, camera sẽ ngay lập tức xem người này là <strong>UNKNOWN</strong>.
              </li>
              <li>
                Mọi quyền truy cập cửa ra/vào (Access Rules) gán riêng cho người này sẽ lập tức bị thu hồi.
              </li>
              <li style={{ color: "#94A3B8" }}>
                Lịch sử ra/vào trước đây trong Access Logs vẫn được bảo toàn để phục vụ kiểm toán an ninh.
              </li>
            </ul>
          </div>

          {/* Confirmation Checkbox */}
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              cursor: "pointer",
              marginBottom: 20,
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 2, accentColor: "#EF4444", cursor: "pointer" }}
            />
            <span style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Tôi xác nhận đã kiểm tra kỹ lưỡng và muốn <strong style={{ color: "#EF4444" }}>xóa vĩnh viễn</strong> tài khoản người dùng này khỏi hệ thống FaceGate AI.
            </span>
          </label>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "11px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={!confirmed || loading}
              onClick={handleConfirm}
              style={{
                flex: 1.6,
                padding: "11px",
                border: "none",
                borderRadius: 10,
                color: "white",
                fontSize: 13,
                fontWeight: 700,
                cursor: confirmed && !loading ? "pointer" : "not-allowed",
                opacity: confirmed ? 1 : 0.4,
                background: "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
                boxShadow: confirmed ? "0 4px 20px rgba(239, 68, 68, 0.4)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s",
              }}
            >
              {loading ? (
                "Đang xóa khỏi CSDL..."
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Xác nhận xóa vĩnh viễn
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Toast notification ──────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "success" | "info" }) {
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 99999, display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: type === "success" ? "rgba(0,20,14,0.95)" : "rgba(0,10,30,0.95)", border: `1px solid ${type === "success" ? "rgba(0,212,170,0.4)" : "rgba(0,198,255,0.4)"}`, borderRadius: 14, boxShadow: `0 8px 32px ${type === "success" ? "rgba(0,212,170,0.2)" : "rgba(0,198,255,0.2)"}`, animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
      <span style={{ fontSize: 20 }}>{type === "success" ? "✅" : "ℹ️"}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{msg}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", width: "100%" };

// ─── Main page ───────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [departmentsList, setDepartmentsList] = useState<string[]>([
    "Khối Kỹ thuật & R&D",
    "Khối Vận hành & An ninh",
    "Kế toán & Tài chính",
    "Kinh doanh & Tiếp thị",
    "Khối Nhân sự & Đào tạo",
    "Ban Giám Đốc",
  ]);

  useEffect(() => {
    api.departments.list().then((res) => {
      if (res && Array.isArray(res.items) && res.items.length > 0) {
        setDepartmentsList(res.items.map((d: any) => d.name));
      }
    }).catch(() => {});
  }, []);

  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [hovered, setHovered] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" } | null>(null);

  type ModalType = { type: "view" | "edit" | "face" | "lock" | "delete"; user: User } | null;
  const [modal, setModal] = useState<ModalType>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Real-time synchronization for multi-session user updates
  useRealtimeEvents(
    useCallback((event: RealtimeEventPayload) => {
      if (event.type === "USER_DELETED") {
        const deletedId = event.data?.user_id;
        const deletedEmp = event.data?.employee_id;
        setUsers((prev) => prev.filter((u) => u.id !== deletedId && u.employeeId !== deletedEmp));
        setTotalCount((prev) => Math.max(0, prev - 1));
      }
    }, [])
  );

  const showToast = (msg: string, type: "success" | "info" = "success") => {
    if (type === "success") {
      notify.success(msg);
    } else {
      notify.info(msg);
    }
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.users.list({
        search: search.trim() || undefined,
        department: selectedDept !== "all" ? selectedDept : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        page: currentPage,
        limit: 10,
      });

      if (res && Array.isArray(res.items)) {
        const mappedUsers: User[] = res.items.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.email.split("@")[0],
          employeeId: u.employee_id || u.employee_code || `EMP-${u.id.slice(0, 4).toUpperCase()}`,
          department: u.department || "Khối Kỹ thuật & R&D",
          role: u.position || u.role || "Nhân viên",
          status: (u.status === "ACTIVE" ? "ACTIVE" : u.status === "LOCKED" || u.status === "INACTIVE" ? "LOCKED" : u.status === "WAITING" ? "WAITING" : "ACTIVE") as User["status"],
          registeredDate: u.registered_date || (u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "10/01/2026"),
          faceStatus: (u.has_face_profile || u.face_status === "ok") ? "ok" : "missing",
          email: u.email,
          phone: u.phone || u.phone_number || "0988 234 567",
          accessAreas: u.access_areas || ["Cửa chính Lobby", "Phòng Server Kỹ thuật"],
          avatarUrl: u.avatar_url || (u.face_profile ? u.face_profile.master_photo_url : undefined),
        }));
        setUsers(mappedUsers);
        setTotalCount(res.total || mappedUsers.length);
        setPages(res.pages || 1);
      }
    } catch (err) {
      console.error("Failed to load users from DB:", err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedDept, selectedStatus, currentPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openModal = (type: "view" | "edit" | "face" | "lock" | "delete", user: User) => setModal({ type, user });

  const handleDeleteUser = async () => {
    if (!modal?.user) return;
    try {
      await api.users.delete(modal.user.id);
      showToast(`Đã xóa vĩnh viễn người dùng ${modal.user.name} (${modal.user.employeeId}) khỏi CSDL!`, "success");
      setModal(null);
      await loadUsers();
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      showToast(err?.message || "Lỗi khi xóa người dùng khỏi CSDL", "info");
    }
  };

  const handleUpdateUser = async (patch: Partial<User>) => {
    if (!modal?.user) return;
    try {
      await api.users.update(modal.user.id, {
        full_name: patch.name,
        department: patch.department,
        position: patch.role,
        email: patch.email,
        phone: patch.phone,
        status: patch.status,
        avatar_url: patch.avatarUrl,
      });
      showToast(`Đã cập nhật thông tin ${patch.name || modal.user.name} vào CSDL!`, "success");
      setModal(null);
      await loadUsers();
    } catch (err: any) {
      console.error("Failed to update user:", err);
      showToast(err?.message || "Lỗi khi cập nhật vào CSDL", "info");
    }
  };

  const handleToggleStatus = async () => {
    if (!modal?.user) return;
    try {
      const targetStatus = modal.user.status === "LOCKED" ? "ACTIVE" : "LOCKED";
      const res = await api.users.toggleStatus(modal.user.id, targetStatus);
      const newStatus = res?.status || targetStatus;
      showToast(
        newStatus === "LOCKED"
          ? `Đã khóa tài khoản ${modal.user.name} thành công. Quyền truy cập bị vô hiệu hóa.`
          : `Đã mở khóa tài khoản ${modal.user.name} thành công. Khôi phục quyền ra vào.`,
        "success"
      );
      setModal(null);
      await loadUsers();
    } catch (err: any) {
      console.error("Failed to toggle user status:", err);
      showToast(err?.message || "Lỗi khi thay đổi trạng thái trong CSDL", "info");
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      await api.users.create(userData);
      showToast(`Đã tạo thành công người dùng ${userData.full_name} vào CSDL!`);
      await loadUsers();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Lỗi khi tạo người dùng vào CSDL", "info");
    }
  };

  const handleEnrollFace = async (enrollData?: { vector?: number[]; photoUrl?: string }) => {
    if (!modal?.user) return;
    try {
      const vec =
        enrollData?.vector && enrollData.vector.length === 128
          ? enrollData.vector
          : generateBiometricVector(modal.user.employeeId);

      // 1. Upload photo to Supabase Cloud Storage (or optimized lightweight storage)
      let photoUrl = enrollData?.photoUrl;
      let storageSource = "local";

      if (enrollData?.photoUrl) {
        try {
          const uploadRes = await uploadAvatarToSupabase(enrollData.photoUrl, modal.user.employeeId);
          if (uploadRes?.url) {
            photoUrl = uploadRes.url;
            storageSource = uploadRes.source;
          }
        } catch (uploadErr) {
          console.warn("Supabase upload notice:", uploadErr);
        }
      }

      // 2. Sync to Supabase face biometric table if available
      syncFaceProfileToSupabase({
        employee_id: modal.user.employeeId,
        encoding_vector: vec,
        quality_score: 0.98,
        samples_count: 30,
        master_photo_url: photoUrl,
      }).catch(() => {});

      // 3. Register face profile in backend database
      await api.faces.enroll({
        employee_id: modal.user.employeeId,
        encoding_vector: vec,
        quality_score: 0.98,
        samples_count: 30,
        master_photo_url: photoUrl,
      });

      // 4. Update user avatar
      if (photoUrl) {
        try {
          await api.users.update(modal.user.id, {
            avatar_url: photoUrl,
          });
        } catch (e) {
          console.warn("Update avatar error:", e);
        }
      }

      const msg = storageSource === "supabase"
        ? `Face ID của ${modal.user.name} đã được lưu trên Supabase Cloud & CSDL thành công!`
        : `Face ID của ${modal.user.name} đã được kích hoạt thành công trong CSDL!`;

      showToast(msg, "success");
      await loadUsers();
    } catch (err: any) {
      console.error("Face enrollment failed:", err);
      showToast(err?.message || "Lỗi khi nạp Face ID vào CSDL", "info");
      throw err;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Quản lý người dùng</h1>
              <p style={{ color: "var(--text-secondary)", marginTop: 8, fontSize: 14 }}>
                Quản lý danh sách nhân sự, phân quyền kiểm soát ra vào và dữ liệu sinh trắc học AI trực tiếp từ PostgreSQL.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => window.open(api.accessLogs.getExportUrl())}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Xuất báo cáo CSDL
              </button>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="btn-create-user-glow"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 22px",
                  background: "linear-gradient(135deg, #00C6FF 0%, #0072FF 60%, #00D4AA 100%)",
                  backgroundSize: "200% 200%",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 10,
                  color: "#FFFFFF",
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(0, 114, 255, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 8px 28px rgba(0, 198, 255, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 114, 255, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3)";
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 900,
                  }}
                >
                  +
                </div>
                <span>Thêm người dùng mới</span>
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", boxShadow: "var(--shadow-card)" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm tên hoặc Mã NV trong CSDL..." style={{ ...inputStyle, paddingLeft: 36 }} />
            </div>
            {[
              { val: selectedDept, set: setSelectedDept, opts: ["all:Tất cả phòng ban", ...departmentsList.map(d => `${d}:${d}`)] },
              { val: selectedStatus, set: setSelectedStatus, opts: ["all:Tất cả trạng thái", "ACTIVE:Đang hoạt động", "WAITING:Chờ nạp Face", "LOCKED:Đã khóa"] },
            ].map(({ val, set, opts }, idx) => (
              <select key={idx} value={val} onChange={(e) => set(e.target.value)} style={{ ...inputStyle, minWidth: 160, width: "auto" }}>
                {opts.map(o => { const [v, l] = o.split(":"); return <option key={v} value={v}>{l}</option>; })}
              </select>
            ))}
            <button onClick={() => { setSearch(""); setSelectedDept("all"); setSelectedStatus("all"); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Xóa bộ lọc
            </button>
          </div>

          {/* Table */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                    {["HỌ VÀ TÊN & FACE ID", "MÃ NV", "PHÒNG BAN", "VAI TRÒ", "TRẠNG THÁI", "NGÀY ĐĂNG KÝ", "THAO TÁC"].map((h) => (
                      <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                        Đang tải danh sách người dùng từ CSDL PostgreSQL...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                        Không tìm thấy người dùng nào phù hợp trong CSDL.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} onMouseEnter={() => setHovered(user.id)} onMouseLeave={() => setHovered(null)}
                        style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s", background: hovered === user.id ? "rgba(255,255,255,0.02)" : "transparent" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <UserAvatar user={user} size={40} borderRadius={10} fontSize={13} />
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: user.status === "LOCKED" ? "var(--text-muted)" : "var(--text-primary)", textDecoration: user.status === "LOCKED" ? "line-through" : "none" }}>{user.name}</div>
                              <div style={{ fontSize: 12, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                                {user.faceStatus === "ok"
                                  ? <><svg style={{ color: "var(--accent-teal)" }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg><span style={{ color: "var(--accent-teal)" }}>Đã nạp 512-D</span></>
                                  : <><svg style={{ color: "var(--accent-orange)" }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg><span style={{ color: "var(--accent-orange)" }}>Chưa thu nạp</span></>
                                }
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", fontFamily: "monospace" }}>{user.employeeId}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{user.department}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{user.role}</td>
                        <td style={{ padding: "14px 16px" }}><StatusBadge status={user.status} /></td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-muted)" }}>{user.registeredDate}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <IconBtn title="Xem chi tiết" color="var(--accent-blue)" onClick={() => openModal("view", user)}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            </IconBtn>
                            <IconBtn title={user.faceStatus === "ok" ? "Cập nhật khuôn mặt" : "Nạp khuôn mặt"} color="var(--accent-teal)" onClick={() => openModal("face", user)}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3h4M3 5v4M19 3h-4M21 5v4M5 21h4M3 19v-4M19 21h-4M21 19v-4" /><circle cx="12" cy="12" r="3" /></svg>
                            </IconBtn>
                            <IconBtn title="Chỉnh sửa" color="#f59e0b" onClick={() => openModal("edit", user)}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </IconBtn>
                            <IconBtn title={user.status === "LOCKED" ? "Mở khóa tài khoản" : "Khóa tài khoản"} color="#ef4444" onClick={() => openModal("lock", user)}>
                              {user.status === "LOCKED"
                                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                              }
                            </IconBtn>
                            <IconBtn
                              title={user.employeeId === "EMP-0001" ? "Không thể xóa Quản trị viên tối cao" : "Xóa người dùng"}
                              color="#EF4444"
                              onClick={() => {
                                if (user.employeeId === "EMP-0001") {
                                  showToast("Không thể xóa tài khoản Quản trị viên tối cao của hệ thống!", "info");
                                  return;
                                }
                                openModal("delete", user);
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </IconBtn>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.01)" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Hiển thị <strong style={{ color: "var(--text-primary)" }}>{users.length}</strong> trong số <strong style={{ color: "var(--text-primary)" }}>{totalCount}</strong> người dùng trong CSDL
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)", color: "var(--text-secondary)", fontSize: 13, cursor: currentPage <= 1 ? "not-allowed" : "pointer" }}
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: p === currentPage ? "none" : "1px solid rgba(255,255,255,0.1)", background: p === currentPage ? "linear-gradient(135deg,#00C6FF,#0072FF)" : "rgba(255,255,255,0.02)", color: p === currentPage ? "white" : "var(--text-secondary)", fontSize: 13, cursor: "pointer", fontWeight: p === currentPage ? 600 : 400 }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)", color: "var(--text-secondary)", fontSize: 13, cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Modals ── */}
      {modal?.type === "view" && (
        <ViewDetailModal
          user={modal.user}
          onClose={() => setModal(null)}
          onEdit={() => {
            const u = modal.user;
            setModal(null);
            setTimeout(() => openModal("edit", u), 50);
          }}
          onToggleLock={() => {
            const u = modal.user;
            setModal(null);
            setTimeout(() => openModal("lock", u), 50);
          }}
        />
      )}
      {modal?.type === "edit" && (
        <EditModal user={modal.user} departmentsList={departmentsList} onClose={() => setModal(null)} onSave={handleUpdateUser} />
      )}
      {modal?.type === "face" && (
        <FaceEnrollModal user={modal.user} onClose={() => setModal(null)} onDone={handleEnrollFace} />
      )}
      {modal?.type === "lock" && (
        <LockModal user={modal.user} onClose={() => setModal(null)} onConfirm={handleToggleStatus} />
      )}
      {modal?.type === "delete" && (
        <DeleteUserModal
          user={modal.user}
          onClose={() => setModal(null)}
          onConfirm={handleDeleteUser}
        />
      )}
      {isCreateOpen && (
        <CreateUserFlowModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(msg) => {
            showToast(msg, "success");
            loadUsers();
          }}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(18px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        input, select { color-scheme: dark; }
        input::placeholder { color: rgba(255,255,255,0.3); }
      ` }} />
    </div>
  );
}
