"use client";

import React, { useState, useEffect } from "react";
import { getSession } from "@/lib/auth";

export function TopBar() {
  const [time, setTime] = useState(new Date());
  const [isDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [userInitials, setUserInitials] = useState("QT");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setTime(new Date()), 1000);
    const session = getSession();
    if (session) {
      const parts = session.user.name.split(" ");
      setUserInitials(session.user.avatar || parts.map((p: string) => p[0]).join("").slice(0, 2).toUpperCase());
      setUserName(session.user.name);
    }
    return () => clearInterval(t);
  }, []);

  const timeStr = mounted
    ? time.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";

  return (
    <header
      style={{
        height: 60,
        background: "rgba(11, 15, 26, 0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Search */}
      <div
        style={{
          flex: 1,
          maxWidth: 360,
          position: "relative",
        }}
      >
        <svg
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Tìm kiếm..."
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "8px 12px 8px 36px",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,170,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Time — suppressHydrationWarning prevents mismatch between SSR & client clock */}
      <div suppressHydrationWarning style={{ fontSize: 13, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{timeStr}</div>

      {/* Icons */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {[
          {
            id: "camera",
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="15" height="10" rx="2" /><polyline points="17 11 21 7 21 17 17 13" />
              </svg>
            ),
          },
          {
            id: "lock",
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ),
          },
          {
            id: "bell",
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            ),
            badge: 3,
          },
        ].map(({ id, icon, badge }) => (
          <button
            key={id}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-secondary)",
              transition: "all 0.15s ease",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}
          >
            {icon}
            {badge && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--accent-red)",
                  border: "1.5px solid var(--bg-primary)",
                }}
              />
            )}
          </button>
        ))}

        {/* Dark mode toggle */}
        <button
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: isDark ? "#F59E0B" : "var(--text-secondary)",
            transition: "all 0.15s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>

        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right", display: userName ? "block" : "none" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#F1F5F9", lineHeight: 1 }}>{userName}</div>
          </div>
          <div
            title={userName}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #00D4AA 0%, #3B82F6 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white",
              border: "2px solid rgba(0,212,170,0.3)",
            }}
          >
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
}
