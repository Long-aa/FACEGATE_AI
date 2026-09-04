"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

// SVG Line Chart
const hourlyData = [
  { hour: "06:00", val: 100 }, { hour: "08:00", val: 850 }, { hour: "10:00", val: 450 },
  { hour: "12:00", val: 600 }, { hour: "14:00", val: 780 }, { hour: "16:00", val: 300 },
  { hour: "18:00", val: 200 }, { hour: "20:00", val: 120 }, { hour: "22:00", val: 40 },
];

const dailyStaff = [4200, 4600, 4400, 4800, 4100, 900, 700];
const dailyVisitor = [600, 500, 450, 550, 500, 200, 180];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function LineChart() {
  const W = 480, H = 200, PL = 40, PR = 20, PT = 10, PB = 30;
  const cW = W - PL - PR, cH = H - PT - PB;
  const maxV = 900;
  const pts = hourlyData.map((d, i) => ({
    x: PL + (i / (hourlyData.length - 1)) * cW,
    y: PT + cH - (d.val / maxV) * cH,
  }));
  const pathD = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `C ${(pts[i - 1].x + p.x) / 2} ${pts[i - 1].y}, ${(pts[i - 1].x + p.x) / 2} ${p.y}, ${p.x} ${p.y}`)).join(" ");
  const areaD = pathD + ` L ${pts[pts.length - 1].x} ${PT + cH} L ${pts[0].x} ${PT + cH} Z`;
  const gridYVals = [0, 300, 600, 900];

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
      {/* Grid lines */}
      {gridYVals.map((v) => {
        const y = PT + cH - (v / maxV) * cH;
        return (
          <g key={v}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PL - 6} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">{v}</text>
          </g>
        );
      })}
      {/* Area fill */}
      <path d={areaD} fill="url(#lineGrad)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="url(#lineStroke)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#0d1321" stroke="#00D4AA" strokeWidth="2" />
      ))}
      {/* X axis labels */}
      {hourlyData.map((d, i) => (
        <text key={d.hour} x={pts[i].x} y={H - 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle">{d.hour}</text>
      ))}
    </svg>
  );
}

function DonutChart() {
  const r = 60, cx = 80, cy = 80;
  const success = 98, failed = 1.2, unauth = 0.8;
  const total = 360;
  const s = (success / 100) * total;
  const f = (failed / 100) * total;
  const u = (unauth / 100) * total;
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
      <text x={cx} y={cy - 6} fill="white" fontSize="22" fontWeight="800" textAnchor="middle">98%</text>
      <text x={cx} y={cy + 14} fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="600" textAnchor="middle">SUCCESS RATE</text>
    </svg>
  );
}

function BarChart() {
  const W = 480, H = 160, PL = 40, PR = 10, PT = 10, PB = 25;
  const cW = W - PL - PR, cH = H - PT - PB;
  const maxV = 6000;
  const barW = cW / days.length;
  const gridVals = [0, 2000, 4000, 6000];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="staffGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(100,120,160,0.6)" />
          <stop offset="100%" stopColor="rgba(60,80,120,0.3)" />
        </linearGradient>
      </defs>
      {gridVals.map((v) => {
        const y = PT + cH - (v / maxV) * cH;
        return (
          <g key={v}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PL - 6} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">{v === 0 ? "0" : `${v / 1000}k`}</text>
          </g>
        );
      })}
      {days.map((day, i) => {
        const x = PL + i * barW + barW * 0.1;
        const bw = barW * 0.4;
        const staffH = (dailyStaff[i] / maxV) * cH;
        const visitorH = (dailyVisitor[i] / maxV) * cH;
        const combinedH = staffH + visitorH;
        return (
          <g key={day}>
            <rect x={x} y={PT + cH - combinedH} width={bw * 2} height={combinedH} rx="3" fill="url(#visitorGrad)" />
            <rect x={x} y={PT + cH - staffH} width={bw * 2} height={staffH} rx="3" fill="url(#staffGrad)" />
            <text x={x + bw} y={H - 6} fill="rgba(255,255,255,0.35)" fontSize="10" textAnchor="middle">{day}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<"Today" | "7 Days" | "30 Days">("Today");

  const stats = [
    { label: "TOTAL ACCESS EVENTS", value: "12,482", change: "+4.2%", up: true, color: "var(--text-primary)", border: "var(--border)" },
    { label: "FAILED ATTEMPTS", value: "143", change: "+12%", up: true, color: "var(--accent-red)", border: "rgba(239,68,68,0.3)", warn: true },
    { label: "ACTIVE FACES", value: "8,904", change: "Stable", color: "var(--text-primary)", border: "var(--border)" },
    { label: "AVG AUTH TIME", value: "0.8s", change: "-0.1s", up: false, color: "var(--text-primary)", border: "var(--border)" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Báo cáo & Phân tích</h1>
              <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>Tổng quan bảo mật toàn diện và số liệu truy cập.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                {(["Today", "7 Days", "30 Days"] as const).map((p) => (
                  <button key={p} onClick={() => setPeriod(p)}
                    style={{ padding: "8px 14px", border: "none", background: period === p ? "rgba(0,212,170,0.15)" : "transparent", color: period === p ? "var(--accent-teal)" : "var(--text-secondary)", fontSize: 12, fontWeight: period === p ? 600 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                    {p}
                  </button>
                ))}
              </div>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                PDF
              </button>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", borderRadius: 10, color: "var(--accent-teal)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Excel
              </button>
            </div>
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
            {/* Line chart */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Hourly Entry/Exit Flow</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Real-time throughput analysis</div>
                </div>
                <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
              </div>
              <LineChart />
            </div>

            {/* Donut chart */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px", display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Authentication Success</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Ratio of successful vs failed</div>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <DonutChart />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {[
                  { label: "Success", color: "#00D4AA" },
                  { label: "Failed", color: "#6B7280" },
                  { label: "Unauthorized", color: "#F97316" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Daily Access Volume</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Historical view of total visits</div>
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                {[{ label: "Staff", color: "#00D4AA" }, { label: "Visitor", color: "rgba(100,120,160,0.6)" }].map((l) => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, background: l.color, borderRadius: 2 }} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <BarChart />
          </div>
        </main>
      </div>
    </div>
  );
}
