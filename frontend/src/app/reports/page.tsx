"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";

function LineChart({ data }: { data: { hour: string; val: number }[] }) {
  const chartData = data && data.length > 0 ? data : [
    { hour: "06:00", val: 12 }, { hour: "08:00", val: 85 }, { hour: "10:00", val: 45 },
    { hour: "12:00", val: 60 }, { hour: "14:00", val: 78 }, { hour: "16:00", val: 30 },
    { hour: "18:00", val: 20 }, { hour: "20:00", val: 12 }, { hour: "22:00", val: 4 },
  ];
  const W = 480, H = 200, PL = 40, PR = 20, PT = 10, PB = 30;
  const cW = W - PL - PR, cH = H - PT - PB;
  const maxV = Math.max(...chartData.map(d => d.val), 10);
  const pts = chartData.map((d, i) => ({
    x: PL + (i / Math.max(chartData.length - 1, 1)) * cW,
    y: PT + cH - (d.val / maxV) * cH,
  }));
  const pathD = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `C ${(pts[i - 1].x + p.x) / 2} ${pts[i - 1].y}, ${(pts[i - 1].x + p.x) / 2} ${p.y}, ${p.x} ${p.y}`)).join(" ");
  const areaD = pathD + ` L ${pts[pts.length - 1].x} ${PT + cH} L ${pts[0].x} ${PT + cH} Z`;
  const gridYVals = [0, Math.round(maxV * 0.33), Math.round(maxV * 0.66), maxV];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00D4AA" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00D4AA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      {gridYVals.map((v) => {
        const y = PT + cH - (v / maxV) * cH;
        return (
          <g key={v}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PL - 6} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">{v}</text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#lineGrad)" />
      <path d={pathD} fill="none" stroke="url(#lineStroke)" strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#0d1321" stroke="#00D4AA" strokeWidth="2" />
      ))}
      {chartData.map((d, i) => (
        <text key={d.hour + i} x={pts[i]?.x || 0} y={H - 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle">{d.hour}</text>
      ))}
    </svg>
  );
}

function DonutChart({ success = 92.8, failed = 7.2, unauth = 3.5 }: { success?: number; failed?: number; unauth?: number }) {
  const r = 60, cx = 80, cy = 80;
  const total = 360;
  const s = (Math.min(success, 100) / 100) * total;
  const f = (Math.min(failed, 100) / 100) * total;
  const u = (Math.min(unauth, 100) / 100) * total;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arc = (startDeg: number, endDeg: number, color: string) => {
    const start = toRad(startDeg - 90);
    const end = toRad(endDeg - 90);
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />;
  };
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
      {arc(0, s, "#00D4AA")}
      {arc(s, s + f, "#EF4444")}
      {arc(s + f, s + f + u, "#F97316")}
      <text x={cx} y={cy - 6} fill="white" fontSize="22" fontWeight="800" textAnchor="middle">{success.toFixed(0)}%</text>
      <text x={cx} y={cy + 14} fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="600" textAnchor="middle">TỶ LỆ HỢP LỆ</text>
    </svg>
  );
}

function BarChart({ items }: { items: { label: string; count: number }[] }) {
  const W = 480, H = 160, PL = 40, PR = 10, PT = 10, PB = 25;
  const cW = W - PL - PR, cH = H - PT - PB;
  const days = items && items.length > 0 ? items : [
    { label: "T2", count: 420 }, { label: "T3", count: 460 }, { label: "T4", count: 440 },
    { label: "T5", count: 480 }, { label: "T6", count: 410 }, { label: "T7", count: 90 }, { label: "CN", count: 70 },
  ];
  const maxV = Math.max(...days.map(d => d.count), 100);
  const barW = cW / days.length;
  const gridVals = [0, Math.round(maxV * 0.5), maxV];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="staffGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {gridVals.map((v) => {
        const y = PT + cH - (v / maxV) * cH;
        return (
          <g key={v}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PL - 6} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">{v}</text>
          </g>
        );
      })}
      {days.map((day, i) => {
        const x = PL + i * barW + barW * 0.15;
        const bw = barW * 0.7;
        const h = (day.count / maxV) * cH;
        return (
          <g key={day.label + i}>
            <rect x={x} y={PT + cH - h} width={bw} height={h} rx="4" fill="url(#staffGrad)" />
            <text x={x + bw / 2} y={H - 6} fill="rgba(255,255,255,0.35)" fontSize="10" textAnchor="middle">{day.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function getAttendanceBadge(status: string, label: string) {
  switch (status) {
    case "ON_TIME":
      return { bg: "rgba(0, 212, 170, 0.15)", color: "var(--accent-teal)", border: "rgba(0, 212, 170, 0.3)" };
    case "LATE":
      return { bg: "rgba(245, 158, 11, 0.15)", color: "#F59E0B", border: "rgba(245, 158, 11, 0.3)" };
    case "EARLY_LEAVE":
      return { bg: "rgba(59, 130, 246, 0.15)", color: "var(--accent-blue)", border: "rgba(59, 130, 246, 0.3)" };
    case "OVERTIME":
      return { bg: "rgba(168, 85, 247, 0.15)", color: "#C084FC", border: "rgba(168, 85, 247, 0.3)" };
    case "SINGLE_PUNCH":
      return { bg: "rgba(14, 165, 233, 0.15)", color: "#38BDF8", border: "rgba(14, 165, 233, 0.3)" };
    case "ABSENT":
      return { bg: "rgba(239, 68, 68, 0.15)", color: "var(--accent-red)", border: "rgba(239, 68, 68, 0.3)" };
    default:
      return { bg: "rgba(255, 255, 255, 0.05)", color: "var(--text-secondary)", border: "var(--border)" };
  }
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"traffic" | "attendance">("traffic");

  // Traffic report state
  const [period, setPeriod] = useState<"today" | "7days" | "30days">("today");
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  // Time attendance state
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [attendanceDept, setAttendanceDept] = useState<string>("");
  const [attendanceStatus, setAttendanceStatus] = useState<string>("ALL");
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Load Traffic summary report
  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.reports.getSummary(period);
      if (data) {
        setReportData(data);
      }
    } catch (err) {
      console.error("Failed to load reports from DB:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  // Load Attendance report
  const loadAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const data = await api.reports.getAttendance(attendanceDate, attendanceDept, attendanceStatus);
      if (data) {
        setAttendanceData(data);
      }
    } catch (err) {
      console.error("Failed to load attendance report:", err);
    } finally {
      setAttendanceLoading(false);
    }
  }, [attendanceDate, attendanceDept, attendanceStatus]);

  useEffect(() => {
    if (activeTab === "traffic") {
      loadReport();
    } else {
      loadAttendance();
    }
  }, [activeTab, loadReport, loadAttendance]);

  const totalAccess = reportData?.total_access ?? 0;
  const dist = reportData?.distribution || {
    granted_count: 0,
    denied_count: 0,
    unknown_count: 0,
    granted_pct: 0,
    denied_pct: 0,
    unknown_pct: 0,
  };

  const periodLabel = period === "today" ? "Hôm nay" : period === "7days" ? "7 ngày qua" : "30 ngày qua";

  const stats = [
    { label: "TỔNG SỐ LƯỢT TRUY CẬP", value: totalAccess.toLocaleString("vi-VN"), change: periodLabel, up: true, color: "var(--text-primary)", border: "var(--border)" },
    { label: "TỪ CHỐI / CẢNH BÁO", value: dist.denied_count.toLocaleString("vi-VN"), change: `${dist.denied_pct}%`, up: dist.denied_count > 0, color: "var(--accent-red)", border: "rgba(239,68,68,0.3)", warn: dist.denied_count > 0 },
    { label: "TỶ LỆ HỢP LỆ (GRANTED)", value: `${dist.granted_pct}%`, change: "Chuẩn AI", color: "var(--accent-teal)", border: "var(--border)" },
    { label: "NGƯỜI LẠ / CHƯA ĐĂNG KÝ", value: dist.unknown_count.toLocaleString("vi-VN"), change: `${dist.unknown_pct}%`, up: false, color: "var(--text-primary)", border: "var(--border)" },
  ];

  const handleExportTraffic = () => {
    const url = api.reports.getExportUrl(period);
    window.open(url, "_blank");
  };

  const handleExportAttendance = () => {
    const url = api.reports.getAttendanceExportUrl(attendanceDate, attendanceDept, attendanceStatus);
    window.open(url, "_blank");
  };

  const attSummary = attendanceData?.summary || {
    total_employees: 0,
    present_count: 0,
    on_time_count: 0,
    late_count: 0,
    avg_working_hours: 0,
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header & Tab Selector */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Báo cáo & Chấm công FaceGate AI</h1>
                <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "rgba(0, 212, 170, 0.15)", color: "var(--accent-teal)", border: "1px solid rgba(0, 212, 170, 0.3)", fontWeight: 600 }}>
                  Giai đoạn 4: Time Attendance & Export
                </span>
              </div>
              <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>
                Phân tích lưu lượng kiểm soát ra vào & Bảng chấm công tự động First-IN / Last-OUT từ CSDL.
              </p>
            </div>

            {/* Tab navigation buttons */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, padding: 3, gap: 4 }}>
              <button
                onClick={() => setActiveTab("traffic")}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "none",
                  borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: activeTab === "traffic" ? "rgba(0,212,170,0.18)" : "transparent",
                  color: activeTab === "traffic" ? "var(--accent-teal)" : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                📊 Phân tích Lưu lượng
              </button>
              <button
                onClick={() => setActiveTab("attendance")}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "none",
                  borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: activeTab === "attendance" ? "rgba(59,130,246,0.18)" : "transparent",
                  color: activeTab === "attendance" ? "var(--accent-blue)" : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                🕒 Bảng Chấm công (First-IN / Last-OUT)
              </button>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: TRAFFIC & SECURITY REPORTS */}
          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "traffic" && (
            <>
              {/* Filter & Export Bar */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                  {[
                    { id: "today", label: "Hôm nay" },
                    { id: "7days", label: "7 ngày qua" },
                    { id: "30days", label: "30 ngày qua" },
                  ].map((p) => (
                    <button key={p.id} onClick={() => setPeriod(p.id as any)}
                      style={{ padding: "8px 14px", border: "none", background: period === p.id ? "rgba(0,212,170,0.15)" : "transparent", color: period === p.id ? "var(--accent-teal)" : "var(--text-secondary)", fontSize: 12, fontWeight: period === p.id ? 600 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleExportTraffic}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", borderRadius: 10, color: "var(--accent-teal)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Xuất CSV Báo cáo
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {stats.map((s) => (
                  <div key={s.label} style={{ background: "var(--bg-card)", border: `1px solid ${s.border}`, borderRadius: 14, padding: "18px 20px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: s.warn ? s.color : "var(--text-muted)", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      {s.warn && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>}
                      {s.label}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 30, fontWeight: 800, color: s.warn ? s.color : "var(--text-primary)", letterSpacing: "-0.02em" }}>{s.value}</span>
                      {s.change && (
                        <span style={{ fontSize: 12, fontWeight: 600, color: s.warn ? "var(--accent-red)" : s.up === false ? "var(--accent-green)" : "var(--text-muted)" }}>
                          {s.change}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts row 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Lưu lượng ra vào theo thời gian</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Phân tích số lượt truy cập ghi nhận trong CSDL</div>
                    </div>
                  </div>
                  <LineChart data={reportData?.traffic?.map((t: any) => ({ hour: t.label, val: t.value })) || []} />
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px", display: "flex", flexDirection: "column" }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Tỷ lệ xác thực thành công</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Tỷ lệ hợp lệ vs từ chối vs người lạ</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <DonutChart success={dist.granted_pct || 0} failed={dist.denied_pct || 0} unauth={dist.unknown_pct || 0} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {[
                      { label: `Hợp lệ (${dist.granted_count})`, color: "#00D4AA" },
                      { label: `Từ chối (${dist.denied_count})`, color: "#EF4444" },
                      { label: `Người lạ / Cảnh báo (${dist.unknown_count})`, color: "#F97316" },
                    ].map((item) => (
                      <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bar chart: By door */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Lưu lượng phân bổ theo Cửa kiểm soát</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Số lượt truy cập qua từng cửa trong CSDL</div>
                  </div>
                </div>
                <BarChart items={reportData?.by_door?.map((d: any) => ({ label: d.name || "Cửa", count: d.count })) || []} />
              </div>

              {/* Top Users Section */}
              {reportData?.top_users && reportData.top_users.length > 0 && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px" }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Top 5 Nhân viên ra vào nhiều nhất</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Thống kê theo dữ liệu quét khuôn mặt thành công từ CSDL</div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "left" }}>
                          <th style={{ padding: "8px 12px" }}>Mã NV</th>
                          <th style={{ padding: "8px 12px" }}>Họ và tên</th>
                          <th style={{ padding: "8px 12px" }}>Phòng ban</th>
                          <th style={{ padding: "8px 12px", textAlign: "right" }}>Số lượt truy cập</th>
                          <th style={{ padding: "8px 12px", textAlign: "right" }}>Lần gần nhất</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.top_users.map((u: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#00D4AA", fontWeight: 600 }}>{u.employee_id}</td>
                            <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontWeight: 600 }}>{u.full_name}</td>
                            <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{u.department}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-primary)", fontWeight: 700 }}>{u.access_count} lượt</td>
                            <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-muted)", fontSize: 12 }}>
                              {u.last_access ? new Date(u.last_access).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: TIME ATTENDANCE REPORT (FIRST-IN / LAST-OUT) */}
          {/* ════════════════════════════════════════════════════════════════════════════════ */}
          {activeTab === "attendance" && (
            <>
              {/* Attendance Filter Toolbar */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase" }}>Ngày chấm công</label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      style={{ padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase" }}>Phòng ban</label>
                    <input
                      type="text"
                      placeholder="Tất cả phòng ban..."
                      value={attendanceDept}
                      onChange={(e) => setAttendanceDept(e.target.value)}
                      style={{ padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", width: 170 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase" }}>Trạng thái</label>
                    <select
                      value={attendanceStatus}
                      onChange={(e) => setAttendanceStatus(e.target.value)}
                      style={{ padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="ON_TIME">Đúng giờ (On Time)</option>
                      <option value="LATE">Đi muộn (Late)</option>
                      <option value="EARLY_LEAVE">Về sớm</option>
                      <option value="OVERTIME">Làm thêm (OT)</option>
                      <option value="ABSENT">Vắng mặt (Absent)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={loadAttendance}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    🔄 Làm mới
                  </button>
                  <button
                    onClick={handleExportAttendance}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 10, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 15px rgba(0,212,170,0.3)" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Xuất Bảng Chấm Công (Excel/CSV)
                  </button>
                </div>
              </div>

              {/* Attendance KPI Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {[
                  { label: "TỔNG NHÂN SỰ", value: attSummary.total_employees, unit: "người", color: "var(--text-primary)", icon: "👥" },
                  { label: "CÓ MẶT ĐI LÀM", value: attSummary.present_count, unit: "người", color: "var(--accent-teal)", icon: "✅" },
                  { label: "ĐÚNG GIỜ", value: attSummary.on_time_count, unit: "người", color: "var(--accent-green)", icon: "⏰" },
                  { label: "ĐI MUỘN", value: attSummary.late_count, unit: "người", color: "#F59E0B", icon: "⚠️" },
                  { label: "GIỜ LÀM TRUNG BÌNH", value: attSummary.avg_working_hours, unit: "giờ/người", color: "var(--accent-blue)", icon: "⏳" },
                ].map((stat, i) => (
                  <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      {stat.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{stat.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: stat.color, marginTop: 2 }}>
                        {stat.value} <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>{stat.unit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Attendance Records Table */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      Chi tiết Chấm công ngày {attendanceDate}
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                      Thuật toán First-IN (Lần quẹt đầu ngày) / Last-OUT (Lần quẹt cuối ngày) tự động tính toán từ camera và cửa nhận diện.
                    </p>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {attendanceData?.records?.length || 0} bản ghi
                  </span>
                </div>

                {attendanceLoading ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                    Đang tính toán bảng chấm công từ CSDL...
                  </div>
                ) : !attendanceData?.records || attendanceData.records.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                    Không có dữ liệu chấm công phù hợp cho tiêu chí đã chọn.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "left" }}>
                          <th style={{ padding: "10px 12px" }}>Mã NV</th>
                          <th style={{ padding: "10px 12px" }}>Họ và tên</th>
                          <th style={{ padding: "10px 12px" }}>Phòng ban</th>
                          <th style={{ padding: "10px 12px" }}>Giờ Vào (First-IN)</th>
                          <th style={{ padding: "10px 12px" }}>Giờ Ra (Last-OUT)</th>
                          <th style={{ padding: "10px 12px" }}>Cửa Check-In</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Tổng giờ làm</th>
                          <th style={{ padding: "10px 12px", textAlign: "center" }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceData.records.map((r: any, idx: number) => {
                          const badge = getAttendanceBadge(r.status, r.status_label);
                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "12px", fontFamily: "monospace", color: "#00D4AA", fontWeight: 600 }}>
                                {r.employee_id}
                              </td>
                              <td style={{ padding: "12px", color: "var(--text-primary)", fontWeight: 600 }}>
                                {r.name}
                              </td>
                              <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                                {r.department}
                              </td>
                              <td style={{ padding: "12px", color: r.check_in ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 500 }}>
                                {r.check_in || "--:--"}
                              </td>
                              <td style={{ padding: "12px", color: r.check_out ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 500 }}>
                                {r.check_out || "--:--"}
                              </td>
                              <td style={{ padding: "12px", color: "var(--text-secondary)", fontSize: 12 }}>
                                {r.first_door || "--"}
                              </td>
                              <td style={{ padding: "12px", textAlign: "right", color: "var(--text-primary)", fontWeight: 700 }}>
                                {r.working_hours > 0 ? `${r.working_hours.toFixed(2)}h` : "--"}
                              </td>
                              <td style={{ padding: "12px", textAlign: "center" }}>
                                <span style={{
                                  display: "inline-block", padding: "4px 10px", borderRadius: 6,
                                  fontSize: 11, fontWeight: 600,
                                  background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`
                                }}>
                                  {r.status_label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
