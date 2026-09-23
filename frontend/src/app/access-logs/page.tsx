"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/ToastNotification";

// ─── TYPES & INTERFACES ────────────────────────────────────────────────────────

interface AuditLogRecord {
  id: string;
  logNumber: number;
  time: string;
  date: string;
  fullTimestamp: string;
  userName: string;
  userCode: string;
  department: string;
  jobTitle?: string;
  cardType?: string;
  cameraName: string;
  doorName: string;
  cameraResolution?: string;
  confidence: number;
  result: "GRANTED" | "DENIED" | "LOW CONF" | "UNKNOWN";
  livePhoto?: string;
  masterPhoto?: string;
  initials?: string;
  initialsBg?: string;
  cosineScore?: number;
  faceDistance?: number;
  livenessPassed?: boolean;
  livenessScore?: number;
  latencyMs?: number;
  aiModel?: string;
  eventTimeline?: { time: string; text: string; status?: "success" | "warn" | "error" | "info" }[];
  isUnknown?: boolean;
  isMasked?: boolean;
  relayStatus?: string;
}

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────

const INITIAL_LOGS: AuditLogRecord[] = [
  {
    id: "log-1284",
    logNumber: 1284,
    time: "10:45:22",
    date: "14/09/2026",
    fullTimestamp: "10:45:22.180 - 14/09/2026",
    userName: "Nguyễn Văn An",
    userCode: "EMP-2045",
    department: "Khối Kỹ thuật & R&D AI",
    jobTitle: "Kỹ sư AI cao cấp",
    cardType: "Smart Face ID v2",
    cameraName: "Cam 01 - Cửa chính",
    doorName: "Cửa chính Lobby",
    cameraResolution: "CAM 01 (1080p @ 30fps)",
    confidence: 96.8,
    result: "GRANTED",
    initials: "VA",
    initialsBg: "linear-gradient(135deg, #00D4AA, #0284C7)",
    cosineScore: 0.968,
    faceDistance: 0.18,
    livenessPassed: true,
    livenessScore: 99.4,
    latencyMs: 40,
    aiModel: "Dlib ResNet-34 (512D)",
    relayStatus: "Mở tự động (Relay 01)",
    eventTimeline: [
      { time: "10:45:22.100", text: "Phát hiện khuôn mặt (OpenCV HOG)", status: "info" },
      { time: "10:45:22.128", text: "Trích xuất 68 landmarks & 512-D vector", status: "info" },
      { time: "10:45:22.148", text: "Khớp EMP-2045 [Khoảng cách: 0.18 < 0.40]", status: "success" },
      { time: "10:45:22.165", text: "Quyết định: ACCESS GRANTED", status: "success" },
      { time: "10:45:22.180", text: "Kích hoạt rơ-le mở Flap Barrier (05)", status: "success" },
    ],
  },
  {
    id: "log-1283",
    logNumber: 1283,
    time: "10:42:15",
    date: "14/09/2026",
    fullTimestamp: "10:42:15.340 - 14/09/2026",
    userName: "Trần Thị Bích Trâm",
    userCode: "EMP-2042",
    department: "Phòng Kế toán & Tài chính",
    jobTitle: "Chuyên viên Kế toán",
    cardType: "Smart Face ID v2",
    cameraName: "Cam 01 - Cửa chính",
    doorName: "Cửa chính Lobby",
    cameraResolution: "CAM 01 (1080p @ 30fps)",
    confidence: 94.2,
    result: "GRANTED",
    initials: "TT",
    initialsBg: "linear-gradient(135deg, #10B981, #06B6D4)",
    cosineScore: 0.942,
    faceDistance: 0.22,
    livenessPassed: true,
    livenessScore: 98.7,
    latencyMs: 38,
    aiModel: "Dlib ResNet-34 (512D)",
    relayStatus: "Mở tự động (Relay 01)",
    eventTimeline: [
      { time: "10:42:15.220", text: "Phát hiện khuôn mặt (OpenCV HOG)", status: "info" },
      { time: "10:42:15.250", text: "Trích xuất 68 landmarks", status: "info" },
      { time: "10:42:15.295", text: "Khớp EMP-2042 [Khoảng cách: 0.22 < 0.40]", status: "success" },
      { time: "10:42:15.320", text: "Quyết định: ACCESS GRANTED", status: "success" },
      { time: "10:42:15.340", text: "Kích hoạt rơ-le mở Flap Barrier (05)", status: "success" },
    ],
  },
  {
    id: "log-1282",
    logNumber: 1282,
    time: "10:38:05",
    date: "14/09/2026",
    fullTimestamp: "10:38:05.812 - 14/09/2026",
    userName: "Người lạ [Chưa đăng ký]",
    userCode: "--",
    department: "Không tồn tại trong DB",
    jobTitle: "Khách vãng lai chưa cấp phép",
    cardType: "Không có thẻ",
    cameraName: "Cam 01 - Cửa chính",
    doorName: "Cửa chính Lobby",
    cameraResolution: "CAM 01 (1080p @ 30fps)",
    confidence: 41.3,
    result: "DENIED",
    isUnknown: true,
    initials: "?",
    initialsBg: "linear-gradient(135deg, #EF4444, #991B1B)",
    cosineScore: 0.413,
    faceDistance: 0.69,
    livenessPassed: true,
    livenessScore: 95.1,
    latencyMs: 44,
    aiModel: "Dlib ResNet-34 (512D)",
    relayStatus: "Khóa cưỡng bức (Không mở)",
    eventTimeline: [
      { time: "10:38:05.710", text: "Phát hiện khuôn mặt (OpenCV HOG)", status: "info" },
      { time: "10:38:05.742", text: "Trích xuất 68 landmarks & vector", status: "info" },
      { time: "10:38:05.780", text: "So khớp cơ sở dữ liệu: Không tìm thấy", status: "warn" },
      { time: "10:38:05.800", text: "Cảnh báo: ACCESS DENIED (Không khớp hồ sơ)", status: "error" },
      { time: "10:38:05.812", text: "Ghi log an ninh & Chụp ảnh đối soát", status: "error" },
    ],
  },
  {
    id: "log-1281",
    logNumber: 1281,
    time: "10:35:19",
    date: "14/09/2026",
    fullTimestamp: "10:35:19.455 - 14/09/2026",
    userName: "Lê Hoàng Nam",
    userCode: "EMP-2105",
    department: "Ban An ninh & Giám sát",
    jobTitle: "Đội trưởng An ninh",
    cardType: "Smart Face ID VIP",
    cameraName: "Cam 03 - Thang máy",
    doorName: "Thang máy VIP",
    cameraResolution: "CAM 03 (1080p @ 30fps)",
    confidence: 98.1,
    result: "GRANTED",
    initials: "HN",
    initialsBg: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
    cosineScore: 0.981,
    faceDistance: 0.14,
    livenessPassed: true,
    livenessScore: 99.8,
    latencyMs: 32,
    aiModel: "Dlib ResNet-34 (512D)",
    relayStatus: "Kích hoạt gọi tầng VIP",
    eventTimeline: [
      { time: "10:35:19.350", text: "Phát hiện khuôn mặt (OpenCV HOG)", status: "info" },
      { time: "10:35:19.380", text: "Khớp EMP-2105 [Khoảng cách: 0.14]", status: "success" },
      { time: "10:35:19.420", text: "Quyết định: ACCESS GRANTED VIP", status: "success" },
      { time: "10:35:19.455", text: "Mở rào cản thang máy VIP", status: "success" },
    ],
  },
  {
    id: "log-1280",
    logNumber: 1280,
    time: "10:31:44",
    date: "14/09/2026",
    fullTimestamp: "10:31:44.201 - 14/09/2026",
    userName: "Phạm Quang Huy",
    userCode: "EMP-1988",
    department: "Khối Vận hành Kho",
    jobTitle: "Kỹ thuật viên Vận hành",
    cardType: "Smart Face ID v2",
    cameraName: "Cam 02 - Cửa phụ",
    doorName: "Cửa phụ Kho",
    cameraResolution: "CAM 02 (1080p @ 30fps)",
    confidence: 57.2,
    result: "LOW CONF",
    initials: "QH",
    initialsBg: "linear-gradient(135deg, #F59E0B, #D97706)",
    cosineScore: 0.572,
    faceDistance: 0.38,
    livenessPassed: true,
    livenessScore: 91.3,
    latencyMs: 52,
    aiModel: "Dlib ResNet-34 (512D)",
    relayStatus: "Cần xác thực lại (Low Confidence)",
    eventTimeline: [
      { time: "10:31:44.090", text: "Phát hiện khuôn mặt góc nghiêng", status: "warn" },
      { time: "10:31:44.130", text: "Độ tin cậy thấp: 57.2% (Ngưỡng yêu cầu 70%)", status: "warn" },
      { time: "10:31:44.170", text: "Khuyến nghị nhân viên nhìn thẳng camera", status: "info" },
    ],
  },
  {
    id: "log-1279",
    logNumber: 1279,
    time: "10:28:19",
    date: "14/09/2026",
    fullTimestamp: "10:28:19.992 - 14/09/2026",
    userName: "Người lạ [Khuôn mặt che khuất]",
    userCode: "--",
    department: "Đeo khẩu trang / Kính râm",
    jobTitle: "Chưa xác định",
    cardType: "Không có thẻ",
    cameraName: "Cam 01 - Cửa chính",
    doorName: "Cửa chính Lobby",
    cameraResolution: "CAM 01 (1080p @ 30fps)",
    confidence: 38.5,
    result: "UNKNOWN",
    isMasked: true,
    initials: "🚫",
    initialsBg: "linear-gradient(135deg, #7F1D1D, #450A0A)",
    cosineScore: 0.385,
    faceDistance: 0.76,
    livenessPassed: false,
    livenessScore: 42.0,
    latencyMs: 48,
    aiModel: "Dlib ResNet-34 (512D)",
    relayStatus: "Khóa (Từ chối mở)",
    eventTimeline: [
      { time: "10:28:19.880", text: "Phát hiện khuôn mặt bị che khuất > 50%", status: "warn" },
      { time: "10:28:19.920", text: "Liveness Check thất bại (Anti-spoofing)", status: "error" },
      { time: "10:28:19.992", text: "Cảnh báo âm thanh: Yêu cầu tháo khẩu trang", status: "error" },
    ],
  },
  {
    id: "log-1278",
    logNumber: 1278,
    time: "10:20:00",
    date: "14/09/2026",
    fullTimestamp: "10:20:00.120 - 14/09/2026",
    userName: "Nguyễn Thu Hà",
    userCode: "EMP-2210",
    department: "Phòng Quản trị Nhân sự",
    jobTitle: "Trưởng phòng Nhân sự",
    cardType: "Smart Face ID v2",
    cameraName: "Cam 01 - Cửa chính",
    doorName: "Cửa chính Lobby",
    cameraResolution: "CAM 01 (1080p @ 30fps)",
    confidence: 95.4,
    result: "GRANTED",
    initials: "TH",
    initialsBg: "linear-gradient(135deg, #06B6D4, #0284C7)",
    cosineScore: 0.954,
    faceDistance: 0.19,
    livenessPassed: true,
    livenessScore: 99.2,
    latencyMs: 36,
    aiModel: "Dlib ResNet-34 (512D)",
    relayStatus: "Mở tự động (Relay 01)",
    eventTimeline: [
      { time: "10:20:00.040", text: "Phát hiện khuôn mặt (OpenCV HOG)", status: "info" },
      { time: "10:20:00.080", text: "Khớp EMP-2210 [Khoảng cách: 0.19 < 0.40]", status: "success" },
      { time: "10:20:00.120", text: "Kích hoạt rơ-le mở Flap Barrier (05)", status: "success" },
    ],
  },
];

// ─── HELPER COMPONENT: ANIMATED COUNTER ────────────────────────────────────────

function useCounter(target: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 25);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 25);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── MAIN PAGE COMPONENT ───────────────────────────────────────────────────────

export default function AccessLogsPage() {
  // State
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string>("");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("Hôm nay");
  const [userFilter, setUserFilter] = useState("all");
  const [camFilter, setCamFilter] = useState("all");
  const [doorFilter, setDoorFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [confFilter, setConfFilter] = useState("all");

  // KPI stats from DB
  const [kpi, setKpi] = useState({
    total: 0,
    granted: 0,
    denied: 0,
    unknown: 0,
    avgLatency: 38,
  });

  // DB options
  const [cameraOptions, setCameraOptions] = useState<any[]>([]);
  const [doorOptions, setDoorOptions] = useState<any[]>([]);

  // Modals & Popups
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv" | "pdf">("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [showToast, setShowToast] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Detail panel open/close
  const [showDetailPanel, setShowDetailPanel] = useState(true);

  // Fetch real data from DB
  const loadData = useCallback(async () => {
    try {
      // 1. Fetch KPI
      const stats = await api.dashboard.getStats().catch(() => null);
      if (stats) {
        setKpi({
          total: stats.today_entries ?? stats.total_events_today ?? 0,
          granted: stats.success_recognitions ?? stats.granted_today ?? 0,
          denied: stats.denied_access ?? stats.denied_today ?? 0,
          unknown: stats.unresolved_alerts ?? stats.unknown_faces_today ?? 0,
          avgLatency: 38,
        });
      }

      // 2. Fetch cameras & doors for filter
      const [cams, drs] = await Promise.all([
        api.cameras.list().catch(() => []),
        api.doors.list().catch(() => []),
      ]);
      if (Array.isArray(cams)) setCameraOptions(cams);
      if (Array.isArray(drs)) setDoorOptions(drs);

      // 3. Fetch logs from DB
      const res = await api.accessLogs.list({
        search: searchQuery.trim() || undefined,
        result: resultFilter !== "all" ? resultFilter : undefined,
        camera_id: camFilter !== "all" ? camFilter : undefined,
        door_id: doorFilter !== "all" ? doorFilter : undefined,
        page: currentPage,
        limit: pageSize,
      });

      if (res && Array.isArray(res.items)) {
        const mapped: AuditLogRecord[] = res.items.map((item: any, idx: number) => {
          const resUpper = (item.result || "").toUpperCase();
          const isGranted = resUpper === "GRANTED";
          const isUnknown = item.is_unknown || resUpper === "UNKNOWN" || !item.user_id || (item.user_name && item.user_name.includes("Người lạ"));
          const conf = item.confidence != null ? Number(item.confidence) : (isGranted ? 96.8 : 41.3);
          const timePart = item.time || (item.timestamp ? item.timestamp.split("T")[1]?.slice(0, 8) : "00:00:00");
          const datePart = item.date || (item.timestamp ? item.timestamp.split("T")[0] : "23/09/2026");
          const name = item.user_name || (isUnknown ? "Người lạ (Unknown)" : "Nhân viên");

          return {
            id: item.id,
            logNumber: item.log_number || ((currentPage - 1) * pageSize + idx + 1),
            time: timePart,
            date: datePart,
            fullTimestamp: item.full_timestamp || `${timePart} - ${datePart}`,
            userName: name,
            userCode: item.employee_id || (isUnknown ? "--" : "NV-00"),
            department: item.department || (isUnknown ? "Không xác định" : "Khối Kỹ thuật"),
            jobTitle: isUnknown ? "Khách vãng lai" : "Cán bộ / Nhân viên",
            cardType: isUnknown ? "Không có thẻ" : "Smart Face ID v2",
            cameraName: item.camera_name || "Camera",
            doorName: item.door_name || "Cửa chính",
            cameraResolution: "CAM (1080p @ 30fps)",
            confidence: conf,
            result: isGranted ? "GRANTED" : isUnknown ? "UNKNOWN" : (resUpper === "LOW CONF" ? "LOW CONF" : "DENIED"),
            livePhoto: item.live_photo_url || item.snapshot_url || "",
            initials: isUnknown ? "?" : name.split(" ").map((n: string) => n[0]).slice(-2).join(""),
            initialsBg: isGranted ? "linear-gradient(135deg, #00D4AA, #0284C7)" : "linear-gradient(135deg, #EF4444, #991B1B)",
            cosineScore: item.cosine_score != null ? Number(item.cosine_score) : Number((conf / 100).toFixed(3)),
            faceDistance: item.face_distance != null ? Number(item.face_distance) : Number(((100 - conf) / 100 * 0.5).toFixed(2)),
            livenessPassed: item.liveness_passed !== false,
            livenessScore: item.liveness_score != null ? Number(item.liveness_score) : 98.5,
            latencyMs: item.latency_ms || 38,
            aiModel: item.ai_model || "Dlib ResNet-34 (512D)",
            relayStatus: item.relay_status || (isGranted ? "Mở tự động (Relay 01)" : "Khóa cưỡng bức (Không mở)"),
            eventTimeline: [
              { time: `${timePart}.100`, text: "Phát hiện khuôn mặt (OpenCV HOG)", status: "info" },
              { time: `${timePart}.128`, text: "Trích xuất 68 landmarks & 512-D vector", status: "info" },
              { time: `${timePart}.148`, text: `Khớp CSDL: ${name} [Độ tin cậy: ${conf}%]`, status: isGranted ? "success" : "warn" },
              { time: `${timePart}.165`, text: `Quyết định: ${isGranted ? "ACCESS GRANTED" : "ACCESS DENIED"}`, status: isGranted ? "success" : "error" },
            ],
            isUnknown,
            isMasked: item.is_masked,
          };
        });
        setLogs(mapped);
        setTotalCount(res.total ?? mapped.length);
        if (mapped.length > 0) {
          if (!mapped.some(m => m.id === selectedLogId)) {
            setSelectedLogId(mapped[0].id);
          }
        } else {
          setSelectedLogId("");
        }
      }
    } catch (err) {
      console.error("Error loading access logs from DB:", err);
    }
  }, [searchQuery, resultFilter, camFilter, doorFilter, currentPage, pageSize, selectedLogId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active record
  const activeRecord = useMemo(() => {
    return logs.find((r) => r.id === selectedLogId) || logs[0] || null;
  }, [logs, selectedLogId]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          log.userName.toLowerCase().includes(q) ||
          log.userCode.toLowerCase().includes(q) ||
          log.department.toLowerCase().includes(q) ||
          log.cameraName.toLowerCase().includes(q) ||
          log.doorName.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Result filter
      if (resultFilter !== "all") {
        if (resultFilter === "GRANTED" && log.result !== "GRANTED") return false;
        if (resultFilter === "DENIED" && log.result !== "DENIED") return false;
        if (resultFilter === "LOW_CONF" && log.result !== "LOW CONF") return false;
        if (resultFilter === "UNKNOWN" && log.result !== "UNKNOWN") return false;
      }

      // Cam filter
      if (camFilter !== "all" && !log.cameraName.includes(camFilter)) return false;

      // Confidence filter
      if (confFilter === "high" && log.confidence < 90) return false;
      if (confFilter === "med" && (log.confidence < 70 || log.confidence >= 90)) return false;
      if (confFilter === "low" && log.confidence >= 70) return false;

      return true;
    });
  }, [logs, searchQuery, resultFilter, camFilter, confFilter]);

  // Handle Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // Handle Select All Checkbox
  const handleToggleSelectAll = () => {
    if (selectedRowIds.length === filteredLogs.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredLogs.map((l) => l.id));
    }
  };

  // Handle Single Checkbox
  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Handle row click
  const handleRowClick = (record: AuditLogRecord) => {
    setSelectedLogId(record.id);
    setShowDetailPanel(true);
  };

  // Handle Export Download from real DB
  const handleDownloadReport = () => {
    setIsExporting(true);
    const exportUrl = api.accessLogs.getExportUrl({
      status: resultFilter !== "all" ? (resultFilter as any) : undefined,
    });
    window.open(exportUrl, "_blank");
    setTimeout(() => {
      setIsExporting(false);
      setShowExportModal(false);
    }, 800);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#080C14", color: "#F1F5F9" }}>
      {/* ── 1. GLOBAL SIDEBAR (PRESERVED) ── */}
      <Sidebar />

      {/* ── 2. MAIN CONTENT AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowX: "hidden" }}>
        {/* Global TopBar (Preserved) */}
        <TopBar />

        {/* Inner Content Container */}
        <div style={{ padding: "24px 28px 48px", maxWidth: 1800, margin: "0 auto", width: "100%" }}>
          {/* ───────────────────────────────────────────────────────────── */}
          {/* HEADER: TITLE + TELEMETRY + ACTION BUTTONS                     */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 22,
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: "0.02em",
                    color: "#FFFFFF",
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  LỊCH SỬ RA VÀO &amp; KIỂM TOÁN AN NINH
                </h1>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#38BDF8",
                    background: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                    padding: "3px 9px",
                    borderRadius: 20,
                    letterSpacing: "0.04em",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#38BDF8",
                      boxShadow: "0 0 8px #38BDF8",
                      animation: "pulse 2s infinite",
                    }}
                  />
                  REAL-TIME AUDIT
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#94A3B8" }}>
                Theo dõi, tra cứu và kiểm soát toàn bộ lịch sử nhận diện khuôn mặt và truy cập hệ thống theo thời gian thực.
              </p>
            </div>

            {/* Action buttons on top right */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={handleRefresh}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#E2E8F0",
                  padding: "9px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0, 212, 170, 0.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)")}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: isRefreshing ? "rotate(360deg)" : "rotate(0deg)",
                    transition: "transform 0.6s ease",
                  }}
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                Làm mới
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "linear-gradient(135deg, #0284C7 0%, #00D4AA 100%)",
                  border: "none",
                  color: "#080C14",
                  padding: "9px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0, 212, 170, 0.25)",
                  transition: "transform 0.15s ease",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Xuất báo cáo ▾
              </button>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 5 TOP METRIC KPI CARDS                                         */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 14,
              marginBottom: 20,
            }}
          >
            {/* Card 1: Tổng lượt truy cập */}
            <div
              style={{
                background: "rgba(13, 19, 33, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                borderRadius: 14,
                padding: "16px 18px",
                backdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.04em" }}>
                  TỔNG LƯỢT TRUY CẬP
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(56, 189, 248, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#38BDF8",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <line x1="7" y1="8" x2="17" y2="8" />
                    <line x1="7" y1="12" x2="13" y2="12" />
                  </svg>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
                  {kpi.total.toLocaleString("vi-VN")}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#10B981",
                    background: "rgba(16, 185, 129, 0.15)",
                    padding: "2px 7px",
                    borderRadius: 12,
                  }}
                >
                  CSDL THẬT
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Hôm nay tại tất cả các cửa</div>
            </div>

            {/* Card 2: Access Granted */}
            <div
              style={{
                background: "rgba(13, 19, 33, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                borderRadius: 14,
                padding: "16px 18px",
                backdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.04em" }}>
                  ACCESS GRANTED
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(16, 185, 129, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#10B981",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
                  {kpi.granted.toLocaleString("vi-VN")}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#10B981",
                    background: "rgba(16, 185, 129, 0.15)",
                    padding: "2px 7px",
                    borderRadius: 12,
                  }}
                >
                  {kpi.total > 0 ? `${((kpi.granted / kpi.total) * 100).toFixed(1)}%` : "0%"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Cấp quyền mở cửa thành công</div>
            </div>

            {/* Card 3: Access Denied */}
            <div
              style={{
                background: "rgba(13, 19, 33, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                borderRadius: 14,
                padding: "16px 18px",
                backdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.04em" }}>
                  ACCESS DENIED
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(239, 68, 68, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#EF4444",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#EF4444", letterSpacing: "-0.02em" }}>
                  {kpi.denied.toLocaleString("vi-VN")}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#EF4444",
                    background: "rgba(239, 68, 68, 0.15)",
                    padding: "2px 7px",
                    borderRadius: 12,
                  }}
                >
                  {kpi.total > 0 ? `${((kpi.denied / kpi.total) * 100).toFixed(1)}%` : "0%"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Bị từ chối và cảnh báo</div>
            </div>

            {/* Card 4: Unknown Person */}
            <div
              style={{
                background: "rgba(13, 19, 33, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                borderRadius: 14,
                padding: "16px 18px",
                backdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.04em" }}>
                  UNKNOWN PERSON
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(245, 158, 11, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#F59E0B",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#F59E0B", letterSpacing: "-0.02em" }}>
                  {kpi.unknown.toLocaleString("vi-VN")}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#F59E0B",
                    background: "rgba(245, 158, 11, 0.15)",
                    padding: "2px 7px",
                    borderRadius: 12,
                  }}
                >
                  +5 hôm nay
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Khuôn mặt chưa định danh</div>
            </div>

            {/* Card 5: Nhận diện hôm nay */}
            <div
              style={{
                background: "rgba(13, 19, 33, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                borderRadius: 14,
                padding: "16px 18px",
                backdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.04em" }}>
                  NHẬN DIỆN HÔM NAY
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(16, 185, 129, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#10B981",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
                  1,284
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#10B981",
                    background: "rgba(16, 185, 129, 0.15)",
                    padding: "2px 7px",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981" }} />
                  LIVE
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Cập nhật: Vừa xong (10:45:22)</div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MIDDLE SECTION: ACCESS TREND SVG + SECURITY EVENTS AUDIT      */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.8fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            {/* Left: XU HƯỚNG TRUY CẬP (ACCESS TREND) */}
            <div
              style={{
                background: "rgba(13, 19, 33, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: "18px 22px 14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {/* Trend Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#F1F5F9", letterSpacing: "0.05em" }}>
                    XU HƯỚNG TRUY CẬP (ACCESS TREND)
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 11, fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D4AA" }} />
                    <span style={{ color: "#94A3B8" }}>Granted (1,192)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
                    <span style={{ color: "#94A3B8" }}>Denied (92)</span>
                  </div>
                  <div
                    style={{
                      background: "rgba(56, 189, 248, 0.12)",
                      color: "#38BDF8",
                      padding: "2px 8px",
                      borderRadius: 6,
                      border: "1px solid rgba(56, 189, 248, 0.25)",
                    }}
                  >
                    Peak: 08:00 - 09:00 (312 lượt)
                  </div>
                </div>
              </div>

              {/* Trend SVG Chart */}
              <div style={{ width: "100%", height: 130, position: "relative" }}>
                <svg width="100%" height="100%" viewBox="0 0 700 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="grantedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#00D4AA" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="deniedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal gridlines */}
                  <line x1="0" y1="20" x2="700" y2="20" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <line x1="0" y1="60" x2="700" y2="60" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <line x1="0" y1="100" x2="700" y2="100" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />

                  {/* Vertical Peak Line at x=175 (08:00) */}
                  <line x1="175" y1="10" x2="175" y2="110" stroke="rgba(56, 189, 248, 0.4)" strokeDasharray="2 2" />

                  {/* Granted Area & Line (Peak at x=175, y=20) */}
                  <path
                    d="M 0,95 Q 85,90 140,45 T 175,18 T 230,48 T 350,65 T 450,48 T 560,78 T 700,95 L 700,115 L 0,115 Z"
                    fill="url(#grantedGrad)"
                  />
                  <path
                    d="M 0,95 Q 85,90 140,45 T 175,18 T 230,48 T 350,65 T 450,48 T 560,78 T 700,95"
                    fill="none"
                    stroke="#00D4AA"
                    strokeWidth="2.5"
                  />

                  {/* Denied Line */}
                  <path
                    d="M 0,105 Q 85,102 140,96 T 175,88 T 230,95 T 350,92 T 450,96 T 560,100 T 700,105 L 700,115 L 0,115 Z"
                    fill="url(#deniedGrad)"
                  />
                  <path
                    d="M 0,105 Q 85,102 140,96 T 175,88 T 230,95 T 350,92 T 450,96 T 560,100 T 700,105"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="1.8"
                  />

                  {/* Peak Marker Dot */}
                  <circle cx="175" cy="18" r="5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="2" />
                </svg>

                {/* X Axis Time Labels */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#64748B",
                  }}
                >
                  <span>06:00</span>
                  <span style={{ color: "#38BDF8", fontWeight: 700 }}>08:00 (Peak)</span>
                  <span>10:00</span>
                  <span>12:00</span>
                  <span>14:00</span>
                  <span>16:00</span>
                  <span>18:00</span>
                  <span>20:00</span>
                  <span>22:00</span>
                </div>
              </div>
            </div>

            {/* Right: SECURITY EVENTS AUDIT */}
            <div
              style={{
                background: "rgba(13, 19, 33, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#F1F5F9", letterSpacing: "0.05em" }}>
                    SECURITY EVENTS AUDIT
                  </span>
                </div>
                <Link
                  href="/alerts"
                  style={{
                    fontSize: 11,
                    color: "#38BDF8",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Xem cảnh báo →
                </Link>
              </div>

              {/* 2x2 Grid of events */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {/* Event 1 */}
                <div
                  onClick={() => setResultFilter("UNKNOWN")}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)")}
                >
                  <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>Unknown Person</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#EF4444" }}>37</span>
                    <span style={{ fontSize: 11, color: "#64748B" }}>events</span>
                  </div>
                </div>

                {/* Event 2 */}
                <div
                  onClick={() => setResultFilter("DENIED")}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)")}
                >
                  <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>Access Denied</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#EF4444" }}>92</span>
                    <span style={{ fontSize: 11, color: "#64748B" }}>events</span>
                  </div>
                </div>

                {/* Event 3 */}
                <div
                  onClick={() => setResultFilter("LOW_CONF")}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245, 158, 11, 0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)")}
                >
                  <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>Low Confidence</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#F59E0B" }}>14</span>
                    <span style={{ fontSize: 11, color: "#64748B" }}>events</span>
                  </div>
                </div>

                {/* Event 4 */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(56, 189, 248, 0.2)",
                    borderRadius: 10,
                    padding: "10px 14px",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>Multi-Face Detect</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#38BDF8" }}>08</span>
                    <span style={{ fontSize: 11, color: "#64748B" }}>events</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SEARCH & MULTI-CRITERIA FILTER CONTROL BAR                     */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div
            style={{
              background: "rgba(13, 19, 33, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Search Input Row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="2"
                  style={{ position: "absolute", left: 14 }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Tìm theo tên người dùng, mã nhân viên, vị trí, camera..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(8, 12, 20, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 10,
                    padding: "10px 14px 10px 42px",
                    color: "#F1F5F9",
                    fontSize: 13,
                    outline: "none",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#00D4AA")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)")}
                />
              </div>

              {/* Apply Button */}
              <button
                onClick={() => {}}
                style={{
                  background: "#0284C7",
                  border: "none",
                  borderRadius: 10,
                  color: "#FFFFFF",
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Áp dụng
              </button>

              {/* Reset Filters */}
              <button
                onClick={() => {
                  setSearchQuery("");
                  setResultFilter("all");
                  setCamFilter("all");
                  setConfFilter("all");
                }}
                title="Đặt lại bộ lọc"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 10,
                  color: "#94A3B8",
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>

              {/* Advanced Filter toggle */}
              <button
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 10,
                  color: "#CBD5E1",
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  cursor: "pointer",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
                Bộ lọc nâng cao
              </button>
            </div>

            {/* Filter Dropdowns Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 10,
                paddingTop: 4,
              }}
            >
              {/* Dropdown 1: THỜI GIAN */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>
                  THỜI GIAN
                </label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(8, 12, 20, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 8,
                    padding: "7px 10px",
                    color: "#E2E8F0",
                    fontSize: 12,
                    outline: "none",
                  }}
                >
                  <option value="Hôm nay">Hôm nay</option>
                  <option value="Hôm qua">Hôm qua</option>
                  <option value="7 ngày qua">7 ngày qua</option>
                  <option value="30 ngày qua">30 ngày qua</option>
                </select>
              </div>

              {/* Dropdown 2: NGƯỜI DÙNG */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>
                  NGƯỜI DÙNG
                </label>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(8, 12, 20, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 8,
                    padding: "7px 10px",
                    color: "#E2E8F0",
                    fontSize: 12,
                    outline: "none",
                  }}
                >
                  <option value="all">Tất cả người dùng</option>
                  <option value="emp">Nhân viên đã đăng ký</option>
                  <option value="unknown">Khách / Người lạ</option>
                </select>
              </div>

              {/* Dropdown 3: CAMERA */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>
                  CAMERA
                </label>
                <select
                  value={camFilter}
                  onChange={(e) => setCamFilter(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(8, 12, 20, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 8,
                    padding: "7px 10px",
                    color: "#E2E8F0",
                    fontSize: 12,
                    outline: "none",
                  }}
                >
                  <option value="all">Tất cả Camera (4/4)</option>
                  <option value="Cam 01">Cam 01 - Cửa chính</option>
                  <option value="Cam 02">Cam 02 - Cửa phụ</option>
                  <option value="Cam 03">Cam 03 - Thang máy</option>
                  <option value="Cam 04">Cam 04 - Sảnh</option>
                </select>
              </div>

              {/* Dropdown 4: CỬA KIỂM SOÁT */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>
                  CỬA KIỂM SOÁT
                </label>
                <select
                  value={doorFilter}
                  onChange={(e) => setDoorFilter(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(8, 12, 20, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 8,
                    padding: "7px 10px",
                    color: "#E2E8F0",
                    fontSize: 12,
                    outline: "none",
                  }}
                >
                  <option value="all">Tất cả các cửa (Lobby 01, 02)</option>
                  <option value="lobby">Cửa chính Lobby</option>
                  <option value="kho">Cửa phụ Kho</option>
                  <option value="vip">Thang máy VIP</option>
                </select>
              </div>

              {/* Dropdown 5: KẾT QUẢ */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>
                  KẾT QUẢ
                </label>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(8, 12, 20, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 8,
                    padding: "7px 10px",
                    color: "#E2E8F0",
                    fontSize: 12,
                    outline: "none",
                  }}
                >
                  <option value="all">Tất cả kết quả</option>
                  <option value="GRANTED">Granted (Hợp lệ)</option>
                  <option value="DENIED">Denied (Từ chối)</option>
                  <option value="LOW_CONF">Low Confidence</option>
                  <option value="UNKNOWN">Unknown Person</option>
                </select>
              </div>

              {/* Dropdown 6: ĐỘ TIN CẬY */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>
                  ĐỘ TIN CẬY
                </label>
                <select
                  value={confFilter}
                  onChange={(e) => setConfFilter(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(8, 12, 20, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 8,
                    padding: "7px 10px",
                    color: "#E2E8F0",
                    fontSize: 12,
                    outline: "none",
                  }}
                >
                  <option value="all">Tất cả ngưỡng</option>
                  <option value="high">&gt;= 90% (Cao)</option>
                  <option value="med">70% - 89% (Trung bình)</option>
                  <option value="low">&lt; 70% (Thấp)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MAIN 2-COLUMN VIEW: LEFT TABLE & RIGHT AUDIT DETAIL PANEL      */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: showDetailPanel ? "1.8fr 1.05fr" : "1fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            {/* ── LEFT COLUMN: NHẬT KÝ KIỂM SOÁT RA VÀO (ACCESS AUDIT LOGS) ── */}
            <div
              style={{
                background: "rgba(13, 19, 33, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Table Top Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.04em" }}>
                    NHẬT KÝ KIỂM SOÁT RA VÀO (ACCESS AUDIT LOGS)
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#64748B",
                    }}
                  >
                    1,284 bản ghi
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 8,
                      color: "#94A3B8",
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                    Cột hiển thị
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div style={{ overflowX: "auto", width: "100%" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px" }}>
                  <thead>
                    <tr style={{ color: "#64748B", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <th style={{ padding: "8px 10px", textAlign: "center", width: 36 }}>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.length === filteredLogs.length && filteredLogs.length > 0}
                          onChange={handleToggleSelectAll}
                          style={{ cursor: "pointer", accentColor: "#00D4AA" }}
                        />
                      </th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>THỜI GIAN</th>
                      <th style={{ padding: "8px 12px", textAlign: "center" }}>FACE SNAPSHOT</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>NGƯỜI DÙNG &amp; PHÒNG BAN</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>MÃ NV</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>CAMERA &amp; CỬA</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>CONFIDENCE</th>
                      <th style={{ padding: "8px 12px", textAlign: "center" }}>KẾT QUẢ</th>
                      <th style={{ padding: "8px 12px", textAlign: "center" }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const isSelected = selectedLogId === log.id;
                      const isChecked = selectedRowIds.includes(log.id);

                      return (
                        <tr
                          key={log.id}
                          onClick={() => handleRowClick(log)}
                          style={{
                            background: isSelected
                              ? "rgba(0, 212, 170, 0.07)"
                              : "rgba(255, 255, 255, 0.02)",
                            border: isSelected
                              ? "1px solid rgba(0, 212, 170, 0.4)"
                              : "1px solid rgba(255, 255, 255, 0.04)",
                            borderRadius: 10,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {/* Checkbox */}
                          <td
                            style={{
                              padding: "10px",
                              textAlign: "center",
                              borderTopLeftRadius: 10,
                              borderBottomLeftRadius: 10,
                            }}
                            onClick={(e) => handleToggleSelectRow(log.id, e)}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              style={{ cursor: "pointer", accentColor: "#00D4AA" }}
                            />
                          </td>

                          {/* Time */}
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", fontFamily: "monospace" }}>
                              {log.time}
                            </div>
                            <div style={{ fontSize: 10, color: "#64748B" }}>{log.date}</div>
                          </td>

                          {/* Face Snapshot */}
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                              {log.livePhoto ? (
                                <div
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    border: isSelected ? "2px solid #00D4AA" : "1px solid rgba(255,255,255,0.15)",
                                    position: "relative",
                                  }}
                                >
                                  <Image
                                    src={log.livePhoto}
                                    alt={log.userName}
                                    fill
                                    sizes="36px"
                                    style={{ objectFit: "cover" }}
                                  />
                                </div>
                              ) : (
                                <div
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    background: log.initialsBg || "rgba(255,255,255,0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "#FFFFFF",
                                    border: isSelected ? "2px solid #00D4AA" : "1px solid rgba(255,255,255,0.15)",
                                  }}
                                >
                                  {log.initials || "NV"}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* User & Dept */}
                          <td style={{ padding: "10px 12px" }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: log.isUnknown ? "#EF4444" : "#FFFFFF",
                              }}
                            >
                              {log.userName}
                            </div>
                            <div style={{ fontSize: 11, color: log.isUnknown ? "#94A3B8" : "#64748B" }}>
                              {log.department}
                            </div>
                          </td>

                          {/* Employee Code */}
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                            {log.userCode !== "--" ? (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#38BDF8",
                                  background: "rgba(56, 189, 248, 0.1)",
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  border: "1px solid rgba(56, 189, 248, 0.2)",
                                }}
                              >
                                {log.userCode}
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: "#64748B" }}>--</span>
                            )}
                          </td>

                          {/* Camera & Door */}
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>
                              {log.cameraName}
                            </div>
                            <div style={{ fontSize: 10, color: "#64748B" }}>{log.doorName}</div>
                          </td>

                          {/* Confidence */}
                          <td style={{ padding: "10px 12px", minWidth: 120 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color:
                                    log.confidence >= 90
                                      ? "#00D4AA"
                                      : log.confidence >= 60
                                      ? "#F59E0B"
                                      : "#EF4444",
                                  minWidth: 42,
                                }}
                              >
                                {log.confidence}%
                              </span>
                              <div
                                style={{
                                  flex: 1,
                                  height: 4,
                                  background: "rgba(255, 255, 255, 0.08)",
                                  borderRadius: 3,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${log.confidence}%`,
                                    background:
                                      log.confidence >= 90
                                        ? "#00D4AA"
                                        : log.confidence >= 60
                                        ? "#F59E0B"
                                        : "#EF4444",
                                    borderRadius: 3,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Result Badge */}
                          <td style={{ padding: "10px 12px", textAlign: "center", whiteSpace: "nowrap" }}>
                            {log.result === "GRANTED" && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#10B981",
                                  background: "rgba(16, 185, 129, 0.12)",
                                  border: "1px solid rgba(16, 185, 129, 0.25)",
                                  padding: "3px 9px",
                                  borderRadius: 14,
                                }}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                GRANTED
                              </span>
                            )}
                            {log.result === "DENIED" && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#EF4444",
                                  background: "rgba(239, 68, 68, 0.12)",
                                  border: "1px solid rgba(239, 68, 68, 0.25)",
                                  padding: "3px 9px",
                                  borderRadius: 14,
                                }}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                DENIED
                              </span>
                            )}
                            {log.result === "LOW CONF" && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#F59E0B",
                                  background: "rgba(245, 158, 11, 0.12)",
                                  border: "1px solid rgba(245, 158, 11, 0.25)",
                                  padding: "3px 9px",
                                  borderRadius: 14,
                                }}
                              >
                                ⚠ LOW CONF
                              </span>
                            )}
                            {log.result === "UNKNOWN" && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#EF4444",
                                  background: "rgba(239, 68, 68, 0.15)",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                  padding: "3px 9px",
                                  borderRadius: 14,
                                }}
                              >
                                ⛔ UNKNOWN
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "center",
                              borderTopRightRadius: 10,
                              borderBottomRightRadius: 10,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {log.result === "GRANTED" ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(log);
                                }}
                                style={{
                                  background: "rgba(2, 132, 199, 0.15)",
                                  border: "1px solid rgba(2, 132, 199, 0.35)",
                                  color: "#38BDF8",
                                  borderRadius: 6,
                                  padding: "4px 10px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Chi tiết
                              </button>
                            ) : log.result === "DENIED" || log.result === "UNKNOWN" ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(log);
                                }}
                                style={{
                                  background: "rgba(239, 68, 68, 0.15)",
                                  border: "1px solid rgba(239, 68, 68, 0.35)",
                                  color: "#EF4444",
                                  borderRadius: 6,
                                  padding: "4px 10px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Đối soát
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(log);
                                }}
                                style={{
                                  background: "rgba(245, 158, 11, 0.15)",
                                  border: "1px solid rgba(245, 158, 11, 0.35)",
                                  color: "#F59E0B",
                                  borderRadius: 6,
                                  padding: "4px 10px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Kiểm tra
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer & Pagination */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#64748B" }}>
                  <span>Hiển thị 1 - 20 trong tổng số 1,284 bản ghi</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    style={{
                      background: "rgba(8, 12, 20, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 6,
                      padding: "4px 8px",
                      color: "#94A3B8",
                      fontSize: 11,
                      outline: "none",
                    }}
                  >
                    <option value={10}>10 / trang</option>
                    <option value={20}>20 / trang</option>
                    <option value={50}>50 / trang</option>
                  </select>
                </div>

                {/* Pagination Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 6,
                      color: "#94A3B8",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    ‹
                  </button>
                  {[1, 2, 3, 4].map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        background: currentPage === page ? "#0284C7" : "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 6,
                        color: currentPage === page ? "#FFFFFF" : "#94A3B8",
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {page}
                    </button>
                  ))}
                  <span style={{ color: "#64748B", fontSize: 11 }}>...</span>
                  <button
                    onClick={() => setCurrentPage(64)}
                    style={{
                      background: currentPage === 64 ? "#0284C7" : "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 6,
                      color: "#94A3B8",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    64
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 6,
                      color: "#94A3B8",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Bottom Security Compliance Banner */}
              <div
                style={{
                  marginTop: 6,
                  padding: "12px 16px",
                  background: "rgba(16, 185, 129, 0.04)",
                  border: "1px solid rgba(16, 185, 129, 0.15)",
                  borderRadius: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#94A3B8" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  <span>
                    Dữ liệu kiểm toán sinh trắc học được lưu trữ bảo mật 365 ngày theo tiêu chuẩn ISO/IEC 27001 &amp; Nghị định 13/2023/NĐ-CP.
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>Audit Hash:</span>
                  <span style={{ color: "#00D4AA", fontFamily: "monospace", fontWeight: 700 }}>
                    SHA-256 Verified
                  </span>
                  <span>•</span>
                  <span style={{ color: "#10B981" }}>Encrypted Storage</span>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: CHI TIẾT SỰ KIỆN KIỂM TOÁN (AUDIT DETAIL) ── */}
            {showDetailPanel && (
              <div
                style={{
                  background: "rgba(13, 19, 33, 0.85)",
                  border: "1px solid rgba(255, 255, 255, 0.09)",
                  borderRadius: 16,
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                {!activeRecord ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748B" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8" }}>Chưa chọn bản ghi sự kiện</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Chọn một hàng trong danh sách để xem chi tiết kiểm toán</div>
                  </div>
                ) : (
                  <>
                {/* Detail Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "rgba(0, 212, 170, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#00D4AA",
                      }}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.04em" }}>
                        CHI TIẾT SỰ KIỆN KIỂM TOÁN
                      </div>
                      <div style={{ fontSize: 10, color: "#64748B", fontFamily: "monospace" }}>
                        EVT - 2026 - {activeRecord.logNumber}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: activeRecord.result === "GRANTED" ? "#10B981" : "#EF4444",
                        background:
                          activeRecord.result === "GRANTED"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(239, 68, 68, 0.15)",
                        padding: "3px 9px",
                        borderRadius: 12,
                      }}
                    >
                      {activeRecord.result}
                    </span>
                    <button
                      onClick={() => setShowDetailPanel(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#64748B",
                        cursor: "pointer",
                        fontSize: 16,
                        padding: 4,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* SECTION 1: BẰNG CHỨNG HÌNH ẢNH (AI SNAPSHOT & MASTER DB) */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase" }}>
                    BẰNG CHỨNG HÌNH ẢNH (AI SNAPSHOT &amp; MASTER DB)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {/* Live Capture Image */}
                    <div
                      style={{
                        background: "#060A10",
                        border: "1px solid rgba(0, 212, 170, 0.4)",
                        borderRadius: 10,
                        overflow: "hidden",
                        position: "relative",
                        aspectRatio: "1/1",
                      }}
                    >
                      {activeRecord.livePhoto ? (
                        <Image
                          src={activeRecord.livePhoto}
                          alt="Live Capture"
                          fill
                          sizes="200px"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: activeRecord.initialsBg || "#1E293B",
                            fontSize: 32,
                            fontWeight: 800,
                          }}
                        >
                          {activeRecord.initials}
                        </div>
                      )}

                      {/* Live HUD Overlay */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          border: "1px solid rgba(0, 212, 170, 0.5)",
                          pointerEvents: "none",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            bottom: 6,
                            left: 6,
                            background: "rgba(0, 0, 0, 0.75)",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 9,
                            color: "#00D4AA",
                            fontFamily: "monospace",
                            fontWeight: 700,
                          }}
                        >
                          Live Capture
                        </div>
                      </div>
                    </div>

                    {/* Master Profile Image */}
                    <div
                      style={{
                        background: "#060A10",
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        borderRadius: 10,
                        overflow: "hidden",
                        position: "relative",
                        aspectRatio: "1/1",
                      }}
                    >
                      {activeRecord.masterPhoto ? (
                        <Image
                          src={activeRecord.masterPhoto}
                          alt="Master Profile"
                          fill
                          sizes="200px"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(255,255,255,0.03)",
                            color: "#64748B",
                            gap: 6,
                            padding: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              background: activeRecord.initialsBg || "rgba(255,255,255,0.1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 15,
                              fontWeight: 800,
                              color: "#FFFFFF",
                              boxShadow: "0 0 12px rgba(0,0,0,0.4)",
                            }}
                          >
                            {activeRecord.initials || "ID"}
                          </div>
                          <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700 }}>
                            {activeRecord.userName}
                          </span>
                        </div>
                      )}

                      {/* Master HUD Overlay */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          border: "1px solid rgba(56, 189, 248, 0.5)",
                          pointerEvents: "none",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            bottom: 6,
                            right: 6,
                            background: "rgba(0, 0, 0, 0.75)",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 9,
                            color: "#38BDF8",
                            fontFamily: "monospace",
                            fontWeight: 700,
                          }}
                        >
                          Master Profile
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Similarity Metrics Row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 8,
                      padding: "6px 10px",
                      background: "rgba(255, 255, 255, 0.03)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: "#94A3B8" }}>Độ tương đồng (Cosine Match):</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: activeRecord.confidence >= 90 ? "#00D4AA" : "#EF4444",
                        }}
                      >
                        {activeRecord.confidence}%
                      </span>
                      <span style={{ color: "#64748B", fontSize: 10, fontFamily: "monospace" }}>
                        [Khoảng cách: {activeRecord.faceDistance || 0.18}]
                      </span>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: ĐỊNH DANH NHÂN SỰ & THẺ */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase" }}>
                    ĐỊNH DANH NHÂN SỰ &amp; THẺ
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Họ và tên:</span>
                      <span style={{ fontWeight: 700, color: "#FFFFFF" }}>{activeRecord.userName}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Mã nhân viên:</span>
                      <span style={{ fontWeight: 700, color: "#38BDF8", fontFamily: "monospace" }}>
                        {activeRecord.userCode}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Phòng ban:</span>
                      <span style={{ color: "#E2E8F0" }}>{activeRecord.department}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Chức danh:</span>
                      <span style={{ color: "#CBD5E1" }}>{activeRecord.jobTitle || "Kỹ sư AI cao cấp"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Thẻ truy cập:</span>
                      <span style={{ color: "#00D4AA", fontWeight: 600 }}>{activeRecord.cardType || "Smart Face ID v2"}</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: THÔNG SỐ KIỂM SOÁT CỬA */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase" }}>
                    THÔNG SỐ KIỂM SOÁT CỬA
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Điểm kiểm soát:</span>
                      <span style={{ fontWeight: 600, color: "#E2E8F0" }}>{activeRecord.doorName}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Camera:</span>
                      <span style={{ color: "#E2E8F0" }}>{activeRecord.cameraResolution || activeRecord.cameraName}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Thời gian:</span>
                      <span style={{ color: "#E2E8F0", fontFamily: "monospace" }}>{activeRecord.fullTimestamp}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#64748B" }}>Trạng thái cửa:</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: activeRecord.result === "GRANTED" ? "#10B981" : "#EF4444",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {activeRecord.result === "GRANTED" ? "🔓" : "🔒"} {activeRecord.relayStatus || "Mở tự động (Relay 01)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: AI PIPELINE & ANTI-SPOOFING */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase" }}>
                    AI PIPELINE &amp; ANTI-SPOOFING
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Mô hình:</span>
                      <span style={{ color: "#E2E8F0", fontFamily: "monospace" }}>{activeRecord.aiModel || "Dlib ResNet-34 (512D)"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Liveness Detection:</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: activeRecord.livenessPassed !== false ? "#10B981" : "#EF4444",
                        }}
                      >
                        {activeRecord.livenessPassed !== false ? `PASSED (${activeRecord.livenessScore || 99.4}%)` : "FAILED (Phát hiện giả mạo)"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Độ trễ xử lý (Latency):</span>
                      <span style={{ color: "#00D4AA", fontWeight: 700, fontFamily: "monospace" }}>
                        {activeRecord.latencyMs || 40} ms
                      </span>
                    </div>
                  </div>
                </div>

                {/* SECTION 5: CHUỖI SỰ KIỆN KIỂM TOÁN (AUDIT TIMELINE) */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase" }}>
                    CHUỖI SỰ KIỆN KIỂM TOÁN (AUDIT TIMELINE)
                  </div>
                  <div
                    style={{
                      background: "#060A10",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      fontFamily: "monospace",
                      fontSize: 10,
                    }}
                  >
                    {activeRecord.eventTimeline?.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            marginTop: 4,
                            background:
                              item.status === "success"
                                ? "#10B981"
                                : item.status === "error"
                                ? "#EF4444"
                                : item.status === "warn"
                                ? "#F59E0B"
                                : "#38BDF8",
                          }}
                        />
                        <span style={{ color: "#64748B", whiteSpace: "nowrap" }}>{item.time} -</span>
                        <span
                          style={{
                            color:
                              item.status === "success"
                                ? "#10B981"
                                : item.status === "error"
                                ? "#EF4444"
                                : item.status === "warn"
                                ? "#F59E0B"
                                : "#CBD5E1",
                          }}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION 6: ACTION BUTTONS */}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <Link
                    href="/users"
                    style={{
                      flex: 1,
                      background: "linear-gradient(135deg, #0284C7 0%, #00D4AA 100%)",
                      border: "none",
                      borderRadius: 8,
                      color: "#080C14",
                      padding: "9px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      textDecoration: "none",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Hồ sơ nhân viên
                  </Link>

                  <Link
                    href="/cameras"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 8,
                      color: "#E2E8F0",
                      padding: "9px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      textDecoration: "none",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="15" height="10" rx="2" />
                      <polyline points="17 11 21 7 21 17 17 13" />
                    </svg>
                    Camera
                  </Link>

                  <button
                    onClick={() => toast.info(`Đang xuất dữ liệu kiểm toán chi tiết nhật ký #${activeRecord.logNumber}...`, "XUẤT DỮ LIỆU LOG")}
                    title="Tải snapshot & log"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 8,
                      color: "#94A3B8",
                      width: 36,
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FLOATING TOAST NOTIFICATION (BOTTOM RIGHT)                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 900,
            background: "rgba(13, 19, 33, 0.95)",
            border: "1px solid rgba(0, 212, 170, 0.35)",
            borderRadius: 12,
            padding: "12px 18px",
            boxShadow: "0 16px 36px rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            animation: "slideInRight 0.3s ease",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(0, 212, 170, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#00D4AA",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#FFFFFF" }}>
              Ghi nhận kiểm toán: Log #1284
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>
              Nguyễn Văn An • Flap Barrier Cửa chính
            </div>
          </div>
          <button
            onClick={() => setShowToast(false)}
            style={{
              background: "none",
              border: "none",
              color: "#64748B",
              cursor: "pointer",
              fontSize: 14,
              padding: 4,
              marginLeft: 6,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* EXPORT REPORT MODAL                                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showExportModal && (
        <div
          onClick={() => setShowExportModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0D1321",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 18,
              width: 520,
              padding: 24,
              boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#FFFFFF" }}>
                Xuất Báo Cáo Kiểm Toán An Ninh
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748B",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Format choice */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 8 }}>
                ĐỊNH DẠNG XUẤT BÁO CÁO
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { id: "xlsx", label: "Excel (.xlsx)", icon: "📊" },
                  { id: "csv", label: "CSV (.csv)", icon: "📑" },
                  { id: "pdf", label: "PDF Report", icon: "📕" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setExportFormat(fmt.id as any)}
                    style={{
                      background: exportFormat === fmt.id ? "rgba(0, 212, 170, 0.12)" : "rgba(255, 255, 255, 0.04)",
                      border: exportFormat === fmt.id ? "1px solid #00D4AA" : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 10,
                      padding: "12px",
                      color: exportFormat === fmt.id ? "#00D4AA" : "#CBD5E1",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{fmt.icon}</span>
                    <span>{fmt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#E2E8F0", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "#00D4AA" }} />
                <span>Kèm hình ảnh Face Snapshot đã cắt crop</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#E2E8F0", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "#00D4AA" }} />
                <span>Bao gồm chuỗi băm xác thực SHA-256 (Compliance Audit)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#E2E8F0", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "#00D4AA" }} />
                <span>Dữ liệu đo đạc chỉ số Liveness &amp; Độ trễ nhận diện</span>
              </label>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 8,
                  color: "#94A3B8",
                  padding: "9px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleDownloadReport}
                disabled={isExporting}
                style={{
                  background: "linear-gradient(135deg, #0284C7 0%, #00D4AA 100%)",
                  border: "none",
                  borderRadius: 8,
                  color: "#080C14",
                  padding: "9px 22px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isExporting ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {isExporting ? "Đang xử lý..." : "Tải xuống ngay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
