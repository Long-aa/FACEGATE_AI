"use client";

import React, { useState, useEffect, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

type ToastListener = (toast: ToastItem) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  show: (type: ToastType, message: string, title?: string, duration = 4000) => {
    const item: ToastItem = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      message,
      title,
      duration,
    };
    listeners.forEach((listener) => listener(item));
  },
  success: (message: string, title?: string, duration?: number) => {
    toast.show("success", message, title || "XÁC NHẬN THÀNH CÔNG", duration);
  },
  error: (message: string, title?: string, duration?: number) => {
    toast.show("error", message, title || "LỖI HỆ THỐNG", duration || 5000);
  },
  warning: (message: string, title?: string, duration?: number) => {
    toast.show("warning", message, title || "CẢNH BÁO YÊU CẦU", duration || 4500);
  },
  info: (message: string, title?: string, duration?: number) => {
    toast.show("info", message, title || "THÔNG TIN HỆ THỐNG", duration);
  },
};

const TYPE_CONFIG = {
  warning: {
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.5)",
    shadow: "0 12px 40px rgba(245, 158, 11, 0.25), 0 0 20px rgba(245, 158, 11, 0.15)",
    iconBg: "linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.1))",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    pulseColor: "#F59E0B",
  },
  error: {
    color: "#EF4444",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.5)",
    shadow: "0 12px 40px rgba(239, 68, 68, 0.25), 0 0 20px rgba(239, 68, 68, 0.15)",
    iconBg: "linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.1))",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    pulseColor: "#EF4444",
  },
  success: {
    color: "#00D4AA",
    bg: "rgba(0, 212, 170, 0.12)",
    border: "rgba(0, 212, 170, 0.5)",
    shadow: "0 12px 40px rgba(0, 212, 170, 0.25), 0 0 20px rgba(0, 212, 170, 0.15)",
    iconBg: "linear-gradient(135deg, rgba(0, 212, 170, 0.25), rgba(0, 114, 255, 0.1))",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    pulseColor: "#00D4AA",
  },
  info: {
    color: "#38BDF8",
    bg: "rgba(56, 189, 248, 0.12)",
    border: "rgba(56, 189, 248, 0.5)",
    shadow: "0 12px 40px rgba(56, 189, 248, 0.25), 0 0 20px rgba(56, 189, 248, 0.15)",
    iconBg: "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(0, 114, 255, 0.1))",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    pulseColor: "#38BDF8",
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleNewToast = (item: ToastItem) => {
      setToasts((prev) => [item, ...prev.slice(0, 4)]);
    };
    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
        maxWidth: "92vw",
        width: 520,
        pointerEvents: "none",
      }}
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => removeToast(item.id)} />
      ))}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes toastSlideDown {
              0% { opacity: 0; transform: translateY(-24px) scale(0.95); }
              60% { opacity: 1; transform: translateY(4px) scale(1.02); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes pulseDot {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(1.3); }
            }
          `,
        }}
      />
    </div>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const duration = item.duration || 4000;
    const intervalTime = 40;
    const step = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [item.duration, onDismiss, isPaused]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        pointerEvents: "auto",
        width: "100%",
        position: "relative",
        background: "rgba(11, 16, 28, 0.94)",
        backdropFilter: "blur(20px)",
        border: `1px solid ${cfg.border}`,
        borderRadius: 14,
        padding: "16px 18px 18px",
        boxShadow: cfg.shadow,
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        overflow: "hidden",
        animation: "toastSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Type Icon Badge */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: cfg.iconBg,
          border: `1px solid ${cfg.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 0 16px ${cfg.bg}`,
        }}
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: cfg.pulseColor,
              boxShadow: `0 0 8px ${cfg.pulseColor}`,
              animation: "pulseDot 1.8s infinite ease-in-out",
            }}
          />
          <h4
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: cfg.color,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {item.title}
          </h4>
        </div>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#F1F5F9",
            lineHeight: 1.5,
            margin: 0,
            wordBreak: "break-word",
          }}
        >
          {item.message}
        </p>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={onDismiss}
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 6,
          color: "#94A3B8",
          width: 26,
          height: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          fontSize: 13,
          lineHeight: 1,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#FFFFFF";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#94A3B8";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
        }}
      >
        ✕
      </button>

      {/* Animated Time Progress Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(255, 255, 255, 0.08)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: cfg.color,
            boxShadow: `0 0 10px ${cfg.color}`,
            transition: "width 0.04s linear",
          }}
        />
      </div>
    </div>
  );
}
