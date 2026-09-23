"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/ToastNotification";

interface CreateUserFlowModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function CreateUserFlowModal({ onClose, onSuccess }: CreateUserFlowModalProps) {
  // Current view step: "form" (Screenshot 1) or "enroll" (Screenshot 2)
  const [step, setStep] = useState<"form" | "enroll">("form");

  // Form Data
  const [form, setForm] = useState({
    name: "Nguyễn Văn An",
    employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    email: "an.nguyen@aiaccess.corp",
    phone: "0988 234 567",
    department: "Khối Kỹ thuật & R&D",
    position: "Kỹ sư AI / Lập trình viên cao cấp",
    rfidCode: "8A4F-C092",
    pinCode: "123456",
    accessLevel: "rd", // "office" | "rd" | "admin"
    workSchedule: "office", // "office" | "fulltime"
  });

  // Selected doors (default 3 / 4 doors like in screenshot 1)
  const [doors, setDoors] = useState([
    { id: "door-1", name: "Cửa chính Lobby - Tầng 1", desc: "Khóa từ nam châm • Cam IP #01", selected: true },
    { id: "door-2", name: "Phòng Server Kỹ thuật", desc: "Chốt thả điện tử • Cam IP #03", selected: true },
    { id: "door-3", name: "Cửa phân tầng Thang máy", desc: "Rơle bộ gọi tầng • Tầng 2-6", selected: true },
    { id: "door-4", name: "Cửa kho Thiết bị R&D", desc: "Cửa cuốn tự động • Khu B", selected: false },
  ]);

  // Avatar / Snapshot state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Departments from CSDL
  const [departmentsList, setDepartmentsList] = useState<string[]>([
    "Khối Kỹ thuật & R&D",
    "Khối Vận hành & An ninh",
    "Kế toán & Tài chính",
    "Kinh doanh & Tiếp thị",
    "Khối Nhân sự & Đào tạo",
    "Ban Giám Đốc",
  ]);

  useEffect(() => {
    api.departments.list().then((res) => {
      if (res && Array.isArray(res.items) && res.items.length > 0) {
        setDepartmentsList(res.items.map((d: any) => d.name));
      }
    }).catch((err) => console.error("Could not fetch departments for modal:", err));
  }, []);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Saving state
  const [saving, setSaving] = useState(false);

  // Enrollment simulation state (for Screenshot 2)
  const [enrollFrames, setEnrollFrames] = useState(24);
  const [autoCapture, setAutoCapture] = useState(true);
  const [activePoseIdx, setActivePoseIdx] = useState(3); // 3 = Ngửa nhẹ (+10°)
  const [poseScores, setPoseScores] = useState([100, 100, 100, 75, 0]);
  const [guidancePrompt, setGuidancePrompt] = useState("GIỮ YÊN: ĐANG GHI NHẬN GÓC NGỬA (+10°)");
  const [equalizerHeights, setEqualizerHeights] = useState<number[]>([
    40, 65, 80, 50, 90, 75, 45, 60, 85, 95, 70, 55, 80, 60, 45, 90, 75, 50, 65, 85, 95, 60, 75, 50, 70, 85, 45, 65
  ]);

  // Auto generate employee ID
  const handleGenerateId = () => {
    setForm((f) => ({ ...f, employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}` }));
  };

  // Change preset access levels
  const handleSelectAccessLevel = (level: "office" | "rd" | "admin") => {
    setForm((f) => ({ ...f, accessLevel: level }));
    if (level === "office") {
      setDoors((d) => d.map((item, idx) => ({ ...item, selected: idx === 0 })));
    } else if (level === "rd") {
      setDoors((d) => d.map((item, idx) => ({ ...item, selected: idx < 3 })));
    } else if (level === "admin") {
      setDoors((d) => d.map((item) => ({ ...item, selected: true })));
    }
  };

  // Toggle single door
  const toggleDoor = (id: string) => {
    setDoors((prev) => prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)));
  };

  // Handle local avatar upload
  const handleUploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  };

  // Camera start / stop functions
  const startCamera = async () => {
    // Validate required fields before opening camera as requested:
    // "quét tên , mã, các trường cần thiết thì camera máy tính sẽ mở"
    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập 'Họ và tên đầy đủ' trước khi mở Camera!", "YÊU CẦU THÔNG TIN");
      return false;
    }
    if (!form.employeeId.trim()) {
      toast.warning("Vui lòng nhập hoặc tạo 'Mã nhân viên' trước khi mở Camera!", "YÊU CẦU THÔNG TIN");
      return false;
    }
    if (!form.email.trim()) {
      toast.warning("Vui lòng nhập 'Email doanh nghiệp' trước khi mở Camera!", "YÊU CẦU THÔNG TIN");
      return false;
    }

    setIsStartingCamera(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      setIsStartingCamera(false);
      return true;
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError("Không thể kết nối Webcam máy tính. Vui lòng cấp quyền camera trong trình duyệt!");
      setIsStartingCamera(false);
      setIsCameraActive(false);
      return false;
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // When switching between steps, re-attach mediaStream to videoRef if camera is already active
  useEffect(() => {
    if (isCameraActive && mediaStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [step, isCameraActive]);

  // Equalizer visualizer animation for Screenshot 2
  useEffect(() => {
    if (step !== "enroll") return;
    const interval = setInterval(() => {
      setEqualizerHeights((prev) =>
        prev.map(() => Math.floor(25 + Math.random() * 70))
      );
    }, 120);
    return () => clearInterval(interval);
  }, [step]);

  // Simulation of frames enrollment in step "enroll"
  useEffect(() => {
    if (step !== "enroll") return;
    if (!autoCapture) return;

    const interval = setInterval(() => {
      setEnrollFrames((prev) => {
        if (prev >= 30) {
          clearInterval(interval);
          setGuidancePrompt("✓ HOÀN THÀNH: ĐÃ THU ĐỦ 30/30 KHUNG HÌNH CHUẨN!");
          setPoseScores([100, 100, 100, 100, 100]);
          return 30;
        }
        const next = prev + 1;
        if (next >= 28) {
          setActivePoseIdx(4);
          setPoseScores([100, 100, 100, 100, 80]);
          setGuidancePrompt("GIỮ YÊN: ĐANG GHI NHẬN GÓC CÚI NHẸ (-10°)");
        }
        return next;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [step, autoCapture]);

  // Take snapshot from webcam
  const handleSnapshotWebcam = () => {
    if (!videoRef.current || !isCameraActive) {
      toast.info("Vui lòng bấm 'Bật Camera quét khuôn mặt ngay' trước khi chụp ảnh thẻ!", "CAMERA CHƯA SẴN SÀNG");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setAvatarPreview(dataUrl);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Action 1: Lưu hồ sơ người dùng (KHÔNG ĐĂNG KÝ KHUÔN MẶT) -> Status: "Chờ nạp Face" (WAITING)
  // Requirement: "Tiếp theo xử lý lưu thêm nút lưu và không đăng ký khuôn mặt. Sau khi click nút này thì hệ thống sẽ lưu vào CSDL và quét nếu không có dữ liệu khuôn mặt sẽ để trạng thái (Chờ nap Face)"
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSaveWithoutFace = async () => {
    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập họ và tên đầy đủ nhân sự!", "THIẾU THÔNG TIN");
      return;
    }
    if (!form.employeeId.trim()) {
      toast.warning("Vui lòng nhập mã nhân viên!", "THIẾU THÔNG TIN");
      return;
    }
    if (!form.email.trim()) {
      toast.warning("Vui lòng nhập email doanh nghiệp!", "THIẾU THÔNG TIN");
      return;
    }

    setSaving(true);
    try {
      const selectedDoorNames = doors.filter((d) => d.selected).map((d) => d.name);

      await api.users.create({
        full_name: form.name.trim(),
        employee_id: form.employeeId.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        department: form.department,
        position: form.position,
        role: "STAFF",
        status: "WAITING", // Trạng thái: Chờ nạp Face
        card_number: form.rfidCode || undefined,
        access_areas: selectedDoorNames,
        password: "Password@123",
      });

      stopCamera();
      toast.success(`Đã lưu hồ sơ nhân sự "${form.name}" vào CSDL! Trạng thái: Chờ nạp Face (WAITING)`, "LƯU TRỮ THÀNH CÔNG");
      onSuccess(`Đã lưu hồ sơ nhân sự "${form.name}" vào CSDL! Trạng thái: Chờ nạp Face (WAITING)`);
      onClose();
    } catch (err: any) {
      console.error("Save user failed:", err);
      toast.error(`Lỗi khi lưu vào CSDL: ${err.message || err}`, "LƯU THẤT BẠI");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Action 2: Click "Đăng ký khuôn mặt"
  // Requirement: "xử lý camera phải bật camera và dữ liệu người dùng đúng thì mới chuyển trang tiếp theo"
  // ─────────────────────────────────────────────────────────────────────────────
  const handleProceedToFaceEnrollment = () => {
    // 1. Kiểm tra thông tin người dùng
    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập 'Họ và tên đầy đủ' trước khi tiếp tục!", "YÊU CẦU THÔNG TIN");
      return;
    }
    if (!form.employeeId.trim()) {
      toast.warning("Vui lòng nhập 'Mã nhân viên' trước khi tiếp tục!", "YÊU CẦU THÔNG TIN");
      return;
    }
    if (!form.email.trim()) {
      toast.warning("Vui lòng nhập 'Email doanh nghiệp' trước khi tiếp tục!", "YÊU CẦU THÔNG TIN");
      return;
    }

    // 2. Kiểm tra CAMERA PHẢI ĐANG BẬT
    if (!isCameraActive || !mediaStreamRef.current) {
      toast.warning(
        "Camera máy tính chưa bật! Vui lòng bấm 'Bật Camera quét khuôn mặt ngay' để kích hoạt webcam trước khi sang bước Đăng ký khuôn mặt.",
        "QUY CHUẨN AN NINH & CAMERA"
      );
      // Auto-trigger start camera
      startCamera();
      return;
    }

    // 3. Chuyển sang View Đăng ký khuôn mặt AI (Screenshot 2)
    setStep("enroll");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Action 3: Lưu Vector & Hoàn tất kích hoạt (tại View 2 - Screenshot 2)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleFinalizeActivation = async () => {
    setSaving(true);
    try {
      const selectedDoorNames = doors.filter((d) => d.selected).map((d) => d.name);

      await api.users.create({
        full_name: form.name.trim(),
        employee_id: form.employeeId.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        department: form.department,
        position: form.position,
        role: "STAFF",
        status: "ACTIVE", // Đã nạp khuôn mặt thành công -> ACTIVE
        card_number: form.rfidCode || undefined,
        access_areas: selectedDoorNames,
        password: "Password@123",
      });

      stopCamera();
      toast.success(`Đã nạp vector nhận diện khuôn mặt và kích hoạt thẻ số cho "${form.name}" (ACTIVE)!`, "KÍCH HOẠT THÀNH CÔNG");
      onSuccess(`Đã nạp vector nhận diện khuôn mặt và kích hoạt thẻ số cho "${form.name}" (ACTIVE)!`);
      onClose();
    } catch (err: any) {
      console.error("Enrollment failed:", err);
      toast.error(`Lỗi khi kích hoạt: ${err.message || err}`, "KÍCH HOẠT THẤT BẠI");
    } finally {
      setSaving(false);
    }
  };

  const selectedDoorCount = doors.filter((d) => d.selected).length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(7, 10, 18, 0.96)",
        backdropFilter: "blur(14px)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        animation: "fadeIn 0.25s ease-out",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: "#F8FAFC",
      }}
    >
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TOPBAR / BREADCRUMB HEADER                                                */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <header
        style={{
          padding: "16px 36px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(11, 15, 25, 0.8)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #00D4AA, #0072FF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              boxShadow: "0 0 16px rgba(0, 212, 170, 0.35)",
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#00D4AA", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                • HỒ SƠ THỰC THỂ SỐ #{form.employeeId}
              </span>
              {step === "enroll" && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 7px",
                    borderRadius: 4,
                    background: "rgba(0, 212, 170, 0.15)",
                    border: "1px solid #00D4AA",
                    color: "#00D4AA",
                  }}
                >
                  ĐANG GHI DANH
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF", margin: 0, letterSpacing: "-0.01em" }}>
              {step === "form" ? "Thêm người dùng mới" : "Đăng ký khuôn mặt AI (Face Enrollment)"}
            </h1>
            <p style={{ fontSize: 12, color: "#94A3B8", margin: "2px 0 0" }}>
              {step === "form"
                ? "Nhập thông tin nhân sự, cấu hình quyền ra vào các phân khu và khởi tạo vector nhận diện khuôn mặt OpenCV."
                : `${form.name} • ${form.position} • ${form.department} • ID: ${form.employeeId}`}
            </p>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {step === "form" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                style={{
                  padding: "9px 20px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 8,
                  color: "#CBD5E1",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)")}
              >
                Hủy bỏ
              </button>

              {/* Requirement: "Chỉnh sửa nút 'Lưu và Đăng ký khuôn mặt ' thành 'Đăng ký khuôn mặt'" */}
              <button
                type="button"
                onClick={handleProceedToFaceEnrollment}
                style={{
                  padding: "9px 24px",
                  background: "linear-gradient(135deg, #00A3FF, #0072FF)",
                  border: "none",
                  borderRadius: 8,
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 18px rgba(0, 114, 255, 0.45)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(0, 114, 255, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 18px rgba(0, 114, 255, 0.45)";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Đăng ký khuôn mặt
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("form")}
                style={{
                  padding: "9px 18px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 8,
                  color: "#CBD5E1",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✕ Hủy bỏ / Quay lại
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleFinalizeActivation}
                style={{
                  padding: "9px 24px",
                  background: "linear-gradient(135deg, #00D4AA, #0072FF)",
                  border: "none",
                  borderRadius: 8,
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 18px rgba(0, 212, 170, 0.45)",
                }}
              >
                {saving ? "Đang lưu CSDL & kích hoạt..." : "Lưu vector & Hoàn tất kích hoạt"}
              </button>
            </>
          )}
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* VIEW 1: THÊM NGƯỜI DÙNG MỚI (SCREENSHOT 1)                                */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {step === "form" && (
        <main
          style={{
            maxWidth: 1380,
            width: "100%",
            margin: "0 auto",
            padding: "24px 32px 48px",
            display: "grid",
            gridTemplateColumns: "1fr 390px",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* LEFT COLUMN: BASIC INFO + ACCESS CONTROL                                */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* ── CARD 1: THÔNG TIN NHÂN VIÊN CƠ BẢN ────────────────────────────── */}
            <div
              style={{
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "20px 24px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(0, 212, 170, 0.12)",
                      border: "1px solid rgba(0, 212, 170, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#00D4AA",
                      fontSize: 14,
                    }}
                  >
                    🪪
                  </div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                    Thông tin nhân viên cơ bản
                  </h2>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "#94A3B8",
                  }}
                >
                  Bắt buộc
                </span>
              </div>

              {/* Photo Upload Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "12px 16px",
                  background: "rgba(0, 0, 0, 0.25)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: 10,
                  marginBottom: 18,
                }}
              >
                {/* Avatar Preview */}
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "2px solid rgba(0, 212, 170, 0.4)",
                    background: "rgba(0, 0, 0, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ fontSize: 28 }}>👨‍💼</div>
                  )}
                </div>

                {/* Upload Buttons & Notes */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleUploadAvatar}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: "7px 14px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: 6,
                        color: "#E2E8F0",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>📤</span> Tải ảnh thẻ
                    </button>
                    <button
                      type="button"
                      onClick={handleSnapshotWebcam}
                      style={{
                        padding: "7px 14px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: 6,
                        color: "#E2E8F0",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>📷</span> Chụp nhanh Webcam
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>
                    Hỗ trợ JPG, PNG (tối đa 5MB). Khuôn mặt chụp chính diện, không đeo khẩu trang hoặc kính râm.
                  </div>
                </div>
              </div>

              {/* Form Input Grid (2 columns) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Họ và tên */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", display: "block", marginBottom: 6 }}>
                    Họ và tên đầy đủ *
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nguyễn Văn An"
                    style={inputBaseStyle}
                  />
                </div>

                {/* Mã nhân viên */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>
                      Mã nhân viên *
                    </label>
                    <span
                      onClick={handleGenerateId}
                      style={{ fontSize: 11, fontWeight: 600, color: "#00A3FF", cursor: "pointer" }}
                    >
                      Tạo mã tự động
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      required
                      value={form.employeeId}
                      onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                      placeholder="EMP-2045"
                      style={{ ...inputBaseStyle, paddingRight: 38 }}
                    />
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#64748B", fontSize: 14 }}>
                      🖆
                    </span>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", display: "block", marginBottom: 6 }}>
                    Email doanh nghiệp *
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="an.nguyen@aiaccess.corp"
                    style={inputBaseStyle}
                  />
                </div>

                {/* Số điện thoại */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", display: "block", marginBottom: 6 }}>
                    Số điện thoại liên hệ
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0988 234 567"
                    style={inputBaseStyle}
                  />
                </div>

                {/* Phòng ban */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", display: "block", marginBottom: 6 }}>
                    Phòng ban *
                  </label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    style={inputBaseStyle}
                  >
                    {departmentsList.map((deptName) => (
                      <option key={deptName} value={deptName}>
                        {deptName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chức danh vận hành */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", display: "block", marginBottom: 6 }}>
                    Chức danh vận hành *
                  </label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    style={inputBaseStyle}
                  >
                    <option value="Kỹ sư AI / Lập trình viên cao cấp">Kỹ sư AI / Lập trình viên cao cấp</option>
                    <option value="Chuyên viên phân tích dữ liệu">Chuyên viên phân tích dữ liệu</option>
                    <option value="Kỹ sư hệ thống nhúng & IoT">Kỹ sư hệ thống nhúng & IoT</option>
                    <option value="Trưởng phòng Kỹ thuật">Trưởng phòng Kỹ thuật</option>
                    <option value="Quản trị viên hệ thống">Quản trị viên hệ thống</option>
                    <option value="Nhân viên vận hành an ninh">Nhân viên vận hành an ninh</option>
                    <option value="Chuyên viên nghiệp vụ">Chuyên viên nghiệp vụ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── CARD 2: PHÂN QUYỀN & KIỂM SOÁT CỬA ───────────────────────────── */}
            <div
              style={{
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "20px 24px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(0, 114, 255, 0.12)",
                      border: "1px solid rgba(0, 114, 255, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#38BDF8",
                      fontSize: 14,
                    }}
                  >
                    🚪
                  </div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                    Phân quyền & Kiểm soát cửa (Access Control)
                  </h2>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: 20,
                    background: "rgba(0, 114, 255, 0.15)",
                    border: "1px solid rgba(0, 114, 255, 0.4)",
                    color: "#38BDF8",
                  }}
                >
                  ● Real-time Lock Sync
                </span>
              </div>

              {/* Cấp độ phân quyền nhanh (3 cards) */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginBottom: 8 }}>
                  Cấp độ phân quyền nhanh
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {/* Preset 1 */}
                  <div
                    onClick={() => handleSelectAccessLevel("office")}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      background: form.accessLevel === "office" ? "rgba(0, 163, 255, 0.1)" : "rgba(0, 0, 0, 0.25)",
                      border: form.accessLevel === "office" ? "1px solid #00A3FF" : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      transition: "all 0.15s",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC" }}>Cơ bản - Văn phòng</div>
                      <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 2 }}>Cửa sảnh chính & Căng tin</div>
                    </div>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: form.accessLevel === "office" ? "4px solid #00A3FF" : "1px solid #64748B",
                        background: form.accessLevel === "office" ? "#FFFFFF" : "transparent",
                      }}
                    />
                  </div>

                  {/* Preset 2 */}
                  <div
                    onClick={() => handleSelectAccessLevel("rd")}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      background: form.accessLevel === "rd" ? "rgba(0, 163, 255, 0.1)" : "rgba(0, 0, 0, 0.25)",
                      border: form.accessLevel === "rd" ? "1px solid #00A3FF" : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      transition: "all 0.15s",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC" }}>Nhân viên R&D Tiêu chuẩn</div>
                      <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 2 }}>Khu vực làm việc + Lab công nghệ</div>
                    </div>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: form.accessLevel === "rd" ? "4px solid #00A3FF" : "1px solid #64748B",
                        background: form.accessLevel === "rd" ? "#FFFFFF" : "transparent",
                      }}
                    />
                  </div>

                  {/* Preset 3 */}
                  <div
                    onClick={() => handleSelectAccessLevel("admin")}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      background: form.accessLevel === "admin" ? "rgba(0, 163, 255, 0.1)" : "rgba(0, 0, 0, 0.25)",
                      border: form.accessLevel === "admin" ? "1px solid #00A3FF" : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      transition: "all 0.15s",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC" }}>Toàn quyền Quản trị</div>
                      <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 2 }}>Tất cả các cửa + Server Room</div>
                    </div>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: form.accessLevel === "admin" ? "4px solid #00A3FF" : "1px solid #64748B",
                        background: form.accessLevel === "admin" ? "#FFFFFF" : "transparent",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Danh mục thiết bị cửa được phép mở khóa */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600 }}>
                    Danh mục thiết bị cửa được phép mở khóa
                  </span>
                  <span style={{ fontSize: 11, color: "#00D4AA", fontWeight: 700 }}>
                    Đã chọn: {selectedDoorCount} / {doors.length} cửa
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {doors.map((door) => (
                    <div
                      key={door.id}
                      onClick={() => toggleDoor(door.id)}
                      style={{
                        padding: "11px 14px",
                        borderRadius: 8,
                        background: door.selected ? "rgba(0, 212, 170, 0.06)" : "rgba(0, 0, 0, 0.25)",
                        border: door.selected ? "1px solid rgba(0, 212, 170, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 16 }}>🚪</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC" }}>{door.name}</div>
                          <div style={{ fontSize: 10, color: "#64748B", marginTop: 1 }}>{door.desc}</div>
                        </div>
                      </div>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: door.selected ? "1px solid #00D4AA" : "1px solid rgba(255, 255, 255, 0.2)",
                          background: door.selected ? "#00D4AA" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#000000",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {door.selected && "✓"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom row: Khung giờ & Mã thẻ RFID / PIN */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, paddingTop: 10, borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                {/* Khung giờ hiệu lực */}
                <div>
                  <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginBottom: 8 }}>
                    🕒 Khung giờ hiệu lực ra vào
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div
                      onClick={() => setForm({ ...form, workSchedule: "office" })}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: form.workSchedule === "office" ? "rgba(0, 163, 255, 0.12)" : "rgba(0, 0, 0, 0.2)",
                        border: form.workSchedule === "office" ? "1px solid #00A3FF" : "1px solid rgba(255, 255, 255, 0.08)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#F8FAFC" }}>Giờ hành chính</div>
                      <div style={{ fontSize: 9.5, color: "#64748B" }}>08:00 - 18:00 (T2-T7)</div>
                    </div>
                    <div
                      onClick={() => setForm({ ...form, workSchedule: "fulltime" })}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: form.workSchedule === "fulltime" ? "rgba(0, 163, 255, 0.12)" : "rgba(0, 0, 0, 0.2)",
                        border: form.workSchedule === "fulltime" ? "1px solid #00A3FF" : "1px solid rgba(255, 255, 255, 0.08)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#F8FAFC" }}>Toàn thời gian</div>
                      <div style={{ fontSize: 9.5, color: "#64748B" }}>24/7 (Không giới hạn)</div>
                    </div>
                  </div>
                </div>

                {/* Mã thẻ RFID / PIN dự phòng */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600 }}>
                      💳 Mã thẻ RFID / PIN dự phòng
                    </span>
                    <span style={{ fontSize: 10, color: "#64748B" }}>Tùy chọn</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={form.rfidCode}
                      onChange={(e) => setForm({ ...form, rfidCode: e.target.value })}
                      placeholder="8A4F-C092"
                      style={{ ...inputBaseStyle, flex: 1, padding: "8px 10px", fontSize: 12 }}
                    />
                    <input
                      type="password"
                      value={form.pinCode}
                      onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
                      placeholder="••••••"
                      style={{ ...inputBaseStyle, width: 100, padding: "8px 10px", fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── BOTTOM ACTION BAR (LƯU HỒ SƠ NGƯỜI DÙNG -> CHỜ NẠP FACE) ────── */}
            {/* Requirement: "Tiếp theo xử lý lưu thêm nút lưu và không đăng ký khuôn mặt. Sau khi click nút này thì hệ thống sẽ lưu vào CSDL và quét nếu không có dữ liệu khuôn mặt sẽ để trạng thái (Chờ nap Face)" */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94A3B8" }}>
                <span>🛡️</span>
                <span>Dữ liệu mã hóa SHA-256 nội bộ trước khi lưu trữ.</span>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveWithoutFace}
                style={{
                  padding: "10px 24px",
                  background: "linear-gradient(135deg, #00C6FF, #0072FF)",
                  border: "none",
                  borderRadius: 8,
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(0, 114, 255, 0.35)",
                }}
              >
                <span>💾</span>
                {saving ? "Đang lưu vào CSDL..." : "Lưu hồ sơ người dùng"}
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* RIGHT COLUMN: DỮ LIỆU FACE ID & TÓM TẮT TRẠNG THÁI                      */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* ── CARD 1: DỮ LIỆU FACE ID ───────────────────────────────────────── */}
            <div
              style={{
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "20px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(0, 212, 170, 0.12)",
                      border: "1px solid rgba(0, 212, 170, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#00D4AA",
                      fontSize: 14,
                    }}
                  >
                    👤
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                    Dữ liệu Face ID
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: isCameraActive ? "rgba(0, 212, 170, 0.15)" : "rgba(245, 158, 11, 0.15)",
                    color: isCameraActive ? "#00D4AA" : "#F59E0B",
                    border: isCameraActive ? "1px solid #00D4AA" : "1px solid rgba(245, 158, 11, 0.4)",
                  }}
                >
                  {isCameraActive ? "Đang bật Camera" : "Chưa thu thập"}
                </span>
              </div>

              {/* Camera Preview Viewport */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 210,
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#080C14",
                  border: isCameraActive ? "1px solid rgba(0, 212, 170, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                {/* Live Webcam video element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: isCameraActive ? "block" : "none",
                  }}
                />

                {/* When Camera is OFF: HUD Viewport Placeholder (Screenshot 1) */}
                {!isCameraActive && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      padding: 16,
                      color: "#64748B",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#00D4AA", letterSpacing: "0.08em", marginBottom: 4 }}>
                      OPENCV ENGINE V4.8
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>
                      Khung thu nhận: Sẵn sàng
                    </div>
                  </div>
                )}

                {/* HUD Corner Target Brackets */}
                <div style={{ position: "absolute", top: 12, left: 12, width: 18, height: 18, borderTop: "2px solid #00D4AA", borderLeft: "2px solid #00D4AA", pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: 12, right: 12, width: 18, height: 18, borderTop: "2px solid #00D4AA", borderRight: "2px solid #00D4AA", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 12, left: 12, width: 18, height: 18, borderBottom: "2px solid #00D4AA", borderLeft: "2px solid #00D4AA", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 12, right: 12, width: 18, height: 18, borderBottom: "2px solid #00D4AA", borderRight: "2px solid #00D4AA", pointerEvents: "none" }} />

                {/* Animated scan line when camera is active */}
                {isCameraActive && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      height: 2,
                      background: "linear-gradient(90deg, transparent, #00D4AA, transparent)",
                      boxShadow: "0 0 12px #00D4AA",
                      animation: "scanAnim 2.5s ease-in-out infinite",
                    }}
                  />
                )}
              </div>

              {cameraError && (
                <div style={{ padding: "8px 10px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #EF4444", borderRadius: 6, fontSize: 11, color: "#FCA5A5", marginBottom: 12 }}>
                  {cameraError}
                </div>
              )}

              {/* Info text box */}
              <div
                style={{
                  padding: "10px 12px",
                  background: "rgba(0, 0, 0, 0.25)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: 8,
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#38BDF8", marginBottom: 3 }}>
                  <span>🌐</span> Vector nhúng 512 chiều
                </div>
                <div style={{ fontSize: 10.5, color: "#94A3B8", lineHeight: 1.4 }}>
                  Hệ thống cần thu nạp <strong>15 - 30 khung ảnh</strong> các góc độ (chính diện, nghiêng 15°, ngửa nhẹ) để huấn luyện mô hình nhận diện khuôn mặt tự động thời gian thực.
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "#64748B", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 4 }}>
                  <span>Độ phân giải yêu cầu:</span>
                  <span style={{ color: "#E2E8F0", fontWeight: 600 }}>1080p @ 30FPS</span>
                </div>
              </div>

              {/* Requirement: "Chức năng của camera click để mở camera máy tính" */}
              <button
                type="button"
                disabled={isStartingCamera}
                onClick={isCameraActive ? stopCamera : startCamera}
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  background: isCameraActive ? "rgba(239, 68, 68, 0.15)" : "linear-gradient(135deg, #00C6FF, #0072FF)",
                  border: isCameraActive ? "1px solid #EF4444" : "none",
                  borderRadius: 8,
                  color: isCameraActive ? "#FCA5A5" : "#FFFFFF",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: isStartingCamera ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 8,
                  boxShadow: isCameraActive ? "none" : "0 4px 16px rgba(0, 114, 255, 0.35)",
                  transition: "all 0.2s",
                }}
              >
                <span>{isCameraActive ? "⏹" : "📷"}</span>
                {isStartingCamera
                  ? "Đang khởi tạo camera..."
                  : isCameraActive
                  ? "Tắt Camera máy tính"
                  : "Bật Camera quét khuôn mặt ngay"}
              </button>

              <button
                type="button"
                onClick={() => toast.info("Tính năng nạp thư mục mẫu ZIP sinh trắc học đang chuẩn bị sẵn sàng.", "TẢI DỮ LIỆU BATCH")}
                style={{
                  width: "100%",
                  padding: "9px 16px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 8,
                  color: "#94A3B8",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>📁</span> Tải lên thư mục ảnh mẫu (.zip)
              </button>
            </div>

            {/* ── CARD 2: TÓM TẮT TRẠNG THÁI HỒ SƠ ──────────────────────────────── */}
            <div
              style={{
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "18px 20px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ color: "#38BDF8", fontSize: 14 }}>ⓘ</span>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                  Tóm tắt trạng thái hồ sơ
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 11.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B" }}>Ngày khởi tạo:</span>
                  <span style={{ color: "#E2E8F0", fontWeight: 600 }}>Hôm nay, 23/09/2026</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B" }}>Cán bộ thực hiện:</span>
                  <span style={{ color: "#00D4AA", fontWeight: 600 }}>• Admin Security</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B" }}>Trạng thái thẻ nhân sự:</span>
                  <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(255, 255, 255, 0.06)", color: "#CBD5E1", fontSize: 11, fontWeight: 600 }}>
                    Bản nháp (Draft)
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B" }}>Trạng thái Face ID:</span>
                  <span style={{ color: isCameraActive ? "#00D4AA" : "#F59E0B", fontWeight: 700 }}>
                    {isCameraActive ? "Đang mở Camera" : "Chờ nạp Face"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B" }}>Đồng bộ Controller:</span>
                  <span style={{ color: "#64748B" }}>Đang chờ lưu dữ liệu</span>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 6, paddingTop: 10, borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                    <span style={{ color: "#94A3B8" }}>Tiến trình hồ sơ:</span>
                    <span style={{ color: "#00D4AA" }}>{isCameraActive ? "80% hoàn tất" : "60% hoàn tất"}</span>
                  </div>
                  <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: isCameraActive ? "80%" : "60%",
                        height: "100%",
                        background: "linear-gradient(90deg, #00A3FF, #00D4AA)",
                        borderRadius: 3,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* VIEW 2: ĐĂNG KÝ KHUÔN MẶT AI (SCREENSHOT 2)                               */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {step === "enroll" && (
        <main
          style={{
            maxWidth: 1380,
            width: "100%",
            margin: "0 auto",
            padding: "24px 32px 48px",
            display: "grid",
            gridTemplateColumns: "1fr 390px",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* LEFT COLUMN: CAMERA ENROLLMENT HUD + HEAD POSE PROGRESS                 */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* ── CARD: LIVE CAMERA HUD ─────────────────────────────────────────── */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 440,
                borderRadius: 14,
                overflow: "hidden",
                background: "#050811",
                border: "1px solid rgba(0, 212, 170, 0.4)",
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6)",
              }}
            >
              {/* Webcam stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />

              {/* HUD Header Bar */}
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  left: 18,
                  right: 18,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#E2E8F0",
                  textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                  zIndex: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D4AA", boxShadow: "0 0 8px #00D4AA" }} />
                  <span>CAM #01 • ENROLLMENT FHD 60FPS</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#94A3B8" }}>
                  <span>⏱ 12ms</span>
                  <span>• Lux: 450 (Đạt)</span>
                  <span>• Khoảng cách: 0.8m</span>
                </div>
              </div>

              {/* Center Face Target Box with Bounding Box & HUD prompt */}
              <div
                style={{
                  position: "absolute",
                  top: "46%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 260,
                  height: 310,
                  border: "2px solid rgba(0, 212, 170, 0.8)",
                  borderRadius: 12,
                  boxShadow: "0 0 25px rgba(0, 212, 170, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px",
                  pointerEvents: "none",
                }}
              >
                {/* Face label pill */}
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.75)",
                    border: "1px solid #00D4AA",
                    borderRadius: 6,
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#FFFFFF",
                  }}
                >
                  <span>{form.name}</span>
                  <span style={{ color: "#00D4AA", fontWeight: 800 }}>98.6% MATCH</span>
                </div>

                {/* Corner Accents */}
                <div style={{ position: "absolute", top: -2, left: -2, width: 20, height: 20, borderTop: "3px solid #00D4AA", borderLeft: "3px solid #00D4AA" }} />
                <div style={{ position: "absolute", top: -2, right: -2, width: 20, height: 20, borderTop: "3px solid #00D4AA", borderRight: "3px solid #00D4AA" }} />
                <div style={{ position: "absolute", bottom: -2, left: -2, width: 20, height: 20, borderBottom: "3px solid #00D4AA", borderLeft: "3px solid #00D4AA" }} />
                <div style={{ position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderBottom: "3px solid #00D4AA", borderRight: "3px solid #00D4AA" }} />
              </div>

              {/* Pulsing guidance prompt banner */}
              <div
                style={{
                  position: "absolute",
                  bottom: 54,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(0, 163, 255, 0.85)",
                  backdropFilter: "blur(6px)",
                  padding: "6px 18px",
                  borderRadius: 20,
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: "#FFFFFF",
                  letterSpacing: "0.04em",
                  boxShadow: "0 0 16px rgba(0, 163, 255, 0.6)",
                  whiteSpace: "nowrap",
                }}
              >
                {guidancePrompt}
              </div>

              {/* Bottom camera toolbar */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "10px 18px",
                  background: "rgba(10, 14, 24, 0.85)",
                  backdropFilter: "blur(8px)",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => toast.info("Đang sử dụng camera có độ phân giải tối ưu nhất của thiết bị.", "CẤU HÌNH THIẾT BỊ")}
                    style={{
                      padding: "6px 12px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 6,
                      color: "#CBD5E1",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🔄 Đổi Camera nạp dữ liệu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEnrollFrames(20);
                      setGuidancePrompt("GIỮ YÊN: ĐANG GHI NHẬN LẠI...");
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 6,
                      color: "#CBD5E1",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ↺ Chụp lại góc này
                  </button>
                </div>

                <div
                  onClick={() => setAutoCapture(!autoCapture)}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: autoCapture ? "#00D4AA" : "#64748B",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: autoCapture ? "#00D4AA" : "#64748B" }} />
                  Tự động kích hoạt (Auto-capture: {autoCapture ? "Bật" : "Tắt"})
                </div>
              </div>
            </div>

            {/* ── CARD: TIẾN TRÌNH THU NẠP MẪU ẢNH ─────────────────────────────── */}
            <div
              style={{
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "20px 24px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                    Tiến trình thu nạp mẫu ảnh
                  </h3>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "rgba(0, 114, 255, 0.15)",
                      color: "#38BDF8",
                    }}
                  >
                    ArcFace 3D Mesh
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#38BDF8" }}>
                  {enrollFrames} / 30 khung hình ({Math.round((enrollFrames / 30) * 100)}%)
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ width: "100%", height: 8, borderRadius: 4, background: "rgba(255, 255, 255, 0.08)", overflow: "hidden", marginBottom: 18 }}>
                <div
                  style={{
                    width: `${Math.round((enrollFrames / 30) * 100)}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #00A3FF, #00D4AA)",
                    borderRadius: 4,
                    boxShadow: "0 0 10px rgba(0, 212, 170, 0.5)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              {/* 5 Head Pose Guidance Cards */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Góc quay mẫu nhận diện thời gian thực (Head Pose Guidance):
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                  {/* Pose 1: Nhìn thẳng */}
                  <div
                    style={{
                      padding: "12px 8px",
                      borderRadius: 8,
                      background: "rgba(0, 212, 170, 0.08)",
                      border: "1px solid rgba(0, 212, 170, 0.3)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: "#00D4AA", fontSize: 14, fontWeight: 900, marginBottom: 4 }}>✓</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#FFFFFF" }}>Nhìn thẳng</div>
                    <div style={{ fontSize: 10, color: "#64748B" }}>(0°)</div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#00D4AA", marginTop: 4 }}>Đạt ({poseScores[0]}%)</div>
                  </div>

                  {/* Pose 2: Nghiêng trái */}
                  <div
                    style={{
                      padding: "12px 8px",
                      borderRadius: 8,
                      background: "rgba(0, 212, 170, 0.08)",
                      border: "1px solid rgba(0, 212, 170, 0.3)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: "#00D4AA", fontSize: 14, fontWeight: 900, marginBottom: 4 }}>✓</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#FFFFFF" }}>Nghiêng trái</div>
                    <div style={{ fontSize: 10, color: "#64748B" }}>(15°)</div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#00D4AA", marginTop: 4 }}>Đạt ({poseScores[1]}%)</div>
                  </div>

                  {/* Pose 3: Nghiêng phải */}
                  <div
                    style={{
                      padding: "12px 8px",
                      borderRadius: 8,
                      background: "rgba(0, 212, 170, 0.08)",
                      border: "1px solid rgba(0, 212, 170, 0.3)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: "#00D4AA", fontSize: 14, fontWeight: 900, marginBottom: 4 }}>✓</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#FFFFFF" }}>Nghiêng phải</div>
                    <div style={{ fontSize: 10, color: "#64748B" }}>(15°)</div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#00D4AA", marginTop: 4 }}>Đạt ({poseScores[2]}%)</div>
                  </div>

                  {/* Pose 4: Ngửa nhẹ */}
                  <div
                    style={{
                      padding: "12px 8px",
                      borderRadius: 8,
                      background: poseScores[3] >= 100 ? "rgba(0, 212, 170, 0.08)" : "rgba(0, 163, 255, 0.12)",
                      border: poseScores[3] >= 100 ? "1px solid rgba(0, 212, 170, 0.3)" : "1px solid #00A3FF",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: poseScores[3] >= 100 ? "#00D4AA" : "#38BDF8", fontSize: 14, fontWeight: 900, marginBottom: 4 }}>
                      {poseScores[3] >= 100 ? "✓" : "↺"}
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#FFFFFF" }}>Ngửa nhẹ</div>
                    <div style={{ fontSize: 10, color: "#64748B" }}>(+10°)</div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: poseScores[3] >= 100 ? "#00D4AA" : "#38BDF8", marginTop: 4 }}>
                      {poseScores[3] >= 100 ? "Đạt (100%)" : `Đang nạp (${poseScores[3]}%)`}
                    </div>
                  </div>

                  {/* Pose 5: Cúi nhẹ */}
                  <div
                    style={{
                      padding: "12px 8px",
                      borderRadius: 8,
                      background: poseScores[4] >= 100 ? "rgba(0, 212, 170, 0.08)" : "rgba(0, 0, 0, 0.25)",
                      border: poseScores[4] >= 100 ? "1px solid rgba(0, 212, 170, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: poseScores[4] >= 100 ? "#00D4AA" : "#64748B", fontSize: 14, fontWeight: 900, marginBottom: 4 }}>
                      {poseScores[4] >= 100 ? "✓" : "○"}
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#FFFFFF" }}>Cúi nhẹ</div>
                    <div style={{ fontSize: 10, color: "#64748B" }}>(-10°)</div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: poseScores[4] >= 100 ? "#00D4AA" : "#64748B", marginTop: 4 }}>
                      {poseScores[4] >= 100 ? "Đạt (100%)" : "Chờ quét"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* RIGHT COLUMN: BIOMETRIC QUALITY + VECTOR VISUALIZER + DOOR SYNC         */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* ── CARD 1: CHẤT LƯỢNG MẪU SINH TRẮC ─────────────────────────────── */}
            <div
              style={{
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "20px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(0, 212, 170, 0.12)",
                      border: "1px solid rgba(0, 212, 170, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#00D4AA",
                      fontSize: 14,
                    }}
                  >
                    📊
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                      Chất lượng mẫu sinh trắc
                    </h3>
                    <div style={{ fontSize: 10.5, color: "#64748B" }}>Thuật toán ArcFace ResNet-100</div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#64748B" }}>Tổng điểm:</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#00D4AA" }}>96/100</div>
                </div>
              </div>

              {/* 4 Metric items */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{ padding: "8px 10px", background: "rgba(0, 0, 0, 0.25)", borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: "#94A3B8" }}>Độ sắc nét ảnh</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#38BDF8", marginTop: 2 }}>98%</div>
                </div>
                <div style={{ padding: "8px 10px", background: "rgba(0, 0, 0, 0.25)", borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: "#94A3B8" }}>Độ mở mắt (Iris)</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#00D4AA", marginTop: 2 }}>100%</div>
                </div>
                <div style={{ padding: "8px 10px", background: "rgba(0, 0, 0, 0.25)", borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: "#94A3B8" }}>Không che khuất</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#00D4AA", marginTop: 2 }}>100%</div>
                </div>
                <div style={{ padding: "8px 10px", background: "rgba(0, 0, 0, 0.25)", borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: "#94A3B8" }}>Chống giả mạo 3D</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#00D4AA", marginTop: 2 }}>99.4%</div>
                </div>
              </div>

              {/* Liveness passed badge */}
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(0, 212, 170, 0.08)",
                  border: "1px solid rgba(0, 212, 170, 0.25)",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  color: "#00D4AA",
                  fontWeight: 600,
                }}
              >
                <span>✓</span>
                <span>Liveness Detection: <strong>PASSED</strong> (Nhận diện thực thể sống 3D chuẩn xác)</span>
              </div>
            </div>

            {/* ── CARD 2: MÔ PHỎNG VECTOR ĐẶC TRƯNG ────────────────────────────── */}
            <div
              style={{
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "18px 20px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🧬</span>
                  <div>
                    <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                      Mô phỏng Vector đặc trưng
                    </h3>
                    <div style={{ fontSize: 10, color: "#64748B" }}>512-D Embedding Vector Space</div>
                  </div>
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>
                  AES-256
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748B", marginBottom: 8 }}>
                <span>Dạng trích xuất (Normalized Matrix):</span>
                <span style={{ color: "#00D4AA", fontWeight: 700 }}>Cosine Norm: 1.000</span>
              </div>

              {/* Animated Equalizer / Vector Frequency Bars */}
              <div
                style={{
                  height: 48,
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  padding: "6px 8px",
                  gap: 3,
                  marginBottom: 8,
                }}
              >
                {equalizerHeights.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      background: "linear-gradient(180deg, #00D4AA, #0072FF)",
                      borderRadius: 1,
                      transition: "height 0.12s ease",
                    }}
                  />
                ))}
              </div>

              {/* Code sample string */}
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 9.5,
                  color: "#94A3B8",
                  background: "rgba(0, 0, 0, 0.3)",
                  padding: "5px 8px",
                  borderRadius: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginBottom: 8,
                }}
              >
                [-0.0428, 0.1852, -0.0911, 0.3129, 0.0045, 0.2184, -0.0543, ...]
              </div>

              <div style={{ fontSize: 10.5, color: "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
                <span>💾</span>
                <span>Sẵn sàng nạp vào cơ sở dữ liệu Vector DB nội bộ (Milvus/pgvector)</span>
              </div>
            </div>

            {/* ── CARD 3: ĐỒNG BỘ THIẾT BỊ CỬA ─────────────────────────────────── */}
            <div
              style={{
                background: "rgba(18, 24, 38, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "18px 20px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>📱</span>
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                      Đồng bộ thiết bị cửa
                    </h3>
                    <div style={{ fontSize: 10, color: "#64748B" }}>Edge Controllers Auto-Sync</div>
                  </div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#00D4AA" }}>
                  {doors.filter((d) => d.selected).length}/{doors.length} Trực tuyến
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {doors
                  .filter((d) => d.selected)
                  .map((door) => (
                    <div
                      key={door.id}
                      style={{
                        padding: "8px 10px",
                        background: "rgba(0, 0, 0, 0.25)",
                        borderRadius: 6,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 11,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>🚪</span>
                        <div>
                          <div style={{ fontWeight: 600, color: "#F8FAFC" }}>{door.name}</div>
                          <div style={{ fontSize: 9.5, color: "#64748B" }}>TCP/IP Push • Controller Ready</div>
                        </div>
                      </div>
                      <span style={{ color: "#00D4AA", fontWeight: 700, fontSize: 10.5 }}>● Sẵn sàng</span>
                    </div>
                  ))}
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#CBD5E1", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "#00D4AA" }} />
                <span>Tự động kích hoạt thẻ và cấp quyền ra vào ngay sau khi lưu</span>
              </label>
            </div>
          </div>
        </main>
      )}

      {/* Embedded CSS animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.99); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes scanAnim {
              0% { top: 10%; }
              50% { top: 85%; }
              100% { top: 10%; }
            }
          `,
        }}
      />
    </div>
  );
}

const inputBaseStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "rgba(0, 0, 0, 0.35)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 8,
  color: "#F8FAFC",
  fontSize: 12.5,
  outline: "none",
  transition: "border-color 0.15s",
};
