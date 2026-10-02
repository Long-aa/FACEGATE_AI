"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSession, logout } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/ToastNotification";

type ActiveMenu = "search" | "camera" | "door" | "bell" | "profile" | null;

interface NavigationSearchItem {
  title: string;
  category: string;
  path: string;
  icon: string;
  desc?: string;
}

const SYSTEM_NAV_ITEMS: NavigationSearchItem[] = [
  { title: "Nhận diện khuôn mặt thời gian thực", category: "Giám sát AI", path: "/recognition", icon: "📹", desc: "Giám sát camera AI và xác thực người dùng" },
  { title: "Đăng ký khuôn mặt nhân viên", category: "Sinh trắc học", path: "/face-registration", icon: "👤", desc: "Chụp ảnh, trích xuất đặc trưng và đăng ký Face ID" },
  { title: "Quản lý người dùng & Face ID", category: "Nhân sự", path: "/users", icon: "👥", desc: "Danh sách nhân viên, dữ liệu khuôn mặt và quyền hạn" },
  { title: "Kiểm soát Cửa & Relay", category: "Cửa & Khóa", path: "/doors", icon: "🚪", desc: "Trạng thái khóa, mở khẩn cấp và phân quyền cửa" },
  { title: "Quản lý thiết bị Camera", category: "Thiết bị", path: "/cameras", icon: "🎥", desc: "Cấu hình 07 luồng RTSP camera an ninh" },
  { title: "Trung tâm Cảnh báo an ninh", category: "An ninh", path: "/alerts", icon: "🚨", desc: "Cảnh báo xâm nhập, người lạ và lỗi thiết bị" },
  { title: "Nhật ký kiểm soát ra vào", category: "Dữ liệu", path: "/access-logs", icon: "📑", desc: "Lịch sử xác thực ra vào chi tiết từ CSDL" },
  { title: "Báo cáo thống kê lưu lượng", category: "Báo cáo", path: "/reports", icon: "📈", desc: "Phân tích số liệu và xuất báo cáo CSDL" },
  { title: "Quản lý phòng ban & Khối", category: "Tổ chức", path: "/departments", icon: "🏢", desc: "Danh mục phòng ban và phân cấp quyền" },
  { title: "Cài đặt & Tham số thuật toán AI", category: "Cài đặt", path: "/settings", icon: "⚙️", desc: "Cấu hình ngưỡng nhận diện, độ nhạy và hệ thống" },
  { title: "Tổng quan hệ thống FaceGate", category: "Dashboard", path: "/dashboard", icon: "🖥️", desc: "Bảng điều khiển và biểu đồ chỉ số vận hành" },
];

export function TopBar() {
  const router = useRouter();
  const barRef = useRef<HTMLElement>(null);

  // Time & Session state
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("Admin Quản Trị");
  const [userEmail, setUserEmail] = useState("admin@facegate.ai");
  const [userRole, setUserRole] = useState("Quản trị viên hệ thống");
  const [userInitials, setUserInitials] = useState("QT");

  // Header active menu dropdown
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NavigationSearchItem[]>([]);

  // Theme mode
  const [isDark, setIsDark] = useState(true);

  // Notifications
  const [unreadCount, setUnreadCount] = useState(3);
  const [alerts, setAlerts] = useState([
    { id: "alt-1", title: "Người lạ cố gắng truy cập", loc: "Sảnh phía Tây", time: "2 phút trước", level: "high", desc: "Khuôn mặt chưa đăng ký trong CSDL bị từ chối mở cửa" },
    { id: "alt-2", title: "Cảnh báo Cửa mở quá lâu", loc: "Phòng Server B", time: "14 phút trước", level: "medium", desc: "Cảm biến ghi nhận cửa chưa đóng quá 30 giây" },
    { id: "alt-3", title: "Đăng ký khuôn mặt mới", loc: "Hệ thống CSDL", time: "1 giờ trước", level: "info", desc: "Đã trích xuất thành công 512-D cho nhân viên mới" },
  ]);

  // Initial load
  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setTime(new Date()), 1000);

    // Read session
    const session = getSession();
    if (session) {
      if (session.user.name) setUserName(session.user.name);
      if (session.user.email) setUserEmail(session.user.email);
      if (session.user.role) setUserRole(session.user.role === "SUPERADMIN" ? "Quản trị viên tối cao" : session.user.role);
      const parts = (session.user.name || "QT").split(" ");
      setUserInitials(session.user.avatar || parts.map((p: string) => p[0]).join("").slice(0, 2).toUpperCase());
    }

    // Read stored theme preference
    const storedTheme = localStorage.getItem("facegate_theme");
    if (storedTheme === "light") {
      setIsDark(false);
      document.documentElement.classList.add("light");
    } else {
      setIsDark(true);
      document.documentElement.classList.remove("light");
    }

    // Fetch real unread alert count from backend if possible
    api.alerts.getUnresolvedCount()
      .then((res) => {
        if (typeof res?.count === "number") {
          setUnreadCount(res.count);
        }
      })
      .catch(() => {});

    return () => clearInterval(t);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!activeMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenu]);

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const filtered = SYSTEM_NAV_ITEMS.filter(
      (item) => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || (item.desc && item.desc.toLowerCase().includes(q))
    );
    setSearchResults(filtered);
  }, [searchQuery]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchResults.length > 0) {
      router.push(searchResults[0].path);
      setActiveMenu(null);
      setSearchQuery("");
    } else if (searchQuery.trim()) {
      router.push(`/users?q=${encodeURIComponent(searchQuery.trim())}`);
      setActiveMenu(null);
      setSearchQuery("");
    }
  };

  // Toggle Theme
  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (!nextDark) {
      document.documentElement.classList.add("light");
      localStorage.setItem("facegate_theme", "light");
      toast.info("Đã chuyển sang Giao diện Sáng (Light Mode)", "GIAO DIỆN HỆ THỐNG");
    } else {
      document.documentElement.classList.remove("light");
      localStorage.setItem("facegate_theme", "dark");
      toast.info("Đã chuyển sang Giao diện Tối (Dark Mode)", "GIAO DIỆN HỆ THỐNG");
    }
  };

  // Emergency Door actions
  const handleEmergencyLockdown = () => {
    toast.error("ĐÃ KÍCH HOẠT CHẾ ĐỘ KHÓA TOÀN BỘ CỬA (FAIL-SAFE LOCKDOWN)!", "AN NINH KHẨN CẤP");
    setActiveMenu(null);
  };

  const handleEmergencyUnlock = () => {
    toast.warning("ĐÃ KÍCH HOẠT MỞ CỬA KHẨN CẤP TOÀN BỘ HỆ THỐNG (EVACUATION)!", "CẢNH BÁO MỞ CỬA");
    setActiveMenu(null);
  };

  // Clear notifications
  const handleMarkAllRead = async () => {
    try {
      await api.alerts.acknowledgeAll();
    } catch {}
    setUnreadCount(0);
    toast.success("Đã đánh dấu đã đọc tất cả cảnh báo hệ thống.", "THÔNG BÁO");
  };

  // Logout
  const handleLogout = async () => {
    setActiveMenu(null);
    try {
      await logout();
      toast.info("Đã đăng xuất tài khoản quản trị thành công!", "HẸN GẶP LẠI");
      router.push("/login");
    } catch (err) {
      console.error(err);
      router.push("/login");
    }
  };

  const timeStr = mounted
    ? time.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";

  return (
    <header
      ref={barRef}
      style={{
        height: 60,
        background: isDark ? "rgba(11, 15, 26, 0.88)" : "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${isDark ? "var(--border)" : "rgba(0,0,0,0.08)"}`,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 100,
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      {/* ── Search Bar & Dropdown Palette ── */}
      <div style={{ flex: 1, maxWidth: 360, position: "relative" }}>
        <form onSubmit={handleSearchSubmit}>
          <svg
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="global-header-search"
            type="text"
            placeholder="Tìm kiếm nhân sự, camera, cửa, chức năng..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveMenu("search");
            }}
            onFocus={() => {
              if (searchQuery.trim()) setActiveMenu("search");
            }}
            style={{
              width: "100%",
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${activeMenu === "search" ? "rgba(0,212,170,0.5)" : "var(--border)"}`,
              borderRadius: 10,
              padding: "8px 30px 8px 36px",
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
              transition: "all 0.2s",
              boxShadow: activeMenu === "search" ? "0 0 14px rgba(0,212,170,0.18)" : "none",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveMenu(null);
              }}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 13,
                padding: 2,
              }}
            >
              ✕
            </button>
          )}
        </form>

        {/* Search Results Dropdown */}
        {activeMenu === "search" && searchQuery.trim() && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              width: "100%",
              minWidth: 380,
              background: isDark ? "#0D1321" : "#FFFFFF",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
              borderRadius: 14,
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              overflow: "hidden",
              zIndex: 200,
              animation: "fadeInUp 0.18s ease-out",
            }}
          >
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Kết quả tìm kiếm ({searchResults.length})
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Nhấn Enter để mở</span>
            </div>

            <div style={{ maxHeight: 280, overflowY: "auto", padding: 6 }}>
              {searchResults.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12.5 }}>
                  Không tìm thấy chức năng phù hợp.
                  <div style={{ marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      style={{
                        background: "rgba(0,212,170,0.1)",
                        border: "1px solid rgba(0,212,170,0.25)",
                        borderRadius: 6,
                        color: "var(--accent-teal)",
                        padding: "4px 10px",
                        fontSize: 11.5,
                        cursor: "pointer",
                      }}
                    >
                      Tìm trong danh sách nhân sự CSDL →
                    </button>
                  </div>
                </div>
              ) : (
                searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      router.push(item.path);
                      setActiveMenu(null);
                      setSearchQuery("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</div>
                      {item.desc && <div style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.desc}</div>}
                    </div>
                    <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 12, background: "rgba(0,212,170,0.1)", color: "var(--accent-teal)", fontWeight: 600 }}>
                      {item.category}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ── Real-Time Digital Clock ── */}
      <div
        suppressHydrationWarning
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.04em",
          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
          padding: "5px 10px",
          borderRadius: 8,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
        }}
      >
        {timeStr}
      </div>

      {/* ── Control Action Buttons ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        {/* 1. Camera Menu Button */}
        <div style={{ position: "relative" }}>
          <button
            id="btn-header-camera"
            title="Hệ thống Camera & Nhận diện AI"
            onClick={() => setActiveMenu((prev) => (prev === "camera" ? null : "camera"))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: activeMenu === "camera" ? "rgba(0,212,170,0.15)" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${activeMenu === "camera" ? "rgba(0,212,170,0.4)" : "var(--border)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: activeMenu === "camera" ? "var(--accent-teal)" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="15" height="10" rx="2" />
              <polyline points="17 11 21 7 21 17 17 13" />
            </svg>
          </button>

          {/* Camera Popover */}
          {activeMenu === "camera" && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: -60,
                width: 320,
                background: isDark ? "#0D1321" : "#FFFFFF",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                borderRadius: 14,
                boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
                padding: "14px",
                zIndex: 200,
                animation: "fadeInUp 0.18s ease-out",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Hệ thống Camera Giám Sát</div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "rgba(0,212,170,0.12)", color: "var(--accent-teal)" }}>
                  ● 6/7 Online
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    router.push("/recognition");
                    setActiveMenu(null);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "rgba(0,212,170,0.08)",
                    border: "1px solid rgba(0,212,170,0.25)",
                    borderRadius: 9,
                    color: "var(--accent-teal)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>📹</span>
                  <div style={{ flex: 1 }}>
                    <div>Nhận diện khuôn mặt Real-time</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>Mở màn hình nhận diện trực tiếp bằng AI</div>
                  </div>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    router.push("/cameras");
                    setActiveMenu(null);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                    borderRadius: 9,
                    color: "var(--text-primary)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>🎥</span>
                  <div style={{ flex: 1 }}>
                    <div>Quản lý 07 luồng Camera RTSP</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>Cấu hình IP, góc nhìn và thông số kỹ thuật</div>
                  </div>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    router.push("/face-registration");
                    setActiveMenu(null);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                    borderRadius: 9,
                    color: "var(--text-primary)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>👤</span>
                  <div style={{ flex: 1 }}>
                    <div>Đăng ký khuôn mặt nhân viên</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>Thu nạp Face ID qua Webcam hoặc Camera RTSP</div>
                  </div>
                  <span>→</span>
                </button>
              </div>

              <div style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>Kênh giám sát tiêu biểu</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>CAM-01 • Cửa chính Lobby</span><span style={{ color: "var(--accent-teal)" }}>30 FPS</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>CAM-03 • Phòng Server B</span><span style={{ color: "var(--accent-teal)" }}>30 FPS</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Door & Relay Menu Button */}
        <div style={{ position: "relative" }}>
          <button
            id="btn-header-door"
            title="Kiểm soát Cửa & Khóa an ninh"
            onClick={() => setActiveMenu((prev) => (prev === "door" ? null : "door"))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: activeMenu === "door" ? "rgba(59,130,246,0.15)" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${activeMenu === "door" ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: activeMenu === "door" ? "var(--accent-blue)" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>

          {/* Door Popover */}
          {activeMenu === "door" && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: -40,
                width: 320,
                background: isDark ? "#0D1321" : "#FFFFFF",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                borderRadius: 14,
                boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
                padding: "14px",
                zIndex: 200,
                animation: "fadeInUp 0.18s ease-out",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Kiểm Soát Cửa Ra Vào</div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "rgba(59,130,246,0.12)", color: "var(--accent-blue)" }}>
                  Relay 01: Sẵn sàng
                </span>
              </div>

              {/* Emergency Quick Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={handleEmergencyLockdown}
                  style={{
                    padding: "9px 8px",
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 8,
                    color: "#ef4444",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <span style={{ fontSize: 14 }}>🔒</span>
                  Khóa khẩn cấp
                </button>

                <button
                  type="button"
                  onClick={handleEmergencyUnlock}
                  style={{
                    padding: "9px 8px",
                    background: "rgba(245,158,11,0.12)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    borderRadius: 8,
                    color: "var(--accent-orange)",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <span style={{ fontSize: 14 }}>🔓</span>
                  Mở khẩn cấp
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  router.push("/doors");
                  setActiveMenu(null);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 12px",
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span>🚪 Quản lý toàn bộ 07 Cửa kiểm soát</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Notification Bell Button */}
        <div style={{ position: "relative" }}>
          <button
            id="btn-header-bell"
            title="Trung tâm Cảnh báo"
            onClick={() => setActiveMenu((prev) => (prev === "bell" ? null : "bell"))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: activeMenu === "bell" ? "rgba(239,68,68,0.15)" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${activeMenu === "bell" ? "rgba(239,68,68,0.4)" : "var(--border)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: activeMenu === "bell" ? "#ef4444" : "var(--text-secondary)",
              transition: "all 0.15s ease",
              position: "relative",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 5,
                  right: 5,
                  minWidth: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#EF4444",
                  boxShadow: "0 0 8px #EF4444",
                }}
              />
            )}
          </button>

          {/* Notifications Popover */}
          {activeMenu === "bell" && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: -20,
                width: 340,
                background: isDark ? "#0D1321" : "#FFFFFF",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                borderRadius: 14,
                boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
                padding: "14px",
                zIndex: 200,
                animation: "fadeInUp 0.18s ease-out",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  Cảnh Báo An Ninh {unreadCount > 0 && <span style={{ color: "#ef4444" }}>({unreadCount})</span>}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    style={{ background: "none", border: "none", color: "var(--accent-teal)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    style={{
                      padding: "9px 10px",
                      borderRadius: 8,
                      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: al.level === "high" ? "#ef4444" : al.level === "medium" ? "var(--accent-orange)" : "var(--accent-blue)" }}>
                        {al.title}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{al.time}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{al.desc} • {al.loc}</div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  router.push("/alerts");
                  setActiveMenu(null);
                }}
                style={{
                  width: "100%",
                  padding: "9px",
                  background: "rgba(0,212,170,0.08)",
                  border: "1px solid rgba(0,212,170,0.25)",
                  borderRadius: 8,
                  color: "var(--accent-teal)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                Xem toàn bộ Trung tâm Cảnh báo an ninh →
              </button>
            </div>
          )}
        </div>

        {/* 4. Dark / Light Mode Toggle Button */}
        <button
          id="btn-header-theme"
          title={isDark ? "Chuyển sang Giao diện Sáng" : "Chuyển sang Giao diện Tối"}
          onClick={toggleTheme}
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(245,158,11,0.12)",
            border: `1px solid ${isDark ? "var(--border)" : "rgba(245,158,11,0.3)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: isDark ? "#F59E0B" : "#D97706",
            transition: "all 0.15s ease",
          }}
        >
          {isDark ? (
            /* Moon Icon */
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            /* Sun Icon */
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>

        {/* 5. User Profile Dropdown Pill */}
        <div style={{ position: "relative" }}>
          <div
            id="btn-header-profile"
            onClick={() => setActiveMenu((prev) => (prev === "profile" ? null : "profile"))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "4px 8px 4px 10px",
              borderRadius: 20,
              background: activeMenu === "profile" ? "rgba(0,212,170,0.12)" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${activeMenu === "profile" ? "rgba(0,212,170,0.35)" : "var(--border)"}`,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
              {userName}
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #00D4AA 0%, #3B82F6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                color: "white",
                boxShadow: "0 2px 8px rgba(0,212,170,0.35)",
              }}
            >
              {userInitials}
            </div>
          </div>

          {/* Profile Menu Popover */}
          {activeMenu === "profile" && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                width: 260,
                background: isDark ? "#0D1321" : "#FFFFFF",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                borderRadius: 14,
                boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
                padding: "14px",
                zIndex: 200,
                animation: "fadeInUp 0.18s ease-out",
              }}
            >
              {/* User Identity Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #00D4AA 0%, #3B82F6 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  {userInitials}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {userName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {userEmail}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-teal)", marginTop: 2 }}>
                    {userRole}
                  </div>
                </div>
              </div>

              {/* Navigation items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {[
                  { label: "Quản lý nhân sự & Face ID", icon: "👥", path: "/users" },
                  { label: "Giám sát camera nhận diện", icon: "📹", path: "/recognition" },
                  { label: "Cài đặt & Tham số AI", icon: "⚙️", path: "/settings" },
                  { label: "Nhật ký kiểm soát ra vào", icon: "📑", path: "/access-logs" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      router.push(item.path);
                      setActiveMenu(null);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      background: "transparent",
                      border: "none",
                      borderRadius: 8,
                      color: "var(--text-secondary)",
                      fontSize: 12.5,
                      fontWeight: 500,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, paddingTop: 8 }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8,
                    color: "#ef4444",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <span>🚪</span>
                  <span>Đăng xuất khỏi hệ thống</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
