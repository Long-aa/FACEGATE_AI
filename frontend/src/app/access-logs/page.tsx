"use client";

import React, { useState, useMemo } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

interface AccessLog {
  id: string;
  time: string;
  date: string;
  userName: string;
  userCode: string;
  department: string;
  camera: string;
  action: "Entry" | "Exit";
  confidence: number;
  result: "Granted" | "Denied" | "Manual Verify";
  unknown?: boolean;
}

const mockLogs: AccessLog[] = [
  { id: "1",  time: "10:42:15 SA", date: "24/10/2023", userName: "Nguyễn Văn An",   userCode: "EMP-2045", department: "Khối KT & R&D",  camera: "Cửa chính Lobby",      action: "Entry", confidence: 98.5, result: "Granted" },
  { id: "2",  time: "10:38:02 SA", date: "24/10/2023", userName: "Trần Minh Đức",   userCode: "EMP-2042", department: "Kế toán",          camera: "Phòng Server B",       action: "Entry", confidence: 72.1, result: "Manual Verify" },
  { id: "3",  time: "10:15:45 SA", date: "24/10/2023", userName: "Người lạ",        userCode: "Chưa đăng ký", department: "—",            camera: "Sảnh phía Tây",        action: "Entry", confidence: 15.0, result: "Denied", unknown: true },
  { id: "4",  time: "09:55:10 SA", date: "24/10/2023", userName: "Lê Hoàng Nam",    userCode: "EMP-2105", department: "Kinh doanh",       camera: "Cửa ra chính",         action: "Exit",  confidence: 99.2, result: "Granted" },
  { id: "5",  time: "09:30:44 SA", date: "24/10/2023", userName: "Phạm Quang Huy",  userCode: "EMP-1988", department: "Khối Vận hành",    camera: "Cửa chính Lobby",      action: "Entry", confidence: 97.8, result: "Granted" },
  { id: "6",  time: "09:15:22 SA", date: "24/10/2023", userName: "Võ Quốc Bảo",    userCode: "EMP-2197", department: "IT",               camera: "Phòng họp A",          action: "Entry", confidence: 88.3, result: "Granted" },
  { id: "7",  time: "08:54:03 SA", date: "24/10/2023", userName: "Nguyễn Thu Hà",   userCode: "EMP-2210", department: "Nhân sự",          camera: "Cửa chính Lobby",      action: "Entry", confidence: 95.1, result: "Granted" },
  { id: "8",  time: "08:33:18 SA", date: "24/10/2023", userName: "Người lạ",        userCode: "Chưa đăng ký", department: "—",            camera: "Cửa kho Thiết bị R&D", action: "Entry", confidence: 8.2,  result: "Denied",  unknown: true },
  { id: "9",  time: "08:11:55 SA", date: "24/10/2023", userName: "Trần Minh Đức",   userCode: "EMP-2042", department: "Kế toán",          camera: "Cửa chính Lobby",      action: "Entry", confidence: 93.6, result: "Granted" },
  { id: "10", time: "07:58:40 SA", date: "24/10/2023", userName: "Nguyễn Văn An",   userCode: "EMP-2045", department: "Khối KT & R&D",  camera: "Phòng Server Kỹ thuật", action: "Entry", confidence: 99.7, result: "Granted" },
  { id: "11", time: "17:45:12 CH", date: "23/10/2023", userName: "Lê Hoàng Nam",    userCode: "EMP-2105", department: "Kinh doanh",       camera: "Cửa chính Lobby",      action: "Exit",  confidence: 98.4, result: "Granted" },
  { id: "12", time: "17:30:05 CH", date: "23/10/2023", userName: "Phạm Quang Huy",  userCode: "EMP-1988", department: "Khối Vận hành",    camera: "Cửa phân tầng TM",     action: "Exit",  confidence: 91.2, result: "Granted" },
  { id: "13", time: "14:22:16 CH", date: "23/10/2023", userName: "Nguyễn Thu Hà",   userCode: "EMP-2210", department: "Nhân sự",          camera: "Phòng Giám đốc",       action: "Entry", confidence: 0,    result: "Denied",  unknown: false },
  { id: "14", time: "13:10:44 CH", date: "23/10/2023", userName: "Nguyễn Văn An",   userCode: "EMP-2045", department: "Khối KT & R&D",  camera: "Cửa chính Lobby",      action: "Exit",  confidence: 99.1, result: "Granted" },
  { id: "15", time: "11:05:30 SA", date: "23/10/2023", userName: "Võ Quốc Bảo",    userCode: "EMP-2197", department: "IT",               camera: "Phòng Server B",       action: "Entry", confidence: 67.4, result: "Manual Verify" },
];

const CAMERAS = ["Tất cả Camera", "Cửa chính Lobby", "Phòng Server B", "Phòng Server Kỹ thuật", "Sảnh phía Tây", "Cửa ra chính", "Phòng họp A", "Cửa kho Thiết bị R&D", "Cửa phân tầng TM", "Phòng Giám đốc"];

function avatarGradient(id: string) {
  const g = [
    "linear-gradient(135deg,#00D4AA,#3B82F6)",
    "linear-gradient(135deg,#8B5CF6,#EC4899)",
    "linear-gradient(135deg,#F97316,#EF4444)",
    "linear-gradient(135deg,#22C55E,#3B82F6)",
    "linear-gradient(135deg,#F59E0B,#EF4444)",
    "linear-gradient(135deg,#3B82F6,#8B5CF6)",
    "linear-gradient(135deg,#06B6D4,#3B82F6)",
  ];
  return g[parseInt(id) % g.length];
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(-2).join("");
}

function ConfidenceBar({ value, unknown }: { value: number; unknown?: boolean }) {
  if (unknown || value === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 10, height: 4, background: "#ef4444", borderRadius: 2 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#ef4444" }}>{value > 0 ? `${value}%` : "N/A"}</span>
      </div>
    );
  }
  const color = value >= 90 ? "#00D4AA" : value >= 60 ? "#F97316" : "#EF4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 72, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 40 }}>{value}%</span>
    </div>
  );
}

function ResultBadge({ result }: { result: AccessLog["result"] }) {
  const cfg = {
    Granted:       { bg: "rgba(34,197,94,0.12)",   color: "#22c55e",  border: "rgba(34,197,94,0.25)" },
    Denied:        { bg: "rgba(239,68,68,0.12)",   color: "#ef4444",  border: "rgba(239,68,68,0.25)" },
    "Manual Verify": { bg: "rgba(249,115,22,0.12)", color: "#f97316", border: "rgba(249,115,22,0.25)" },
  }[result];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 7, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: "nowrap" }}>
      {result}
    </span>
  );
}

// ─── Detail modal ────────────────────────────────────────────────────────────
function LogDetailModal({ log, onClose }: { log: AccessLog; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.18s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, width: 480, boxShadow: "0 32px 80px rgba(0,0,0,0.6)", animation: "slideUp 0.25s cubic-bezier(0.16,1,0.3,1)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Chi tiết sự kiện</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* User */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid var(--border)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: log.unknown ? "rgba(239,68,68,0.2)" : avatarGradient(log.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: log.unknown ? "#ef4444" : "white", flexShrink: 0, border: log.unknown ? "1px solid rgba(239,68,68,0.3)" : "none" }}>
              {log.unknown ? "?" : initials(log.userName)}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: log.unknown ? "#ef4444" : "var(--text-primary)" }}>{log.userName}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{log.userCode} · {log.department}</div>
            </div>
            <div style={{ marginLeft: "auto" }}><ResultBadge result={log.result} /></div>
          </div>
          {/* Details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Thời gian", value: `${log.time}` },
              { label: "Ngày", value: log.date },
              { label: "Camera / Điểm quét", value: log.camera },
              { label: "Hành động", value: log.action === "Entry" ? "→ Vào (IN)" : "← Ra (OUT)" },
              { label: "Độ chính xác AI", value: log.unknown ? "N/A (Người lạ)" : `${log.confidence}%` },
              { label: "Phòng ban", value: log.department },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{value}</div>
              </div>
            ))}
          </div>
          {/* Confidence visual */}
          {!log.unknown && (
            <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.025)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>Biểu đồ độ chính xác nhận diện</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${log.confidence}%`, background: log.confidence >= 90 ? "linear-gradient(90deg,#00D4AA,#3B82F6)" : log.confidence >= 60 ? "linear-gradient(90deg,#F97316,#F59E0B)" : "linear-gradient(90deg,#ef4444,#b91c1c)", borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: log.confidence >= 90 ? "var(--accent-teal)" : log.confidence >= 60 ? "var(--accent-orange)" : "#ef4444", minWidth: 50 }}>{log.confidence}%</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                {log.confidence >= 90 ? "✓ Nhận diện đáng tin cậy — Tự động mở khóa" : log.confidence >= 60 ? "⚠ Độ tin cậy trung bình — Yêu cầu xác minh thủ công" : "✗ Độ tin cậy thấp — Từ chối truy cập"}
              </div>
            </div>
          )}
          <button onClick={onClose} style={{ padding: "11px", background: "transparent", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function AccessLogsPage() {
  const [search, setSearch]               = useState("");
  const [selectedCamera, setSelectedCamera] = useState("Tất cả Camera");
  const [selectedResult, setSelectedResult] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedDate, setSelectedDate]    = useState("all");
  const [hovered, setHovered]             = useState<string | null>(null);
  const [detailLog, setDetailLog]         = useState<AccessLog | null>(null);

  // Derived unique dates for filter
  const uniqueDates = useMemo(() => {
    const dates = [...new Set(mockLogs.map(l => l.date))];
    return dates;
  }, []);

  // Combined filter — search + all dropdowns work together in real-time
  const filtered = useMemo(() => mockLogs.filter(log => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      log.userName.toLowerCase().includes(q) ||
      log.userCode.toLowerCase().includes(q) ||
      log.camera.toLowerCase().includes(q) ||
      log.department.toLowerCase().includes(q) ||
      log.result.toLowerCase().includes(q);

    const matchCamera = selectedCamera === "Tất cả Camera" || log.camera === selectedCamera;
    const matchResult = selectedResult === "all" || log.result === selectedResult;
    const matchAction = selectedAction === "all" || log.action === selectedAction;
    const matchDate   = selectedDate === "all"   || log.date === selectedDate;

    return matchSearch && matchCamera && matchResult && matchAction && matchDate;
  }), [search, selectedCamera, selectedResult, selectedAction, selectedDate]);

  const resetFilters = () => {
    setSearch("");
    setSelectedCamera("Tất cả Camera");
    setSelectedResult("all");
    setSelectedAction("all");
    setSelectedDate("all");
  };

  const hasActiveFilter = search || selectedCamera !== "Tất cả Camera" || selectedResult !== "all" || selectedAction !== "all" || selectedDate !== "all";

  // Stats
  const stats = useMemo(() => ({
    total:        filtered.length,
    granted:      filtered.filter(l => l.result === "Granted").length,
    denied:       filtered.filter(l => l.result === "Denied").length,
    manualVerify: filtered.filter(l => l.result === "Manual Verify").length,
  }), [filtered]);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── Page header ── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Lịch sử truy cập</h1>
              <p style={{ color: "var(--text-secondary)", marginTop: 8, fontSize: 14 }}>
                Xem chi tiết nhật ký của tất cả các sự kiện quét nhận diện khuôn mặt.
              </p>
            </div>
            <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Xuất CSV
            </button>
          </div>

          {/* ── Stats strip ── */}
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: "Tổng sự kiện", value: stats.total, color: "var(--accent-blue)", icon: "📋" },
              { label: "Granted",      value: stats.granted, color: "#22c55e",           icon: "✅" },
              { label: "Denied",       value: stats.denied,  color: "#ef4444",           icon: "⛔" },
              { label: "Manual Verify",value: stats.manualVerify, color: "#f97316",      icon: "⚠️" },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, padding: "14px 18px", background: "rgba(20,25,35,0.5)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter bar (search + dropdowns — all synced) ── */}
          <div style={{ background: "rgba(20,25,35,0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm tên, mã NV, camera, phòng ban..."
                style={{ width: "100%", padding: "10px 14px 10px 36px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>

            {/* Date */}
            <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              style={{ padding: "10px 12px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
              <option value="all">📅 Tất cả ngày</option>
              {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Camera */}
            <select value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)}
              style={{ padding: "10px 12px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer", minWidth: 160 }}>
              {CAMERAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Action */}
            <select value={selectedAction} onChange={e => setSelectedAction(e.target.value)}
              style={{ padding: "10px 12px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
              <option value="all">Tất cả hành động</option>
              <option value="Entry">→ Vào (Entry)</option>
              <option value="Exit">← Ra (Exit)</option>
            </select>

            {/* Result */}
            <select value={selectedResult} onChange={e => setSelectedResult(e.target.value)}
              style={{ padding: "10px 12px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
              <option value="all">Tất cả trạng thái</option>
              <option value="Granted">✅ Granted</option>
              <option value="Denied">⛔ Denied</option>
              <option value="Manual Verify">⚠ Manual Verify</option>
            </select>

            {/* Reset */}
            {hasActiveFilter && (
              <button onClick={resetFilters}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#ef4444", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", fontWeight: 500 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                Xóa bộ lọc
              </button>
            )}

            {/* Active filter count badge */}
            {hasActiveFilter && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", background: "rgba(0,198,255,0.1)", border: "1px solid rgba(0,198,255,0.2)", borderRadius: 20, color: "var(--accent-blue)", whiteSpace: "nowrap" }}>
                {filtered.length} kết quả
              </span>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                    {["THỜI GIAN", "NGƯỜI DÙNG", "CAMERA", "HÀNH ĐỘNG", "ĐỘ CHÍNH XÁC", "KẾT QUẢ", "CHI TIẾT"].map(h => (
                      <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "48px", textAlign: "center" }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)" }}>Không tìm thấy kết quả</div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc</div>
                        <button onClick={resetFilters} style={{ marginTop: 16, padding: "8px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>Xóa bộ lọc</button>
                      </td>
                    </tr>
                  ) : filtered.map(log => (
                    <tr
                      key={log.id}
                      onMouseEnter={() => setHovered(log.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        borderBottom: "1px solid var(--border)", transition: "background 0.15s",
                        background: hovered === log.id ? "rgba(255,255,255,0.025)" : log.result === "Denied" ? "rgba(239,68,68,0.02)" : "transparent",
                      }}
                    >
                      {/* Time */}
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: log.result === "Denied" ? "#ef4444" : "var(--text-primary)" }}>{log.time}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{log.date}</div>
                      </td>

                      {/* User */}
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: log.unknown ? "rgba(239,68,68,0.18)" : avatarGradient(log.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: log.unknown ? "#ef4444" : "white", flexShrink: 0, border: log.unknown ? "1px solid rgba(239,68,68,0.35)" : "none" }}>
                            {log.unknown ? "?" : initials(log.userName)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: log.unknown ? "#ef4444" : "var(--text-primary)" }}>{log.userName}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{log.userCode}</div>
                          </div>
                        </div>
                      </td>

                      {/* Camera */}
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{log.camera}</td>

                      {/* Action */}
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: log.action === "Entry" ? "rgba(0,212,170,0.08)" : "rgba(59,130,246,0.08)", border: `1px solid ${log.action === "Entry" ? "rgba(0,212,170,0.2)" : "rgba(59,130,246,0.2)"}` }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={log.action === "Entry" ? "var(--accent-teal)" : "var(--accent-blue)"} strokeWidth="2.5">
                            {log.action === "Entry"
                              ? <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></>
                              : <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>
                            }
                          </svg>
                          <span style={{ fontSize: 12, fontWeight: 600, color: log.action === "Entry" ? "var(--accent-teal)" : "var(--accent-blue)" }}>
                            {log.action === "Entry" ? "→ Vào" : "← Ra"}
                          </span>
                        </div>
                      </td>

                      {/* Confidence */}
                      <td style={{ padding: "13px 16px" }}>
                        <ConfidenceBar value={log.confidence} unknown={log.unknown} />
                      </td>

                      {/* Result */}
                      <td style={{ padding: "13px 16px" }}>
                        <ResultBadge result={log.result} />
                      </td>

                      {/* Detail */}
                      <td style={{ padding: "13px 16px" }}>
                        <button
                          onClick={() => setDetailLog(log)}
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "5px 10px", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontWeight: 500, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,198,255,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-blue)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,198,255,0.25)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.01)" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Hiển thị <strong style={{ color: "var(--text-primary)" }}>1</strong> đến <strong style={{ color: "var(--text-primary)" }}>{filtered.length}</strong> trong số <strong style={{ color: "var(--text-primary)" }}>248</strong> sự kiện
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {["‹", "1", "2", "3", "›"].map((p, i) => (
                  <button key={i} style={{ width: 32, height: 32, borderRadius: 8, border: p === "1" ? "none" : "1px solid rgba(255,255,255,0.1)", background: p === "1" ? "linear-gradient(135deg,#00C6FF,#0072FF)" : "rgba(255,255,255,0.02)", color: p === "1" ? "white" : "var(--text-secondary)", fontSize: 13, cursor: "pointer", fontWeight: p === "1" ? 600 : 400 }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Detail modal */}
      {detailLog && <LogDetailModal log={detailLog} onClose={() => setDetailLog(null)} />}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn  { from { opacity: 0; }                              to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }
        input, select { color-scheme: dark; }
        input::placeholder { color: rgba(255,255,255,0.3); }
      ` }} />
    </div>
  );
}
