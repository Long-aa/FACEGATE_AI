"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/ToastNotification";

// ─── TYPES & INTERFACES ────────────────────────────────────────────────────────

interface DepartmentMember {
  id: string;
  employee_id: string;
  full_name: string;
  email?: string;
  position?: string;
  status: string;
  avatar_url?: string;
}

interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  manager_name?: string;
  contact_email?: string;
  contact_phone?: string;
  location?: string;
  access_level: "STANDARD" | "RESTRICTED" | "HIGH_SECURITY" | string;
  allowed_doors: string[];
  color: string;
  status: "ACTIVE" | "INACTIVE" | string;
  member_count: number;
  members?: DepartmentMember[];
  created_at?: string;
}

const ACCESS_LEVEL_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  STANDARD: {
    label: "Tiêu chuẩn (Standard)",
    color: "#38BDF8",
    bg: "rgba(56, 189, 248, 0.12)",
    border: "rgba(56, 189, 248, 0.3)",
  },
  RESTRICTED: {
    label: "Hạn chế (Restricted)",
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.3)",
  },
  HIGH_SECURITY: {
    label: "Nghiêm ngặt (High Security)",
    color: "#EF4444",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.3)",
  },
};

const COLOR_PALETTE = [
  "#00D4AA", // Cyan / Teal
  "#00A3FF", // Electric Blue
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#10B981", // Emerald
];

const AVAILABLE_DOORS = [
  "Cửa chính Lobby - Tầng 1",
  "Phòng Server Kỹ thuật",
  "Cửa phân tầng Thang máy",
  "Cửa kho Thiết bị R&D",
  "Phòng Giám đốc & BOD",
  "Cổng phụ An ninh & Hầm B1",
];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAccessLevel, setSelectedAccessLevel] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [viewDept, setViewDept] = useState<Department | null>(null);
  const [deleteDept, setDeleteDept] = useState<Department | null>(null);

  // Load Departments
  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.departments.list({
        search: search.trim() || undefined,
        access_level: selectedAccessLevel !== "all" ? selectedAccessLevel : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      });
      if (res && Array.isArray(res.items)) {
        setDepartments(res.items);
      }
    } catch (err: any) {
      console.error("Failed to load departments:", err);
      toast.error(`Lỗi khi tải danh sách phòng ban: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }, [search, selectedAccessLevel, selectedStatus]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // Statistics
  const stats = useMemo(() => {
    const total = departments.length;
    const totalMembers = departments.reduce((acc, d) => acc + (d.member_count || 0), 0);
    const highSecCount = departments.filter(
      (d) => d.access_level === "HIGH_SECURITY" || d.access_level === "RESTRICTED"
    ).length;
    const allDoors = new Set<string>();
    departments.forEach((d) => (d.allowed_doors || []).forEach((door) => allDoors.add(door)));

    return {
      total,
      totalMembers,
      highSecCount,
      uniqueDoorsCount: allDoors.size,
    };
  }, [departments]);

  // Open detail view with members
  const handleOpenDetail = async (dept: Department) => {
    try {
      const full = await api.departments.get(dept.id);
      setViewDept(full);
    } catch (err) {
      setViewDept(dept);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 36px 48px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          }}
        >
          {/* ───────────────────────────────────────────────────────────────── */}
          {/* HEADER & TOP ACTIONS                                              */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--accent-teal)",
                  }}
                >
                  • HỆ THỐNG PHÂN QUYỀN KHỐI PHÒNG BAN
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "rgba(0, 212, 170, 0.15)",
                    border: "1px solid rgba(0, 212, 170, 0.35)",
                    color: "var(--accent-teal)",
                  }}
                >
                  PostgreSQL Sync
                </span>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>
                Quản lý phòng ban
              </h1>
              <p style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: 13.5, margin: "6px 0 0" }}>
                Quản lý cơ cấu phòng ban, cấu hình danh mục cửa được phép mở và phân bổ nhân sự kiểm soát an ninh.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
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
                boxShadow: "0 4px 20px rgba(0, 114, 255, 0.45)",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 8px 28px rgba(0, 198, 255, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 114, 255, 0.45)";
              }}
            >
              <span style={{ fontSize: 16 }}>+</span>
              <span>Thêm phòng ban mới</span>
            </button>
          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* KPI CARDS (4 METRICS)                                             */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {/* Metric 1 */}
            <div
              style={{
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "18px 20px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "rgba(0, 212, 170, 0.12)",
                  border: "1px solid rgba(0, 212, 170, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "#00D4AA",
                }}
              >
                🏢
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                  Tổng phòng ban
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", marginTop: 2 }}>
                  {stats.total}
                </div>
              </div>
            </div>

            {/* Metric 2 */}
            <div
              style={{
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "18px 20px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "rgba(0, 163, 255, 0.12)",
                  border: "1px solid rgba(0, 163, 255, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "#00A3FF",
                }}
              >
                👥
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                  Nhân sự trực thuộc
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", marginTop: 2 }}>
                  {stats.totalMembers} <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>người</span>
                </div>
              </div>
            </div>

            {/* Metric 3 */}
            <div
              style={{
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "18px 20px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "#F59E0B",
                }}
              >
                🛡️
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                  An ninh cấp cao
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", marginTop: 2 }}>
                  {stats.highSecCount} <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>khối</span>
                </div>
              </div>
            </div>

            {/* Metric 4 */}
            <div
              style={{
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "18px 20px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "rgba(139, 92, 246, 0.12)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "#8B5CF6",
                }}
              >
                🚪
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                  Cửa kiểm soát phân quyền
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", marginTop: 2 }}>
                  {stats.uniqueDoorsCount} <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>cửa</span>
                </div>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* FILTER & SEARCH BAR                                               */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div
            style={{
              background: "rgba(18, 24, 38, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 12,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748B",
                  fontSize: 14,
                }}
              >
                🔍
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm theo tên hoặc mã phòng ban (RD, OPS, FIN...)"
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  background: "rgba(0, 0, 0, 0.25)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 8,
                  color: "#FFFFFF",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            {/* Filter Access Level */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#94A3B8" }}>Cấp độ an ninh:</span>
              <select
                value={selectedAccessLevel}
                onChange={(e) => setSelectedAccessLevel(e.target.value)}
                style={{
                  padding: "8px 12px",
                  background: "rgba(0, 0, 0, 0.25)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 8,
                  color: "#FFFFFF",
                  fontSize: 12.5,
                  outline: "none",
                }}
              >
                <option value="all">Tất cả cấp độ</option>
                <option value="STANDARD">Tiêu chuẩn (Standard)</option>
                <option value="RESTRICTED">Hạn chế (Restricted)</option>
                <option value="HIGH_SECURITY">Nghiêm ngặt (High Security)</option>
              </select>
            </div>

            {/* Filter Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#94A3B8" }}>Trạng thái:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  padding: "8px 12px",
                  background: "rgba(0, 0, 0, 0.25)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 8,
                  color: "#FFFFFF",
                  fontSize: 12.5,
                  outline: "none",
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                <option value="INACTIVE">Tạm ngừng (INACTIVE)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div
              style={{
                display: "flex",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 8,
                padding: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: viewMode === "grid" ? "rgba(255, 255, 255, 0.12)" : "transparent",
                  color: viewMode === "grid" ? "#FFFFFF" : "#64748B",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>▦</span> Lưới
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: viewMode === "table" ? "rgba(255, 255, 255, 0.12)" : "transparent",
                  color: viewMode === "table" ? "#FFFFFF" : "#64748B",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>☰</span> Bảng
              </button>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* MAIN CONTENT: GRID OR TABLE                                       */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#64748B" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚙️</div>
              <div>Đang đồng bộ dữ liệu phòng ban từ PostgreSQL...</div>
            </div>
          ) : departments.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "rgba(18, 24, 38, 0.5)",
                border: "1px dashed rgba(255, 255, 255, 0.1)",
                borderRadius: 14,
                color: "#94A3B8",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>Không tìm thấy phòng ban nào</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Thử thay đổi bộ lọc tìm kiếm hoặc thêm phòng ban mới.</div>
            </div>
          ) : viewMode === "grid" ? (
            /* ── GRID CARDS VIEW ────────────────────────────────────────────── */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 18 }}>
              {departments.map((dept) => {
                const accConfig = ACCESS_LEVEL_LABELS[dept.access_level] || ACCESS_LEVEL_LABELS.STANDARD;
                return (
                  <div
                    key={dept.id}
                    style={{
                      background: "rgba(18, 24, 38, 0.75)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 14,
                      padding: "20px",
                      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = dept.color || "#00D4AA";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    {/* Top glow accent stripe */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: dept.color || "#00D4AA",
                        boxShadow: `0 0 10px ${dept.color || "#00D4AA"}`,
                      }}
                    />

                    <div>
                      {/* Card Header: Code Badge + Title + Access Level */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              background: `${dept.color}20`,
                              border: `1px solid ${dept.color}60`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: dept.color,
                              fontSize: 14,
                              fontWeight: 900,
                              letterSpacing: "0.04em",
                            }}
                          >
                            {dept.code}
                          </div>
                          <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                              {dept.name}
                            </h3>
                            <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>
                              📍 {dept.location || "Chưa thiết lập vị trí"}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 20,
                            background: accConfig.bg,
                            border: `1px solid ${accConfig.border}`,
                            color: accConfig.color,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {accConfig.label.split(" ")[0]}
                        </span>
                      </div>

                      {/* Description */}
                      <p
                        style={{
                          fontSize: 12,
                          color: "#94A3B8",
                          lineHeight: 1.5,
                          marginBottom: 14,
                          minHeight: 36,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {dept.description || "Chưa có mô tả nhiệm vụ chi tiết cho khối phòng ban này."}
                      </p>

                      {/* Meta list: Manager, Email, Hotline */}
                      <div
                        style={{
                          padding: "10px 12px",
                          background: "rgba(0, 0, 0, 0.25)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                          borderRadius: 8,
                          fontSize: 11.5,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          marginBottom: 14,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748B" }}>Trưởng bộ phận:</span>
                          <span style={{ color: "#E2E8F0", fontWeight: 600 }}>{dept.manager_name || "Chưa bổ nhiệm"}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748B" }}>Email liên hệ:</span>
                          <span style={{ color: "#38BDF8" }}>{dept.contact_email || "—"}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748B" }}>Hotline nội bộ:</span>
                          <span style={{ color: "#E2E8F0" }}>{dept.contact_phone || "—"}</span>
                        </div>
                      </div>

                      {/* Allowed Doors Tags */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
                          Cửa kiểm soát được cấp quyền ({dept.allowed_doors?.length || 0}):
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {(dept.allowed_doors || []).slice(0, 3).map((door, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: 10,
                                padding: "2px 7px",
                                borderRadius: 4,
                                background: "rgba(255, 255, 255, 0.06)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                color: "#CBD5E1",
                              }}
                            >
                              🚪 {door}
                            </span>
                          ))}
                          {(dept.allowed_doors?.length || 0) > 3 && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: "rgba(255, 255, 255, 0.04)",
                                color: "#64748B",
                              }}
                            >
                              +{dept.allowed_doors.length - 3} cửa khác
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Member Count & Action Buttons */}
                    <div
                      style={{
                        paddingTop: 12,
                        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        onClick={() => handleOpenDetail(dept)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                          color: "var(--accent-teal)",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        <span>👥 {dept.member_count} nhân sự</span>
                        <span style={{ fontSize: 10 }}>↗</span>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(dept)}
                          title="Xem chi tiết & danh sách nhân sự"
                          style={actionBtnStyle}
                        >
                          👁️
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditDept(dept)}
                          title="Chỉnh sửa thông tin phòng ban"
                          style={actionBtnStyle}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteDept(dept)}
                          title="Xóa phòng ban"
                          style={{ ...actionBtnStyle, color: "#EF4444" }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── TABLE VIEW ─────────────────────────────────────────────────── */
            <div
              style={{
                background: "rgba(18, 24, 38, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(255, 255, 255, 0.02)" }}>
                    <th style={{ padding: "14px 18px", color: "#64748B", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Mã / Tên phòng ban</th>
                    <th style={{ padding: "14px 18px", color: "#64748B", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Vị trí tầng</th>
                    <th style={{ padding: "14px 18px", color: "#64748B", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Trưởng phòng</th>
                    <th style={{ padding: "14px 18px", color: "#64748B", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Nhân sự</th>
                    <th style={{ padding: "14px 18px", color: "#64748B", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Cấp độ an ninh</th>
                    <th style={{ padding: "14px 18px", color: "#64748B", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Cửa phân quyền</th>
                    <th style={{ padding: "14px 18px", color: "#64748B", fontWeight: 600, fontSize: 11, textTransform: "uppercase", textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => {
                    const accConfig = ACCESS_LEVEL_LABELS[dept.access_level] || ACCESS_LEVEL_LABELS.STANDARD;
                    return (
                      <tr
                        key={dept.id}
                        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                padding: "2px 7px",
                                borderRadius: 4,
                                background: `${dept.color}20`,
                                border: `1px solid ${dept.color}50`,
                                color: dept.color,
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              {dept.code}
                            </span>
                            <span style={{ fontWeight: 700, color: "#FFFFFF" }}>{dept.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 18px", color: "#94A3B8" }}>{dept.location || "—"}</td>
                        <td style={{ padding: "14px 18px", color: "#E2E8F0", fontWeight: 600 }}>{dept.manager_name || "—"}</td>
                        <td style={{ padding: "14px 18px" }}>
                          <span
                            onClick={() => handleOpenDetail(dept)}
                            style={{ color: "var(--accent-teal)", fontWeight: 700, cursor: "pointer" }}
                          >
                            👥 {dept.member_count}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 20,
                              background: accConfig.bg,
                              border: `1px solid ${accConfig.border}`,
                              color: accConfig.color,
                            }}
                          >
                            {accConfig.label.split(" ")[0]}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px", color: "#94A3B8", fontSize: 12 }}>
                          {dept.allowed_doors?.length || 0} cửa
                        </td>
                        <td style={{ padding: "14px 18px", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                            <button type="button" onClick={() => handleOpenDetail(dept)} style={actionBtnStyle}>
                              👁️
                            </button>
                            <button type="button" onClick={() => setEditDept(dept)} style={actionBtnStyle}>
                              ✏️
                            </button>
                            <button type="button" onClick={() => setDeleteDept(dept)} style={{ ...actionBtnStyle, color: "#EF4444" }}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODALS                                                            */}
      {/* ───────────────────────────────────────────────────────────────── */}

      {/* 1. Create Department Modal */}
      {isCreateOpen && (
        <DepartmentFormModal
          mode="create"
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            loadDepartments();
          }}
        />
      )}

      {/* 2. Edit Department Modal */}
      {editDept && (
        <DepartmentFormModal
          mode="edit"
          department={editDept}
          onClose={() => setEditDept(null)}
          onSuccess={() => {
            setEditDept(null);
            loadDepartments();
          }}
        />
      )}

      {/* 3. View Detail Modal */}
      {viewDept && (
        <DepartmentDetailModal
          department={viewDept}
          onClose={() => setViewDept(null)}
          onEdit={() => {
            const target = viewDept;
            setViewDept(null);
            setEditDept(target);
          }}
        />
      )}

      {/* 4. Delete Department Modal */}
      {deleteDept && (
        <DeleteDepartmentModal
          department={deleteDept}
          onClose={() => setDeleteDept(null)}
          onSuccess={() => {
            setDeleteDept(null);
            loadDepartments();
          }}
        />
      )}
    </div>
  );
}

// ─── ACTION BUTTON STYLE ───────────────────────────────────────────────────────
const actionBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 6,
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  color: "#94A3B8",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 12,
  transition: "all 0.15s",
};

// ─── MODAL: CREATE / EDIT DEPARTMENT ───────────────────────────────────────────

interface DepartmentFormModalProps {
  mode: "create" | "edit";
  department?: Department;
  onClose: () => void;
  onSuccess: () => void;
}

function DepartmentFormModal({ mode, department, onClose, onSuccess }: DepartmentFormModalProps) {
  const [form, setForm] = useState({
    code: department?.code || "",
    name: department?.name || "",
    description: department?.description || "",
    manager_name: department?.manager_name || "",
    contact_email: department?.contact_email || "",
    contact_phone: department?.contact_phone || "",
    location: department?.location || "",
    access_level: department?.access_level || "STANDARD",
    allowed_doors: department?.allowed_doors || ["Cửa chính Lobby - Tầng 1"],
    color: department?.color || "#00D4AA",
    status: department?.status || "ACTIVE",
  });
  const [saving, setSaving] = useState(false);

  const toggleDoor = (doorName: string) => {
    setForm((f) => {
      const exists = f.allowed_doors.includes(doorName);
      return {
        ...f,
        allowed_doors: exists ? f.allowed_doors.filter((d) => d !== doorName) : [...f.allowed_doors, doorName],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      toast.warning("Vui lòng nhập mã phòng ban!", "THIẾU THÔNG TIN");
      return;
    }
    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập tên phòng ban!", "THIẾU THÔNG TIN");
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        await api.departments.create(form);
        toast.success(`Đã thêm phòng ban "${form.name}" vào CSDL!`, "TẠO THÀNH CÔNG");
      } else if (department) {
        await api.departments.update(department.id, form);
        toast.success(`Đã cập nhật thông tin phòng ban "${form.name}"!`, "CẬP NHẬT THÀNH CÔNG");
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(`Thao tác thất bại: ${err.message || err}`, "LỖI LƯU TRỮ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalCardStyle, maxWidth: 640 }}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{mode === "create" ? "🏢" : "✏️"}</span>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                {mode === "create" ? "Thêm phòng ban mới" : `Chỉnh sửa: ${department?.name}`}
              </h2>
              <p style={{ fontSize: 11.5, color: "#94A3B8", margin: "2px 0 0" }}>
                Đồng bộ trực tiếp cấu hình quyền truy cập và dữ liệu PostgreSQL.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Row 1: Mã & Tên phòng ban */}
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Mã phòng ban *</label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="VD: RD, OPS"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Tên phòng ban *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Khối Kỹ thuật & R&D"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Row 2: Trưởng bộ phận & Vị trí tầng */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Trưởng phòng / Quản lý</label>
              <input
                value={form.manager_name}
                onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
                placeholder="VD: Nguyễn Văn An"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Vị trí văn phòng / Tầng</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="VD: Tầng 4 - Khu R&D"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Row 3: Email & Hotline */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Email liên hệ phòng ban</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="rd@aiaccess.corp"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Hotline nội bộ</label>
              <input
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                placeholder="024.7300.8888"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Row 4: Cấp độ an ninh & Mã màu badge */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Cấp độ an ninh</label>
              <select
                value={form.access_level}
                onChange={(e) => setForm({ ...form, access_level: e.target.value })}
                style={inputStyle}
              >
                <option value="STANDARD">Tiêu chuẩn (Standard)</option>
                <option value="RESTRICTED">Hạn chế (Restricted)</option>
                <option value="HIGH_SECURITY">Nghiêm ngặt (High Security)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Màu nhận diện phòng ban</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38 }}>
                {COLOR_PALETTE.map((c) => (
                  <div
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      border: form.color === c ? "2px solid #FFFFFF" : "1px solid rgba(255,255,255,0.2)",
                      boxShadow: form.color === c ? `0 0 10px ${c}` : "none",
                      transition: "all 0.15s",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Row 5: Mô tả chức năng */}
          <div>
            <label style={labelStyle}>Mô tả chức năng nhiệm vụ</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả tóm tắt phạm vi chuyên môn của khối..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Row 6: Phân quyền các cửa mặc định */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={labelStyle}>Danh mục cửa được cấp quyền ra vào</label>
              <span style={{ fontSize: 11, color: "var(--accent-teal)", fontWeight: 700 }}>
                Đã chọn: {form.allowed_doors.length} cửa
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {AVAILABLE_DOORS.map((door) => {
                const selected = form.allowed_doors.includes(door);
                return (
                  <div
                    key={door}
                    onClick={() => toggleDoor(door)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 6,
                      background: selected ? "rgba(0, 212, 170, 0.08)" : "rgba(0, 0, 0, 0.25)",
                      border: selected ? "1px solid rgba(0, 212, 170, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 11.5,
                      color: selected ? "#FFFFFF" : "#94A3B8",
                    }}
                  >
                    <span>🚪 {door}</span>
                    <span style={{ fontWeight: 800, color: selected ? "var(--accent-teal)" : "#64748B" }}>
                      {selected ? "✓" : "○"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 8, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 8,
                color: "#94A3B8",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2,
                padding: "10px",
                background: "linear-gradient(135deg, #00A3FF, #0072FF)",
                border: "none",
                borderRadius: 8,
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                cursor: saving ? "wait" : "pointer",
                boxShadow: "0 4px 14px rgba(0, 114, 255, 0.4)",
              }}
            >
              {saving ? "Đang lưu CSDL..." : mode === "create" ? "Lưu phòng ban mới" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MODAL: VIEW DEPARTMENT DETAILS & MEMBERS ──────────────────────────────────

function DepartmentDetailModal({
  department,
  onClose,
  onEdit,
}: {
  department: Department;
  onClose: () => void;
  onEdit: () => void;
}) {
  const accConfig = ACCESS_LEVEL_LABELS[department.access_level] || ACCESS_LEVEL_LABELS.STANDARD;

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalCardStyle, maxWidth: 680, maxHeight: "88vh" }}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: `${department.color}20`,
                border: `1px solid ${department.color}60`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: department.color,
                fontSize: 15,
                fontWeight: 900,
              }}
            >
              {department.code}
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                {department.name}
              </h2>
              <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>
                📍 {department.location || "Chưa thiết lập"} • Trưởng khối: {department.manager_name || "—"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={onEdit}
              style={{
                padding: "6px 12px",
                background: "rgba(0, 163, 255, 0.15)",
                border: "1px solid #00A3FF",
                borderRadius: 6,
                color: "#38BDF8",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✏️ Sửa
            </button>
            <button type="button" onClick={onClose} style={closeBtnStyle}>
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Overview Info Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div style={{ padding: "10px", background: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
              <div style={{ fontSize: 10.5, color: "#64748B" }}>Cấp độ bảo mật:</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: accConfig.color, marginTop: 2 }}>
                {accConfig.label}
              </div>
            </div>
            <div style={{ padding: "10px", background: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
              <div style={{ fontSize: 10.5, color: "#64748B" }}>Email liên hệ:</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", marginTop: 2 }}>
                {department.contact_email || "—"}
              </div>
            </div>
            <div style={{ padding: "10px", background: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
              <div style={{ fontSize: 10.5, color: "#64748B" }}>Hotline nội bộ:</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", marginTop: 2 }}>
                {department.contact_phone || "—"}
              </div>
            </div>
          </div>

          {/* Description */}
          {department.description && (
            <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
              {department.description}
            </div>
          )}

          {/* Doors Allowed */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0", marginBottom: 8 }}>
              🚪 Cửa kiểm soát được cấp quyền ({department.allowed_doors?.length || 0}):
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(department.allowed_doors || []).map((door, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: "rgba(0, 212, 170, 0.06)",
                    border: "1px solid rgba(0, 212, 170, 0.25)",
                    fontSize: 12,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "var(--accent-teal)" }}>✓</span>
                  <span>{door}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Member List */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#FFFFFF" }}>
                👥 Danh sách nhân sự trực thuộc ({department.members?.length || department.member_count} nhân viên)
              </div>
            </div>

            {(!department.members || department.members.length === 0) ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#64748B", fontSize: 12 }}>
                Hiện chưa có nhân sự nào được gán vào phòng ban này trong CSDL.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {department.members.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #00A3FF, #0072FF)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#FFFFFF",
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      >
                        {m.full_name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#F8FAFC" }}>{m.full_name}</div>
                        <div style={{ fontSize: 10.5, color: "#64748B" }}>
                          {m.employee_id} • {m.position || "Nhân viên"}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: m.status === "ACTIVE" ? "rgba(0, 212, 170, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: m.status === "ACTIVE" ? "#00D4AA" : "#F59E0B",
                      }}
                    >
                      {m.status === "ACTIVE" ? "Hoạt động" : "Chờ nạp Face"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL: DELETE DEPARTMENT ──────────────────────────────────────────────────

function DeleteDepartmentModal({
  department,
  onClose,
  onSuccess,
}: {
  department: Department;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [force, setForce] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.departments.delete(department.id, force);
      toast.success(`Đã xóa phòng ban "${department.name}" khỏi CSDL!`, "XÓA THÀNH CÔNG");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(`Không thể xóa: ${err.message || err}`, "LỖI XÓA");
    } finally {
      setDeleting(false);
    }
  };

  const hasMembers = (department.member_count || 0) > 0;

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalCardStyle, maxWidth: 460 }}>
        <div style={modalHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
              Xác nhận xóa phòng ban
            </h3>
          </div>
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            ✕
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.5, margin: 0 }}>
            Bạn có chắc chắn muốn xóa phòng ban <strong>{department.name}</strong> (Mã: {department.code}) khỏi cơ sở dữ liệu?
          </p>

          {hasMembers && (
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 8,
                fontSize: 12,
                color: "#FCA5A5",
                lineHeight: 1.4,
              }}
            >
              ⚠️ <strong>Cảnh báo an toàn:</strong> Hiện có <strong>{department.member_count}</strong> nhân viên đang thuộc phòng ban này.
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, cursor: "pointer", color: "#FFFFFF" }}>
                <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} style={{ accentColor: "#EF4444" }} />
                <span>Tôi xác nhận gỡ bỏ phòng ban này cho toàn bộ nhân sự trực thuộc</span>
              </label>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 8,
                color: "#CBD5E1",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={deleting || (hasMembers && !force)}
              onClick={handleDelete}
              style={{
                flex: 1.5,
                padding: "10px",
                background: "linear-gradient(135deg, #EF4444, #B91C1C)",
                border: "none",
                borderRadius: 8,
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                cursor: deleting || (hasMembers && !force) ? "not-allowed" : "pointer",
                opacity: hasMembers && !force ? 0.4 : 1,
              }}
            >
              {deleting ? "Đang xóa..." : "Xác nhận xóa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 99999,
  background: "rgba(7, 10, 18, 0.85)",
  backdropFilter: "blur(12px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalCardStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(16, 22, 36, 0.96)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 16,
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const modalHeaderStyle: React.CSSProperties = {
  padding: "18px 24px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(255, 255, 255, 0.02)",
};

const closeBtnStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 6,
  color: "#94A3B8",
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 13,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 600,
  color: "#CBD5E1",
  display: "block",
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "rgba(0, 0, 0, 0.35)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 8,
  color: "#F8FAFC",
  fontSize: 12.5,
  outline: "none",
};
