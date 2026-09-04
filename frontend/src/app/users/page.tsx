"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

interface User {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  role: string;
  status: "ACTIVE" | "INACTIVE";
  registeredDate: string;
  faceStatus: "ok" | "missing";
}

const mockUsers: User[] = [
  { id: "1", name: "Nguyễn Văn An", employeeId: "EMP-2041", department: "IT", role: "Admin", status: "ACTIVE", registeredDate: "12/10/2023", faceStatus: "ok" },
  { id: "2", name: "Trần Minh Đức", employeeId: "EMP-2042", department: "Kế toán", role: "Staff", status: "INACTIVE", registeredDate: "15/10/2023", faceStatus: "missing" },
  { id: "3", name: "Lê Hoàng Nam", employeeId: "EMP-2195", department: "Sales", role: "Manager", status: "ACTIVE", registeredDate: "02/11/2023", faceStatus: "ok" },
  { id: "4", name: "Phạm Thị Mai", employeeId: "EMP-2196", department: "HR", role: "Staff", status: "ACTIVE", registeredDate: "05/11/2023", faceStatus: "ok" },
  { id: "5", name: "Võ Quốc Bảo", employeeId: "EMP-2197", department: "IT", role: "Staff", status: "INACTIVE", registeredDate: "10/11/2023", faceStatus: "missing" },
];

const recentAccess = [
  { location: "Cửa chính Tầng 1", time: "08:15:22", day: "Hôm nay", type: "in", confidence: 99.8 },
  { location: "Phòng Server Tầng 3", time: "17:30:05", day: "Hôm qua", type: "out", confidence: null },
  { location: "Phòng Giám đốc", time: "14:22:16", day: "16/11", type: "denied", confidence: null },
];

function avatarColor(id: string) {
  const colors = [
    "linear-gradient(135deg,#00D4AA,#3B82F6)",
    "linear-gradient(135deg,#8B5CF6,#EC4899)",
    "linear-gradient(135deg,#F97316,#EF4444)",
    "linear-gradient(135deg,#22C55E,#3B82F6)",
  ];
  return colors[parseInt(id) % colors.length];
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(-2).join("");
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(mockUsers[0]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ type: "add" | "edit" | "access" | "lock" | null, payload?: any }>({ type: null });

  const filtered = mockUsers.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchDept = selectedDept === "all" || u.department === selectedDept;
    const matchRole = selectedRole === "all" || u.role === selectedRole;
    return matchSearch && matchDept && matchRole;
  });

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Quản lý người dùng</h1>
              <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>
                Quản lý danh sách nhân viên, quyền truy cập và dữ liệu sinh trắc học.
              </p>
            </div>
            <button
              onClick={() => setModalState({ type: "add" })}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 16px",
                background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none",
                borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600,
                cursor: "pointer", boxShadow: "0 4px 15px rgba(0,212,170,0.3)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Thêm người dùng
            </button>
          </div>

          <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
            {/* Left: filter + table */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              {/* Filter bar */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {/* Search */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>TÌM KIẾM</label>
                  <div style={{ position: "relative" }}>
                    <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tên hoặc Mã NV..."
                      style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px 7px 30px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                    />
                  </div>
                </div>
                {/* Department */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>PHÒNG BAN</label>
                  <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                    <option value="all">Tất cả phòng ban</option>
                    <option value="IT">IT</option>
                    <option value="Kế toán">Kế toán</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
                {/* Role */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>VAI TRÒ</label>
                  <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                    <option value="all">Tất cả vai trò</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%", gap: 4 }}>
                  <label style={{ fontSize: 10, visibility: "hidden" }}>SPACE</label>
                  <button
                    onClick={() => { setSearch(""); setSelectedDept("all"); setSelectedRole("all"); }}
                    style={{ 
                      display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", 
                      background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", 
                      borderRadius: 8, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
                      transition: "all 0.2s", height: "33px" 
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Xóa lọc
                  </button>
                </div>
              </div>

              {/* Table */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ overflowX: "auto", flex: 1 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["HỌ TÊN", "MÃ NV", "PHÒNG BAN", "VAI TRÒ", "TRẠNG THÁI", "ĐĂNG KÝ", "THAO TÁC"].map((h) => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((user) => (
                        <tr
                          key={user.id}
                          onClick={() => setSelectedUser(user)}
                          onMouseEnter={() => setHovered(user.id)}
                          onMouseLeave={() => setHovered(null)}
                          style={{
                            borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.15s",
                            background: selectedUser?.id === user.id ? "rgba(0,212,170,0.06)" : hovered === user.id ? "rgba(255,255,255,0.025)" : "transparent",
                          }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: "50%", background: avatarColor(user.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0 }}>
                                {initials(user.name)}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{user.name}</div>
                                <div style={{ fontSize: 11, color: user.faceStatus === "ok" ? "var(--accent-teal)" : "var(--accent-orange)", display: "flex", alignItems: "center", gap: 3 }}>
                                  {user.faceStatus === "ok" ? (
                                    <>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                      Face ID
                                    </>
                                  ) : (
                                    <>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                      Missing Face
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{user.employeeId}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{user.department}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{user.role}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
                              background: user.status === "ACTIVE" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                              color: user.status === "ACTIVE" ? "var(--accent-green)" : "var(--accent-red)",
                              border: `1px solid ${user.status === "ACTIVE" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)"}`,
                            }}>
                              • {user.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>{user.registeredDate}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setModalState({ type: "edit", payload: user }); }}
                                style={{ padding: "4px 10px", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 6, color: "var(--accent-blue)", fontSize: 11, cursor: "pointer", fontWeight: 500 }}
                              >Sửa</button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setModalState({ type: "lock", payload: user }); }}
                                style={{ padding: "4px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "var(--accent-red)", fontSize: 11, cursor: "pointer", fontWeight: 500 }}
                              >Khóa</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Hiển thị 1 đến {filtered.length} trong số 97 kết quả</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["‹", "1", "2", "3", "...", "10", "›"].map((p, i) => (
                      <button key={i} style={{
                        width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)",
                        background: p === "1" ? "var(--accent-teal)" : "rgba(255,255,255,0.04)",
                        color: p === "1" ? "#000" : "var(--text-secondary)", fontSize: 12, cursor: "pointer", fontWeight: p === "1" ? 700 : 400,
                      }}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: User detail panel */}
            {selectedUser && (
              <div style={{ width: 290, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
                <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Chi tiết người dùng</span>
                  <button onClick={() => setSelectedUser(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Profile card */}
                  <div style={{ background: "linear-gradient(135deg,rgba(0,212,170,0.08),rgba(59,130,246,0.05))", border: "1px solid rgba(0,212,170,0.15)", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: avatarColor(selectedUser.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "white", flexShrink: 0, border: "2px solid rgba(0,212,170,0.3)" }}>
                        {initials(selectedUser.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{selectedUser.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{selectedUser.employeeId} • {selectedUser.department}</div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, marginTop: 4, display: "inline-block",
                          background: selectedUser.status === "ACTIVE" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.15)",
                          color: selectedUser.status === "ACTIVE" ? "var(--accent-green)" : "var(--accent-red)",
                        }}>{selectedUser.status}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button 
                        onClick={() => setModalState({ type: "edit", payload: selectedUser })}
                        style={{ flex: 1, padding: "7px", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 8, color: "var(--accent-blue)", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                      >✏ Sửa</button>
                      <button 
                        onClick={() => setModalState({ type: "lock", payload: selectedUser })}
                        style={{ flex: 1, padding: "7px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "var(--accent-red)", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                      >🔒 Khóa</button>
                    </div>
                  </div>

                  {/* Biometric */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>DỮ LIỆU SINH TRẮC</div>
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" strokeWidth="2">
                          <circle cx="12" cy="8" r="5"/><path d="M3 21a9 9 0 0 1 18 0"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Face Embedding</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Cập nhật lần cuối 2 ngày trước</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-teal)", fontSize: 11, fontWeight: 600 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Đã đồng bộ
                      </div>
                    </div>
                  </div>

                  {/* Recent access */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>LỊCH SỬ RA VÀO GẦN ĐÂY</div>
                      <span style={{ fontSize: 11, color: "var(--accent-teal)", cursor: "pointer" }}>Xem tất cả</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {recentAccess.map((a, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", background: "rgba(255,255,255,0.025)", borderRadius: 8, border: "1px solid var(--border)" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0, background: a.type === "in" ? "var(--accent-green)" : a.type === "out" ? "var(--accent-blue)" : "var(--accent-red)" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{a.location}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              {a.type === "in" && `→ Vào (IN)${a.confidence ? ` • Khớp mặt ${a.confidence}%` : ""}`}
                              {a.type === "out" && "← Ra (OUT) • Thả tự"}
                              {a.type === "denied" && "✗ Từ chối truy cập (không đủ quyền)"}
                            </div>
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right", flexShrink: 0 }}>
                            <div>{a.time}</div>
                            <div>{a.day}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)" }}>
                  <button 
                    onClick={() => setModalState({ type: "access", payload: selectedUser })}
                    style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,212,170,0.25)" }}
                  >
                    Cập nhật quyền truy cập
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {modalState.type && (
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
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                {modalState.type === "add" && "Thêm người dùng mới"}
                {modalState.type === "edit" && "Sửa thông tin người dùng"}
                {modalState.type === "lock" && "Xác nhận khóa tài khoản"}
                {modalState.type === "access" && "Cập nhật quyền truy cập"}
              </h2>
              <button onClick={() => setModalState({ type: null })} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            
            <div style={{ padding: "24px", flex: 1 }}>
              {(modalState.type === "add" || modalState.type === "edit") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Họ và tên</label>
                    <input defaultValue={modalState.payload?.name || ""} placeholder="Nguyễn Văn A" style={{ padding: "9px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Mã nhân viên</label>
                      <input defaultValue={modalState.payload?.employeeId || ""} placeholder="EMP-XXXX" style={{ padding: "9px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Phòng ban</label>
                      <select defaultValue={modalState.payload?.department || ""} style={{ padding: "9px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                        <option value="IT">IT</option><option value="Kế toán">Kế toán</option><option value="Sales">Sales</option><option value="HR">HR</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Vai trò</label>
                    <select defaultValue={modalState.payload?.role || "Staff"} style={{ padding: "9px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>
                </div>
              )}

              {modalState.type === "lock" && (
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Bạn có chắc chắn muốn khóa tài khoản của <strong>{modalState.payload?.name}</strong>? Người dùng sẽ không thể truy cập hệ thống nữa.
                </p>
              )}

              {modalState.type === "access" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Chọn khu vực cho phép truy cập:</p>
                  {["Cửa chính Tầng 1", "Phòng Server Tầng 3", "Phòng Giám đốc", "Khu vực kho"].map(area => (
                    <label key={area} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input type="checkbox" defaultChecked={area !== "Phòng Giám đốc"} style={{ accentColor: "var(--accent-teal)", width: 16, height: 16 }} />
                      <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{area}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, background: "rgba(0,0,0,0.1)" }}>
              <button onClick={() => setModalState({ type: null })} style={{ padding: "9px 16px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Hủy bỏ</button>
              <button onClick={() => setModalState({ type: null })} style={{ 
                padding: "9px 16px", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: modalState.type === "lock" ? "var(--accent-red)" : "linear-gradient(135deg,#00D4AA,#3B82F6)"
              }}>
                {modalState.type === "lock" ? "Khóa tài khoản" : "Lưu thay đổi"}
              </button>
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
