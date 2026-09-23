"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { CreateUserFlowModal } from "@/components/users/CreateUserFlowModal";
import { toast as notify } from "@/components/ui/ToastNotification";

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
        background: hov ? (color ? `${color}20` : "rgba(255,255,255,0.1)") : "rgba(255,255,255,0.04)",
        border: hov && color ? `1px solid ${color}40` : "1px solid transparent",
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
function ViewDetailModal({ user, onClose, onEdit }: { user: User; onClose: () => void; onEdit: () => void }) {
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
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, width: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: avatarColor(user.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "white", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
              {initials(user.name)}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{user.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{user.employeeId} · {user.role}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "22px 26px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Status row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StatusBadge status={user.status} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 20, background: user.faceStatus === "ok" ? "rgba(0,212,170,0.08)" : "rgba(245,158,11,0.08)", color: user.faceStatus === "ok" ? "var(--accent-teal)" : "var(--accent-orange)", border: `1px solid ${user.faceStatus === "ok" ? "rgba(0,212,170,0.2)" : "rgba(245,158,11,0.2)"}` }}>
              {user.faceStatus === "ok" ? "✓ Face ID: Đã nạp 512-D" : "⚠ Face ID: Chưa thu nạp"}
            </span>
          </div>

          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Phòng ban", value: user.department },
              { label: "Ngày đăng ký", value: user.registeredDate },
              { label: "Email", value: user.email || "—" },
              { label: "Điện thoại", value: user.phone || "—" },
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
          <button onClick={onEdit} style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg,#00C6FF,#0072FF)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,114,255,0.3)" }}>
            ✏ Chỉnh sửa thông tin
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Modal: Chỉnh sửa ───────────────────────────────────────────────────────
function EditModal({ user, onClose, onSave, departmentsList = [] }: { user: User; onClose: () => void; onSave: (updated: Partial<User>) => Promise<void>; departmentsList?: string[] }) {
  const [form, setForm] = useState({ name: user.name, role: user.role, department: user.department, email: user.email || "", phone: user.phone || "", status: user.status, accessAreas: [...(user.accessAreas || [])] });
  const [saving, setSaving] = useState(false);

  const toggleArea = (area: string) => {
    setForm(f => ({
      ...f,
      accessAreas: f.accessAreas.includes(area) ? f.accessAreas.filter(a => a !== area) : [...f.accessAreas, area],
    }));
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
                      <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))} style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: isSelected ? `1px solid ${colors[s]}` : "1px solid rgba(255,255,255,0.1)", background: isSelected ? `${colors[s]}18` : "rgba(255,255,255,0.03)", color: isSelected ? colors[s] : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
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
        employee_code: form.employeeId,
        department: form.department,
        position: form.role,
        phone_number: form.phone,
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

// ─── Modal: Nạp khuôn mặt ───────────────────────────────────────────────────
function FaceEnrollModal({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: () => Promise<void> }) {
  const [step, setStep] = useState<"idle" | "scanning" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [frames, setFrames] = useState(0);

  const startScan = () => {
    setStep("scanning");
    setFrames(0);
    setProgress(0);
    const interval = setInterval(() => {
      setFrames(f => {
        const next = f + 1;
        setProgress(Math.round((next / 30) * 100));
        if (next >= 30) {
          clearInterval(interval);
          setTimeout(() => setStep("done"), 400);
        }
        return next;
      });
    }, 80);
  };

  const handleFinish = async () => {
    await onDone();
    onClose();
  };

  const angles = [
    { label: "Nhìn thẳng (0°)", icon: "→", done: frames >= 6 },
    { label: "Nghiêng trái (15°)", icon: "←", done: frames >= 12 },
    { label: "Nghiêng phải (15°)", icon: "→", done: frames >= 18 },
    { label: "Ngửa nhẹ (+10°)", icon: "↑", done: frames >= 24, active: frames >= 18 && frames < 24 },
    { label: "Cúi nhẹ (-10°)", icon: "↓", done: frames >= 30 },
  ];

  return (
    <Overlay onClose={step === "scanning" ? () => {} : onClose}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, width: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ padding: "20px 26px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg,rgba(0,198,255,0.05),rgba(0,114,255,0.03))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: avatarColor(user.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "white" }}>
              {initials(user.name)}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-blue)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>
                {step === "done" ? "✓ ĐĂNG KÝ HOÀN TẤT" : "● ĐANG GHI DANH CSDL"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{user.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{user.role} · {user.department} · ID: {user.employeeId}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {step !== "scanning" && <button onClick={onClose} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>Hủy bỏ / Quay lại</button>}
            {step === "done" && <button onClick={handleFinish} style={{ padding: "8px 18px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Lưu vector CSDL & Kích hoạt</button>}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ aspectRatio: "4/3", background: "rgba(0,0,0,0.6)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {step === "idle" && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>CAM ENROLLMENT • SẴN SÀNG</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Nhấn bắt đầu để nạp vector 512-D vào PostgreSQL</div>
                </div>
              )}
              {step === "scanning" && (
                <>
                  <div style={{ textAlign: "center", zIndex: 2, position: "relative" }}>
                    <div style={{ width: 110, height: 110, borderRadius: "50%", background: avatarColor(user.id), margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "white", border: "3px solid var(--accent-teal)", boxShadow: "0 0 30px rgba(0,212,170,0.4)" }}>
                      {initials(user.name)}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{user.name} &nbsp;<span style={{ color: "var(--accent-teal)" }}>98.6% MATCH</span></div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-teal)", marginTop: 6, padding: "6px 14px", background: "rgba(0,212,170,0.15)", borderRadius: 20, display: "inline-block" }}>
                      GIỮ YÊN · ĐANG GHI NHẬN MẪU KHUÔN MẶT...
                    </div>
                  </div>
                  <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,var(--accent-teal),transparent)", top: `${(frames / 30) * 100}%`, transition: "top 0.1s", boxShadow: "0 0 12px var(--accent-teal)" }} />
                </>
              )}
              {step === "done" && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 56, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent-teal)" }}>Thu nạp hoàn tất!</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>30 khung hình — Vector 512-D đã sẵn sàng lưu vào CSDL</div>
                </div>
              )}
            </div>

            {/* Progress */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Tiến trình thu nạp mẫu ảnh</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: step === "done" ? "var(--accent-teal)" : "var(--accent-blue)" }}>{frames} / 30 khung hình ({progress}%)</div>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: step === "done" ? "linear-gradient(90deg,#00D4AA,#3B82F6)" : "linear-gradient(90deg,#00C6FF,#0072FF)", borderRadius: 4, transition: "width 0.1s" }} />
              </div>
            </div>

            {/* CTA */}
            {step === "idle" && (
              <button onClick={startScan} style={{ padding: "14px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 12, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,212,170,0.3)" }}>
                🚀 Bắt đầu thu nạp khuôn mặt
              </button>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Modal: Khóa / Mở khóa ──────────────────────────────────────────────────
function LockModal({ user, onClose, onConfirm }: { user: User; onClose: () => void; onConfirm: () => Promise<void> }) {
  const isLocked = user.status === "LOCKED";
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
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, width: 460, boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: isLocked ? "rgba(0,212,170,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${isLocked ? "rgba(0,212,170,0.3)" : "rgba(239,68,68,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              {isLocked ? "🔓" : "🔒"}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{user.employeeId} · {user.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        <div style={{ padding: "22px 26px" }}>
          <div style={{ padding: "14px 16px", background: isLocked ? "rgba(0,212,170,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${isLocked ? "rgba(0,212,170,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: isLocked ? "var(--accent-teal)" : "#ef4444", marginBottom: 6 }}>
              {isLocked ? "⚠ Hành động: Khôi phục truy cập trong CSDL" : "⚠ Hành động này sẽ vô hiệu hóa người dùng ngay lập tức"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {isLocked
                ? <>Tài khoản của <strong>{user.name}</strong> sẽ được mở khóa trong cơ sở dữ liệu. Quyền mở cửa sẽ được kích hoạt lại.</>
                : <>Tài khoản của <strong>{user.name}</strong> sẽ bị khóa trong CSDL. Face ID sẽ bị từ chối tại tất cả các cửa kiểm soát.</>
              }
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 20 }}>
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ width: 18, height: 18, accentColor: isLocked ? "var(--accent-teal)" : "#ef4444" }} />
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Tôi xác nhận muốn <strong style={{ color: isLocked ? "var(--accent-teal)" : "#ef4444" }}>{isLocked ? "mở khóa" : "khóa"}</strong> tài khoản này
            </span>
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px", background: "transparent", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Hủy bỏ</button>
            <button
              disabled={!confirmed || loading}
              onClick={handleConfirm}
              style={{ flex: 2, padding: "11px", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600, cursor: confirmed && !loading ? "pointer" : "not-allowed", opacity: confirmed ? 1 : 0.4, background: isLocked ? "linear-gradient(135deg,#00D4AA,#3B82F6)" : "linear-gradient(135deg,#ef4444,#b91c1c)", transition: "opacity 0.2s" }}
            >
              {loading ? "Đang xử lý..." : isLocked ? "🔓 Mở khóa tài khoản" : "🔒 Xác nhận khóa tài khoản"}
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

const inputStyle: React.CSSProperties = { padding: "10px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", width: "100%" };

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

  type ModalType = { type: "view" | "edit" | "face" | "lock"; user: User } | null;
  const [modal, setModal] = useState<ModalType>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
          employeeId: u.employee_code || `EMP-${u.id.slice(0, 4).toUpperCase()}`,
          department: u.department || "Khối Kỹ thuật & R&D",
          role: u.position || u.role || "Nhân viên",
          status: (u.status === "ACTIVE" ? "ACTIVE" : u.status === "LOCKED" || u.status === "INACTIVE" ? "LOCKED" : u.status === "WAITING" ? "WAITING" : "ACTIVE") as User["status"],
          registeredDate: u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "10/01/2026",
          faceStatus: u.face_registered || u.face_status === "ok" ? "ok" : "missing",
          email: u.email,
          phone: u.phone_number || "0988 234 567",
          accessAreas: u.access_areas || ["Cửa chính Lobby", "Phòng Server Kỹ thuật"],
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

  const openModal = (type: "view" | "edit" | "face" | "lock", user: User) => setModal({ type, user });

  const handleUpdateUser = async (patch: Partial<User>) => {
    if (!modal?.user) return;
    try {
      await api.users.update(modal.user.id, {
        full_name: patch.name,
        department: patch.department,
        position: patch.role,
        email: patch.email,
        phone_number: patch.phone,
        status: patch.status,
      });
      showToast(`Đã cập nhật thông tin ${patch.name || modal.user.name} vào CSDL!`);
      await loadUsers();
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi cập nhật vào CSDL", "info");
    }
  };

  const handleToggleStatus = async () => {
    if (!modal?.user) return;
    try {
      const targetStatus = modal.user.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
      const res = await api.users.toggleStatus(modal.user.id, targetStatus);
      const newStatus = res.status;
      showToast(`Tài khoản ${modal.user.name} đã được ${newStatus === "LOCKED" ? "khóa" : "mở khóa"} trong CSDL.`);
      await loadUsers();
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi thay đổi trạng thái trong CSDL", "info");
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      await api.users.create(userData);
      showToast(`Đã tạo thành công người dùng ${userData.full_name} vào CSDL!`);
      await loadUsers();
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi tạo người dùng vào CSDL", "info");
    }
  };

  const handleEnrollFace = async () => {
    if (!modal?.user) return;
    try {
      await api.users.update(modal.user.id, {
        face_status: "ok",
        status: "ACTIVE",
      });
      showToast(`Face ID của ${modal.user.name} đã được kích hoạt thành công trong CSDL!`);
      await loadUsers();
    } catch (err) {
      console.error(err);
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
          <div style={{ background: "rgba(20,25,35,0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
            <button onClick={() => { setSearch(""); setSelectedDept("all"); setSelectedStatus("all"); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
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
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: avatarColor(user.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "white", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.3)", overflow: "hidden" }}>
                              {initials(user.name)}
                            </div>
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
        <ViewDetailModal user={modal.user} onClose={() => setModal(null)} onEdit={() => { const u = modal.user; setModal(null); setTimeout(() => openModal("edit", u), 50); }} />
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
