"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Tổng quan",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/recognition",
    label: "Nhận diện",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    href: "/users",
    label: "Quản lý người dùng",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },

  {
    href: "/access-logs",
    label: "Lịch sử",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    href: "/cameras",
    label: "Camera",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="15" height="10" rx="2" /><polyline points="17 11 21 7 21 17 17 13" />
      </svg>
    ),
  },
  {
    href: "/doors",
    label: "Cửa",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h6v18H3z" /><path d="M9 3h6l3 3v12l-3 3H9" /><circle cx="16" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/reports",
    label: "Báo cáo",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  {
    href: "/alerts",
    label: "Cảnh báo",
    badge: 3,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Cài đặt",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        minWidth: "var(--sidebar-width)",
        height: "100vh",
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 16px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #00D4AA 0%, #3B82F6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 15px rgba(0, 212, 170, 0.3)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9l2 2 4-4" />
            <path d="M9 15h6" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
            FaceGate <span style={{ color: "var(--accent-teal)" }}>AI</span>
          </div>
          <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 1 }}>
            Kiểm Soát An Toàn
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          const hovered = hoveredItem === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                marginBottom: 2,
                textDecoration: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: active
                  ? "linear-gradient(135deg, rgba(0,212,170,0.12) 0%, rgba(59,130,246,0.08) 100%)"
                  : hovered
                  ? "rgba(255,255,255,0.04)"
                  : "transparent",
                borderLeft: active ? "2px solid var(--accent-teal)" : "2px solid transparent",
                color: active ? "var(--accent-teal)" : hovered ? "var(--text-primary)" : "var(--text-secondary)",
                position: "relative",
              }}
            >
              <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    background: "var(--accent-red)",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 10,
                    padding: "1px 6px",
                    minWidth: 18,
                    textAlign: "center",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
        <button
          id="sidebar-logout-btn"
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            borderRadius: 8,
            width: "100%",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            transition: "all 0.15s ease",
            fontSize: 13,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)";
            (e.currentTarget as HTMLButtonElement).style.color = "#EF4444";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
