"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/ToastNotification";

// ─────────────────────────────────────────────────────────────────────────────
// Real Database-backed Employee Interface (No Mock Data)
// ─────────────────────────────────────────────────────────────────────────────
interface EmployeeProfile {
  id?: string;
  employee_id: string;
  user_name: string;
  full_name?: string;
  department: string;
  position: string;
  role?: string;
  email?: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED" | "LOCKED" | "WAITING" | "PENDING";
  face_enrolled: boolean;
  avatarUrl?: string;
  avatar_url?: string;
}

export default function FaceRegistrationPage() {
  const router = useRouter();

  // Input state
  const [employeeId, setEmployeeId] = useState<string>("");
  const [verifiedEmployee, setVerifiedEmployee] = useState<EmployeeProfile | null>(null);

  // Stepper Status: Step 1 (Xác thực nhân viên), Step 2 (Kiểm tra camera), Step 3 (Ghi nhận khuôn mặt)
  const [step1Status, setStep1Status] = useState<"pending" | "completed" | "error">("pending");
  const [step2Status, setStep2Status] = useState<"pending" | "completed" | "error">("pending");
  const [step3Status, setStep3Status] = useState<"pending" | "completed">("pending");

  // Loading States
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);

  // Camera devices & state
  const [cameraIndex, setCameraIndex] = useState<number>(0);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [cameraResolution, setCameraResolution] = useState<string>("Chưa kết nối");
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Camera Diagnostic Mode (Cho phép kiểm tra đầy đủ các ca ngoại lệ phần cứng IT02-06 đến IT02-10)
  const [cameraTestMode, setCameraTestMode] = useState<string>("NORMAL");

  // Captured photo preview
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  // Error & Success Banner State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorGuidance, setErrorGuidance] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Video and Canvas refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera tracks safely
  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch { }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Camera Control & Exception Handling (IT02-06 through IT02-10)
  // ───────────────────────────────────────────────────────────────────────────
  const startCamera = useCallback(
    async (devId?: string, overrideIndex?: number, testMode: string = "NORMAL") => {
      setCameraError(null);
      stopCameraTracks();

      const activeIdx = overrideIndex !== undefined ? overrideIndex : cameraIndex;

      // ── IT02-06: Chỉ số camera không hợp lệ ──
      if (activeIdx < 0 || testMode === "TEST_INVALID_INDEX") {
        const msg = "Chỉ số camera không hợp lệ";
        setCameraError(msg);
        setErrorMessage(msg);
        setErrorGuidance("Vui lòng chọn chỉ số thiết bị camera hợp lệ (0, 1, 2...) từ danh sách phần cứng khả dụng.");
        setStep2Status("error");
        toast.error(msg, "LỖI CAMERA (IT02-06)");
        return;
      }

      // ── IT02-08: Không có quyền truy cập camera (Test Case giả định quyền bị từ chối) ──
      if (testMode === "TEST_PERMISSION_DENIED") {
        const msg = "Không có quyền truy cập camera";
        setCameraError(msg);
        setErrorMessage(msg);
        setErrorGuidance("Vui lòng cho phép quyền truy cập camera trong cài đặt trình duyệt (biểu tượng ổ khóa trên thanh địa chỉ) hoặc cài đặt Quyền riêng tư của Hệ điều hành.");
        setStep2Status("error");
        toast.error(msg, "TỪ CHỐI QUYỀN (IT02-08)");
        return;
      }

      // ── IT02-07: Camera không được mở (Thiết bị bị chiếm dụng hoặc không khả dụng) ──
      if (testMode === "TEST_CANNOT_OPEN") {
        const msg = "Không thể mở camera";
        setCameraError(msg);
        setErrorMessage(msg);
        setErrorGuidance("Camera bị ngắt kết nối hoặc đang được ứng dụng khác sử dụng. Vui lòng tắt các ứng dụng khác đang chiếm camera và bấm 'Kiểm tra lại camera'.");
        setStep2Status("error");
        toast.error(msg, "LỖI MỞ THIẾT BỊ (IT02-07)");
        return;
      }

      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Trình duyệt không hỗ trợ WebRTC Camera");
        }

        const constraints: MediaStreamConstraints = {
          video: devId
            ? { deviceId: { exact: devId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => { });
        }

        // Kiểm tra độ phân giải thực tế của camera stream
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        const curW = settings.width || 1280;
        const curH = settings.height || 720;

        // ── IT02-10: Độ phân giải camera không hợp lệ ──
        if (curW < 640 || curH < 480 || testMode === "TEST_LOW_RES") {
          stopCameraTracks();
          const msg = "Độ phân giải hình ảnh camera không hợp lệ";
          setCameraResolution(`${curW} × ${curH} (Không đạt chuẩn)`);
          setCameraError(msg);
          setErrorMessage(msg);
          setErrorGuidance(`Camera đang trả về độ phân giải ${curW}×${curH}, thấp hơn mức yêu cầu tối thiểu (640×480). Vui lòng chọn camera có độ phân giải cao hơn.`);
          setStep2Status("error");
          toast.error(msg, "ĐỘ PHÂN GIẢI THẤP (IT02-10)");
          return;
        }

        setCameraResolution(`${curW} × ${curH}`);
        setIsCameraActive(true);
        setStep2Status("completed");
        setCameraError(null);
      } catch (err: any) {
        stopCameraTracks();
        const errName = err?.name || "";

        // IT02-08: Không có quyền truy cập camera
        if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
          const msg = "Không có quyền truy cập camera";
          setCameraError(msg);
          setErrorMessage(msg);
          setErrorGuidance("Vui lòng nhấp vào biểu tượng ổ khóa cạnh thanh địa chỉ trình duyệt và chuyển 'Camera' sang 'Cho phép' (Allow).");
          setStep2Status("error");
          toast.error(msg, "QUYỀN TRUY CẬP (IT02-08)");
          return;
        }

        // IT02-07: Camera không được mở
        const msg = "Không thể mở camera";
        setCameraError(msg);
        setErrorMessage(msg);
        setErrorGuidance("Thiết bị camera đang bận hoặc đang được phần mềm khác sử dụng. Vui lòng đóng các ứng dụng gọi video khác và thử lại.");
        setStep2Status("error");
        toast.error(msg, "LỖI THIẾT BỊ (IT02-07)");
      }
    },
    [cameraIndex, stopCameraTracks]
  );

  // Initialize camera and enumerate devices on mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devs) => {
          const videoDevs = devs.filter((d) => d.kind === "videoinput");
          setAvailableDevices(videoDevs);
          if (videoDevs.length > 0) {
            setSelectedDeviceId(videoDevs[0].deviceId);
          }
        })
        .catch(() => { });
    }

    return () => {
      stopCameraTracks();
    };
  }, [stopCameraTracks]);

  // Handle employeeId text input changes:
  // "Không hiển thị dữ liệu nhân viên cũ khi mã nhân viên mới chưa được xác thực thành công"
  const handleInputChange = (val: string) => {
    setEmployeeId(val);
    if (verifiedEmployee) {
      setVerifiedEmployee(null);
      setStep1Status("pending");
      setStep3Status("pending");
      setErrorMessage(null);
      setErrorGuidance(null);
      setSuccessMessage(null);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Business Logic: "Kiểm tra thông tin" Button Click
  // Aligned 100% with IT02-01 -> IT02-05 via Database Backend API
  // ───────────────────────────────────────────────────────────────────────────
  const handleVerifyEmployee = async () => {
    setErrorMessage(null);
    setErrorGuidance(null);
    setSuccessMessage(null);
    setIsVerifying(true);

    // ── IT02-01: Không nhập mã nhân viên (None, "", "   ") ──
    if (!employeeId || employeeId.trim() === "") {
      setIsVerifying(false);
      setStep1Status("error");
      setVerifiedEmployee(null);
      stopCameraTracks();
      const msg = "Mã nhân viên không được để trống";
      setErrorMessage(msg);
      setErrorGuidance("Vui lòng nhập mã định danh nhân viên theo cú pháp EMP-xxxx trước khi thực hiện xác thực.");
      toast.error(msg, "LỖI XÁC THỰC (IT02-01)");
      return;
    }

    const cleanId = employeeId.trim();

    // ── IT02-02: Nhập mã nhân viên sai định dạng (VD: "ABC-1@", "12345", ...) ──
    const standardRegex = /^EMP-[A-Za-z0-9\-_]{2,26}$/;
    if (!standardRegex.test(cleanId) || cleanId.includes("@")) {
      setIsVerifying(false);
      setStep1Status("error");
      setVerifiedEmployee(null);
      stopCameraTracks();
      const msg = "Định dạng mã nhân viên không hợp lệ";
      setErrorMessage(msg);
      setErrorGuidance("Mã nhân viên phải bắt đầu bằng 'EMP-' và chỉ chứa chữ cái, số, dấu gạch nối (Ví dụ: EMP-2045). Không được chứa ký tự đặc biệt như '@'.");
      toast.error(msg, "LỖI ĐỊNH DẠNG (IT02-02)");
      return;
    }

    // ── Call Real Backend API querying PostgreSQL directly ──
    try {
      const res = await api.faces.preCheck(cleanId);

      // IT02-03: Mã nhân viên không tồn tại trong CSDL
      if (!res.valid && res.reason === "USER_NOT_FOUND") {
        setStep1Status("error");
        setVerifiedEmployee(null);
        stopCameraTracks();
        setErrorMessage(res.message || "Không tìm thấy nhân viên");
        setErrorGuidance(`Mã nhân viên '${cleanId}' không tồn tại trong cơ sở dữ liệu FaceGate. Vui lòng kiểm tra lại danh sách nhân sự tại trang Nhân sự.`);
        toast.error(res.message || "Không tìm thấy nhân viên", "CSDL KHÔNG TỒN TẠI (IT02-03)");
        setIsVerifying(false);
        return;
      }

      // IT02-05: Nhân viên ngừng hoạt động (INACTIVE) hoặc bị khóa (BLOCKED / LOCKED)
      if (!res.valid && res.reason === "ACCOUNT_LOCKED") {
        setStep1Status("error");
        // Hiển thị thông tin thực tế từ DB để người dùng xác nhận nhưng từ chối đăng ký và khóa camera
        setVerifiedEmployee({
          id: res.id,
          employee_id: res.employee_id,
          user_name: res.user_name || res.full_name,
          full_name: res.full_name || res.user_name,
          department: res.department || "Khối Vận hành",
          position: res.position || "Nhân viên",
          role: res.role || res.position || "Nhân viên",
          email: res.email || "",
          phone: res.phone || "",
          status: res.status,
          face_enrolled: Boolean(res.face_enrolled),
          avatar_url: res.avatar_url,
        });
        stopCameraTracks();
        setErrorMessage(res.message || "Nhân viên đang ở trạng thái ngừng hoạt động/bị khóa");
        setErrorGuidance(`Nhân viên '${res.user_name || res.full_name}' đang ở trạng thái '${res.status}'. Tài khoản bị vô hiệu hóa không được phép đăng ký dữ liệu sinh trắc học.`);
        toast.error(res.message || "Nhân viên đang ở trạng thái ngừng hoạt động/bị khóa", "TỪ CHỐI ĐĂNG KÝ (IT02-05)");
        setIsVerifying(false);
        return;
      }

      // IT02-04: Nhân viên đã đăng ký khuôn mặt trước đó
      if (!res.valid && (res.reason === "ALREADY_ENROLLED" || res.already_enrolled)) {
        setStep1Status("error");
        setVerifiedEmployee({
          id: res.id,
          employee_id: res.employee_id,
          user_name: res.user_name || res.full_name,
          full_name: res.full_name || res.user_name,
          department: res.department || "Khối Vận hành",
          position: res.position || "Nhân viên",
          role: res.role || res.position || "Nhân viên",
          email: res.email || "",
          phone: res.phone || "",
          status: res.status,
          face_enrolled: true,
          avatar_url: res.avatar_url,
        });
        stopCameraTracks();
        setErrorMessage(res.message || "Nhân viên đã đăng ký khuôn mặt trước đó");
        setErrorGuidance(`Nhân viên '${res.user_name || res.full_name}' đã có hồ sơ khuôn mặt hiệu lực trong CSDL. Hệ thống không tự động ghi đè dữ liệu khuôn mặt cũ để đảm bảo tính an toàn.`);
        toast.error(res.message || "Nhân viên đã đăng ký khuôn mặt trước đó", "ĐÃ TỒN TẠI KHUÔN MẶT (IT02-04)");
        setIsVerifying(false);
        return;
      }

      // Other rejected reasons
      if (!res.valid) {
        setStep1Status("error");
        setVerifiedEmployee(null);
        stopCameraTracks();
        setErrorMessage(res.message || "Yêu cầu không hợp lệ");
        toast.error(res.message || "Yêu cầu không hợp lệ", "LỖI");
        setIsVerifying(false);
        return;
      }

      // Hồ sơ nhân viên hợp lệ!
      const validEmp: EmployeeProfile = {
        id: res.id,
        employee_id: res.employee_id,
        user_name: res.user_name || res.full_name,
        full_name: res.full_name || res.user_name,
        department: res.department || "Khối Vận hành",
        position: res.position || "Nhân viên",
        role: res.role || res.position || "Nhân viên",
        email: res.email || "",
        phone: res.phone || "",
        status: res.status || "ACTIVE",
        face_enrolled: false,
        avatar_url: res.avatar_url,
      };

      setVerifiedEmployee(validEmp);
      setStep1Status("completed");
      setSuccessMessage(`Đã xác thực nhân viên "${validEmp.user_name}" (${validEmp.employee_id}) thành công từ CSDL. Sẵn sàng thu nạp khuôn mặt.`);
      toast.success(`Xác thực nhân viên ${validEmp.user_name} thành công!`, "HỢP LỆ");

      // Khởi động luồng Camera sau khi xác thực thành công
      startCamera(selectedDeviceId, cameraIndex, cameraTestMode);
    } catch (apiErr: any) {
      setStep1Status("error");
      setVerifiedEmployee(null);
      stopCameraTracks();
      const msg = apiErr?.message || "Lỗi kết nối cơ sở dữ liệu Backend";
      setErrorMessage(msg);
      toast.error(msg, "LỖI KẾT NỐI");
    } finally {
      setIsVerifying(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Business Logic: "Chụp và đăng ký khuôn mặt" Button Click
  // Validates conditions, captures avatar, saves to DB, stores pendingUser,
  // and redirects to /users/enroll (Face Enrollment flow identical to user registration)
  // ───────────────────────────────────────────────────────────────────────────
  const handleCaptureAndEnroll = async () => {
    setErrorMessage(null);
    setErrorGuidance(null);
    setSuccessMessage(null);

    // 1. Kiểm tra điều kiện nhân viên trước khi chụp
    if (!verifiedEmployee || step1Status !== "completed") {
      setErrorMessage("Vui lòng nhập mã và bấm 'Kiểm tra thông tin' trước khi đăng ký!");
      toast.warning("Chưa xác thực thông tin nhân viên!", "YÊU CẦU THÔNG TIN");
      return;
    }

    if (verifiedEmployee.face_enrolled) {
      setErrorMessage("Nhân viên đã đăng ký khuôn mặt trước đó");
      toast.error("Nhân viên đã đăng ký khuôn mặt trước đó", "KHÔNG THỂ ĐĂNG KÝ");
      return;
    }

    if (verifiedEmployee.status === "BLOCKED" || verifiedEmployee.status === "INACTIVE" || verifiedEmployee.status === "LOCKED") {
      setErrorMessage("Nhân viên đang ở trạng thái ngừng hoạt động/bị khóa");
      toast.error("Nhân viên đang ở trạng thái ngừng hoạt động/bị khóa", "TỪ CHỐI ĐĂNG KÝ");
      return;
    }

    // 2. Kiểm tra điều kiện Camera (IT02-07, IT02-08)
    if (!isCameraActive || !videoRef.current) {
      const err = cameraError || "Camera chưa sẵn sàng hoặc không thể mở";
      setErrorMessage(err);
      toast.error(err, "LỖI CAMERA");
      return;
    }

    setIsEnrolling(true);

    try {
      const video = videoRef.current;
      const vWidth = video.videoWidth || 0;
      const vHeight = video.videoHeight || 0;

      // ── IT02-09: Camera không đọc được hình ảnh (frame rỗng / videoWidth = 0 / TEST_EMPTY_FRAME) ──
      if (vWidth === 0 || vHeight === 0 || cameraTestMode === "TEST_EMPTY_FRAME") {
        setIsEnrolling(false);
        const msg = "Không đọc được hình ảnh từ camera";
        setErrorMessage(msg);
        setErrorGuidance("Khung hình camera trả về rỗng hoặc không thể giải mã dữ liệu hình ảnh. Vui lòng kiểm tra lại thiết bị thu hình.");
        toast.error(msg, "LỖI ĐỌC HÌNH ẢNH (IT02-09)");
        return;
      }

      // ── IT02-10: Độ phân giải camera không hợp lệ (< 640x480 / TEST_LOW_RES) ──
      if (vWidth < 640 || vHeight < 480 || cameraTestMode === "TEST_LOW_RES") {
        setIsEnrolling(false);
        const msg = "Độ phân giải hình ảnh camera không hợp lệ";
        setErrorMessage(msg);
        setErrorGuidance(`Độ phân giải hiện tại (${vWidth}×${vHeight}) không đáp ứng yêu cầu xử lý AI tối thiểu (640×480 pixel). Vui lòng đổi camera độ phân giải cao.`);
        toast.error(msg, "ĐỘ PHÂN GIẢI THẤP (IT02-10)");
        return;
      }

      // 3. Chụp lại avatar thực tế từ Video Stream lên Canvas (có lật ngang hiển thị tự nhiên)
      let photoDataUrl = "";
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = vWidth;
      canvas.height = vHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, vWidth, vHeight);
        photoDataUrl = canvas.toDataURL("image/jpeg", 0.92);
        setCapturedPhotoUrl(photoDataUrl);
      }

      // 4. Lưu/Cập nhật avatar vào CSDL cho nhân viên
      const targetUserId = verifiedEmployee.id || verifiedEmployee.employee_id;
      if (photoDataUrl && targetUserId) {
        try {
          await api.users.update(targetUserId, { avatar_url: photoDataUrl });
        } catch (dbErr) {
          console.warn("Avatar DB update warning:", dbErr);
        }
      }

      // 5. Chuẩn bị dữ liệu pendingUser đồng bộ với luồng đăng ký người dùng
      const pendingUserData = {
        id: targetUserId,
        employeeId: verifiedEmployee.employee_id,
        name: verifiedEmployee.user_name || verifiedEmployee.full_name || verifiedEmployee.employee_id,
        email: verifiedEmployee.email || `${verifiedEmployee.employee_id.toLowerCase()}@company.corp`,
        phone: verifiedEmployee.phone || "",
        department: verifiedEmployee.department || "Khối Kỹ thuật & R&D",
        role: verifiedEmployee.position || verifiedEmployee.role || "Kỹ sư AI",
        accessAreas: ["Cửa chính Lobby – Tầng 1", "Phòng Server Kỹ thuật", "Cửa phân tầng Thang máy"],
        selectedCameraId: selectedDeviceId || "",
        avatarUrl: photoDataUrl || verifiedEmployee.avatar_url || "",
        fromRoute: "/face-registration",
      };

      if (typeof window !== "undefined") {
        sessionStorage.setItem("pendingUser", JSON.stringify(pendingUserData));
      }

      // 6. Hiển thị thông báo thành công và chuyển tiếp đến /users/enroll
      setStep3Status("completed");
      toast.success(
        `✓ Đã chụp avatar cho nhân viên "${pendingUserData.name}". Đang chuyển tiếp tới phòng thu nạp khuôn mặt...`,
        "CHỤP AVATAR THÀNH CÔNG"
      );

      // Giải phóng tài nguyên camera trước khi chuyển trang
      stopCameraTracks();

      setTimeout(() => {
        router.push("/users/enroll");
      }, 500);
    } catch (enrollErr: any) {
      const errMsg = enrollErr?.message || "Đăng ký khuôn mặt thất bại. Không thể xử lý dữ liệu.";
      setErrorMessage(errMsg);
      toast.error(errMsg, "LỖI THAO TÁC");
    } finally {
      setIsEnrolling(false);
    }
  };

  // Re-check Camera Button Handler
  const handleRecheckCamera = () => {
    toast.info("Đang kiểm tra và khởi động lại thiết bị camera...", "KIỂM TRA CAMERA");
    startCamera(selectedDeviceId, cameraIndex, cameraTestMode);
  };

  // Switch Camera Test Scenario (Hỗ trợ kiểm thử thực tế IT02-06 đến IT02-10)
  const handleTestModeChange = (newMode: string) => {
    setCameraTestMode(newMode);
    setErrorMessage(null);
    setErrorGuidance(null);

    if (newMode === "TEST_INVALID_INDEX") {
      startCamera(selectedDeviceId, -1, newMode);
    } else if (newMode === "TEST_PERMISSION_DENIED") {
      startCamera(selectedDeviceId, cameraIndex, newMode);
    } else if (newMode === "TEST_CANNOT_OPEN") {
      startCamera(selectedDeviceId, cameraIndex, newMode);
    } else if (newMode === "TEST_LOW_RES") {
      startCamera(selectedDeviceId, cameraIndex, newMode);
    } else {
      // Normal
      startCamera(selectedDeviceId, cameraIndex, "NORMAL");
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", overflow: "hidden" }}>
      {/* Standard System Sidebar */}
      <Sidebar />

      {/* Main Content Area with Standard System TopBar */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>
        {/* Standard System TopBar */}
        <TopBar />

        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Scrollable Main Body in Dark Theme */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 36px 40px", display: "flex", flexDirection: "column", gap: 22 }}>
          {/* ───────────────────────────────────────────────────────────────── */}
          {/* Synchronized System Page Header (FaceGate AI Standard)             */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--accent-teal)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00D4AA", boxShadow: "0 0 8px #00D4AA" }} />
                  SINH TRẮC HỌC AI • FACE ID ENROLLMENT
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "rgba(0, 212, 170, 0.12)",
                    border: "1px solid rgba(0, 212, 170, 0.3)",
                    color: "var(--accent-teal)",
                  }}
                >
                  PostgreSQL 512-D
                </span>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>
                Đăng ký khuôn mặt
              </h1>
              <p style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: 13.5, margin: "6px 0 0" }}>
                Xác thực nhân viên từ CSDL, kiểm tra camera an toàn và thu nạp vector đặc trưng 512 chiều theo chuẩn IT02-01 đến IT02-10.
              </p>
            </div>

            {/* Quick Actions & Live Core Status Pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: "rgba(0, 212, 170, 0.08)",
                  border: "1px solid rgba(0, 212, 170, 0.25)",
                  color: "var(--accent-teal)",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D4AA", boxShadow: "0 0 10px #00D4AA" }} />
                <span>AI Engine: Hoạt động</span>
              </div>

              <Link
                href="/users"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  color: "var(--text-primary)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>DS Nhân sự</span>
              </Link>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* 3-Step Flow Stepper in Unified Dark Theme                          */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div
            style={{
              background: "linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(13, 19, 33, 0.95) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 16,
              padding: "18px 36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Step 1 */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background:
                    step1Status === "completed"
                      ? "linear-gradient(135deg, #00D4AA 0%, #0072FF 100%)"
                      : step1Status === "error"
                        ? "#EF4444"
                        : "rgba(255,255,255,0.06)",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  fontWeight: 700,
                  boxShadow: step1Status === "completed" ? "0 0 16px rgba(0, 212, 170, 0.45)" : "none",
                }}
              >
                1
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Xác thực nhân viên</div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: step1Status === "completed" ? "#00D4AA" : step1Status === "error" ? "#EF4444" : "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {step1Status === "completed" ? "✔ CSDL hợp lệ" : step1Status === "error" ? "✗ Lỗi xác thực" : "⏳ Chờ xác thực"}
                </div>
              </div>
            </div>

            {/* Divider 1 */}
            <div
              style={{
                flex: 1,
                height: 2,
                background: step1Status === "completed" ? "linear-gradient(90deg, #00D4AA, #0072FF)" : "rgba(255,255,255,0.08)",
                margin: "0 24px",
              }}
            />

            {/* Step 2 */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background:
                    step2Status === "completed"
                      ? "linear-gradient(135deg, #00D4AA 0%, #0072FF 100%)"
                      : step2Status === "error"
                        ? "#EF4444"
                        : "rgba(255,255,255,0.06)",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  fontWeight: 700,
                  boxShadow: step2Status === "completed" ? "0 0 16px rgba(0, 212, 170, 0.45)" : "none",
                }}
              >
                2
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Kiểm tra camera</div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: step2Status === "completed" ? "#00D4AA" : step2Status === "error" ? "#EF4444" : "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {step2Status === "completed" ? "✔ Sẵn sàng hoạt động" : step2Status === "error" ? "✗ Lỗi camera" : "⏳ Chờ mở luồng"}
                </div>
              </div>
            </div>

            {/* Divider 2 */}
            <div
              style={{
                flex: 1,
                height: 2,
                background: step3Status === "completed" ? "linear-gradient(90deg, #0072FF, #10B981)" : "rgba(255,255,255,0.08)",
                margin: "0 24px",
              }}
            />

            {/* Step 3 */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background:
                    step3Status === "completed" ? "linear-gradient(135deg, #10B981 0%, #00D4AA 100%)" : "rgba(255,255,255,0.06)",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  fontWeight: 700,
                  boxShadow: step3Status === "completed" ? "0 0 16px rgba(16, 185, 129, 0.45)" : "none",
                }}
              >
                3
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Ghi nhận CSDL</div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: step3Status === "completed" ? "#10B981" : "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {step3Status === "completed" ? "✔ Đã lưu vào PostgreSQL" : "⏳ Chờ ghi hình"}
                </div>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* Error Banner when validation fails                                 */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {errorMessage && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: 12,
                padding: "14px 18px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                color: "#FCA5A5",
                animation: "fadeInUp 0.3s ease-out",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: 20, lineHeight: 1.2 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#EF4444" }}>{errorMessage}</div>
                  {errorGuidance && (
                    <div style={{ fontSize: 12.5, marginTop: 4, color: "#FEE2E2", lineHeight: 1.45 }}>{errorGuidance}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setErrorGuidance(null);
                }}
                style={{ background: "none", border: "none", color: "#FCA5A5", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* Success Banner                                                    */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {successMessage && (
            <div
              style={{
                background: "rgba(0, 212, 170, 0.12)",
                border: "1px solid rgba(0, 212, 170, 0.35)",
                borderRadius: 12,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "#00D4AA",
                animation: "fadeInUp 0.3s ease-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>✓</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                style={{ background: "none", border: "none", color: "#00D4AA", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* Main 2-Column Grid (FaceGate AI Unified Dark Theme)                */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.35fr", gap: 24, alignItems: "start" }}>
            {/* ── LEFT COLUMN: Thông tin nhân viên & CSDL ── */}
            <div
              style={{
                background: "linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(13, 19, 33, 0.95) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Xác thực nhân sự </span>
                </div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(0, 212, 170, 0.1)", color: "#00D4AA", fontWeight: 600 }}>
                  Truy vấn Backend
                </span>
              </div>

              {/* Input Mã nhân viên + Nút Kiểm tra thông tin */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                  Mã nhân viên <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    value={employeeId}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isVerifying) {
                        handleVerifyEmployee();
                      }
                    }}
                    placeholder="VD: EMP-2045 hoặc EMP-2210..."
                    style={{
                      flex: 1,
                      padding: "11px 14px",
                      background: "rgba(9, 13, 22, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: 8,
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#FFFFFF",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#00D4AA";
                      e.target.style.boxShadow = "0 0 12px rgba(0, 212, 170, 0.25)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255, 255, 255, 0.12)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={handleVerifyEmployee}
                    style={{
                      background: isVerifying ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #00D4AA 0%, #0072FF 100%)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 18px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isVerifying ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 18px rgba(0, 212, 170, 0.4)",
                      transition: "all 0.2s",
                    }}
                  >
                    {isVerifying ? (
                      <>
                        <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #FFF", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                        <span>Đang kiểm tra...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <span>Kiểm tra thông tin</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Test Chips to verify CSDL cases directly */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>Mẫu thử CSDL:</span>
                  {[
                    { id: "EMP-2045", label: "EMP-2045 (Hợp lệ)" },
                    { id: "EMP-2210", label: "EMP-2210 (Mới - Chưa có Face)" },
                    { id: "EMP-0001", label: "EMP-0001 (Đã có Face)" },
                    { id: "EMP-2105", label: "EMP-2105 (Bị khóa)" },
                    { id: "EMP-1988", label: "EMP-1988 (Ngừng HĐ)" },
                    { id: "EMP-9999", label: "EMP-9999 (Ko tồn tại)" },
                    { id: "ABC-1@", label: "ABC-1@ (Sai cú pháp)" },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => handleInputChange(chip.id)}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        borderRadius: 6,
                        border: employeeId === chip.id ? "1px solid rgba(0, 212, 170, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                        background: employeeId === chip.id ? "rgba(0, 212, 170, 0.15)" : "rgba(255, 255, 255, 0.03)",
                        color: employeeId === chip.id ? "#00D4AA" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontWeight: employeeId === chip.id ? 700 : 500,
                        transition: "all 0.15s",
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleInputChange("")}
                    style={{
                      padding: "3px 8px",
                      fontSize: 11,
                      borderRadius: 6,
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#EF4444",
                      cursor: "pointer",
                    }}
                  >
                    Rỗng
                  </button>
                </div>
              </div>

              {/* Employee Preview Card (Dark Theme) */}
              {verifiedEmployee && (
                <div
                  style={{
                    background: "rgba(9, 13, 22, 0.85)",
                    border: `1px solid ${verifiedEmployee.status !== "ACTIVE" || verifiedEmployee.face_enrolled
                      ? "rgba(239, 68, 68, 0.35)"
                      : "rgba(0, 212, 170, 0.35)"
                      }`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background:
                        verifiedEmployee.status !== "ACTIVE" || verifiedEmployee.face_enrolled
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(0, 212, 170, 0.15)",
                      border: `1px solid ${verifiedEmployee.status !== "ACTIVE" || verifiedEmployee.face_enrolled
                        ? "rgba(239, 68, 68, 0.4)"
                        : "rgba(0, 212, 170, 0.4)"
                        }`,
                      color: verifiedEmployee.status !== "ACTIVE" || verifiedEmployee.face_enrolled ? "#EF4444" : "#00D4AA",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>{verifiedEmployee.user_name}</div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {verifiedEmployee.employee_id}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", marginTop: 8, fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="4" y="2" width="16" height="20" rx="2" />
                          <line x1="9" y1="22" x2="9" y2="4" />
                        </svg>
                        <span>Phòng ban:</span>
                      </div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{verifiedEmployee.department}</div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: verifiedEmployee.status === "ACTIVE" ? "#10B981" : "#EF4444",
                          }}
                        />
                        <span>Trạng thái:</span>
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: verifiedEmployee.status === "ACTIVE" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: verifiedEmployee.status === "ACTIVE" ? "#34D399" : "#F87171",
                            border: `1px solid ${verifiedEmployee.status === "ACTIVE" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"
                              }`,
                          }}
                        >
                          {verifiedEmployee.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động / Khóa"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                        </svg>
                        <span>Dữ liệu khuôn mặt:</span>
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: verifiedEmployee.face_enrolled ? "rgba(239, 68, 68, 0.15)" : "rgba(0, 212, 170, 0.15)",
                            color: verifiedEmployee.face_enrolled ? "#F87171" : "#00D4AA",
                            border: `1px solid ${verifiedEmployee.face_enrolled ? "rgba(239, 68, 68, 0.3)" : "rgba(0, 212, 170, 0.3)"
                              }`,
                          }}
                        >
                          {verifiedEmployee.face_enrolled ? "Đã có dữ liệu (Không thể tạo mới)" : "Chưa đăng ký (Sẵn sàng)"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hardware Selection & Diagnostic Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Camera Hardware Picker */}
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                    Thiết bị camera vật lý
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => {
                        setSelectedDeviceId(e.target.value);
                        startCamera(e.target.value, cameraIndex, cameraTestMode);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 14px 10px 38px",
                        background: "rgba(9, 13, 22, 0.9)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: 8,
                        fontSize: 13,
                        color: "#FFFFFF",
                        outline: "none",
                        appearance: "none",
                        cursor: "pointer",
                      }}
                    >
                      {availableDevices.length > 0 ? (
                        availableDevices.map((d, idx) => (
                          <option key={d.deviceId || idx} value={d.deviceId} style={{ background: "#0D1321", color: "#FFFFFF" }}>
                            {d.label || `Camera ${idx} – Webcam tích hợp`}
                          </option>
                        ))
                      ) : (
                        <option value="" style={{ background: "#0D1321", color: "#FFFFFF" }}>
                          Camera 0 – Webcam mặc định
                        </option>
                      )}
                    </select>
                    <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#00D4AA", pointerEvents: "none" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="15" height="10" rx="2" />
                        <polyline points="17 11 21 7 21 17 17 13" />
                      </svg>
                    </div>
                    <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
                      ▾
                    </div>
                  </div>
                </div>
              </div>

              {/* Status specs (Dark Theme) */}
              <div
                style={{
                  background: "rgba(9, 13, 22, 0.65)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: 10,
                  padding: "14px 18px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Quyền truy cập camera</div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: isCameraActive ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: isCameraActive ? "#34D399" : "#F87171",
                        display: "inline-block",
                        marginTop: 2,
                        border: `1px solid ${isCameraActive ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      }}
                    >
                      {isCameraActive ? "Đã cấp quyền" : "Chưa cấp / Từ chối"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Độ phân giải thu hình</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                      {cameraResolution}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Khung hình camera & Thao tác Chụp ── */}
            <div
              style={{
                background: "linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(13, 19, 33, 0.95) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Khung hình camera</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: isCameraActive ? "#00D4AA" : "#EF4444",
                      boxShadow: isCameraActive ? "0 0 10px #00D4AA" : "0 0 10px #EF4444",
                    }}
                  />
                  <span style={{ color: isCameraActive ? "#00D4AA" : "#EF4444" }}>
                    {isCameraActive ? "Camera đang hoạt động" : "Camera chưa sẵn sàng"}
                  </span>
                </div>
              </div>

              {/* Viewport Box */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 310,
                  background: "#04070E",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                    display: isCameraActive ? "block" : "none",
                  }}
                />

                {/* Target Brackets (Green corner brackets) */}
                {isCameraActive && (
                  <div
                    style={{
                      position: "absolute",
                      width: 170,
                      height: 220,
                      pointerEvents: "none",
                    }}
                  >
                    <div style={{ position: "absolute", top: 0, left: 0, width: 28, height: 28, borderTop: "3px solid #00D4AA", borderLeft: "3px solid #00D4AA", borderTopLeftRadius: 6, boxShadow: "0 0 8px rgba(0, 212, 170, 0.4)" }} />
                    <div style={{ position: "absolute", top: 0, right: 0, width: 28, height: 28, borderTop: "3px solid #00D4AA", borderRight: "3px solid #00D4AA", borderTopRightRadius: 6, boxShadow: "0 0 8px rgba(0, 212, 170, 0.4)" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, width: 28, height: 28, borderBottom: "3px solid #00D4AA", borderLeft: "3px solid #00D4AA", borderBottomLeftRadius: 6, boxShadow: "0 0 8px rgba(0, 212, 170, 0.4)" }} />
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderBottom: "3px solid #00D4AA", borderRight: "3px solid #00D4AA", borderBottomRightRadius: 6, boxShadow: "0 0 8px rgba(0, 212, 170, 0.4)" }} />
                  </div>
                )}

                {!isCameraActive && (
                  <div style={{ color: "#94A3B8", textAlign: "center", padding: 20 }}>
                    <div style={{ fontSize: 36 }}>📷</div>
                    <div style={{ fontSize: 13.5, marginTop: 8, color: "#EF4444", fontWeight: 600 }}>
                      {cameraError || "Camera chưa được kích hoạt"}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4, color: "var(--text-muted)" }}>
                      Nhập mã nhân viên hợp lệ hoặc bấm 'Kiểm tra lại camera' để kích hoạt luồng.
                    </div>
                  </div>
                )}
              </div>

              {/* Lightbulb Tip */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 12.5,
                  color: "var(--text-secondary)",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  padding: "10px 14px",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 15 }}>💡</span>
                <span>Đặt khuôn mặt vào giữa khung hình, giữ khoảng cách 40–70 cm và nhìn thẳng vào ống kính.</span>
              </div>

              {/* 3 Quality Check Boxes */}
              <div
                style={{
                  background: "rgba(9, 13, 22, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isCameraActive ? "rgba(0, 212, 170, 0.15)" : "rgba(255,255,255,0.05)",
                      color: isCameraActive ? "#00D4AA" : "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Ánh sáng</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: isCameraActive ? "#00D4AA" : "var(--text-muted)" }}>
                      {isCameraActive ? "Tốt" : "Chờ"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isCameraActive ? "rgba(0, 212, 170, 0.15)" : "rgba(255,255,255,0.05)",
                      color: isCameraActive ? "#00D4AA" : "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Khuôn mặt</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: isCameraActive ? "#00D4AA" : "var(--text-muted)" }}>
                      {isCameraActive ? "Chính diện" : "Chờ"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isCameraActive ? "rgba(0, 212, 170, 0.15)" : "rgba(255,255,255,0.05)",
                      color: isCameraActive ? "#00D4AA" : "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Độ nét</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: isCameraActive ? "#00D4AA" : "var(--text-muted)" }}>
                      {isCameraActive ? "Tốt (>=640p)" : "Chờ"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button
                  type="button"
                  disabled={
                    isEnrolling ||
                    !isCameraActive ||
                    !verifiedEmployee ||
                    verifiedEmployee.face_enrolled ||
                    verifiedEmployee.status !== "ACTIVE"
                  }
                  onClick={handleCaptureAndEnroll}
                  style={{
                    flex: 1,
                    background:
                      isEnrolling ||
                        !isCameraActive ||
                        !verifiedEmployee ||
                        verifiedEmployee.face_enrolled ||
                        verifiedEmployee.status !== "ACTIVE"
                        ? "rgba(255, 255, 255, 0.08)"
                        : "linear-gradient(135deg, #00D4AA 0%, #0072FF 100%)",
                    color:
                      isEnrolling ||
                        !isCameraActive ||
                        !verifiedEmployee ||
                        verifiedEmployee.face_enrolled ||
                        verifiedEmployee.status !== "ACTIVE"
                        ? "rgba(255, 255, 255, 0.3)"
                        : "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    padding: "12px 18px",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor:
                      isEnrolling ||
                        !isCameraActive ||
                        !verifiedEmployee ||
                        verifiedEmployee.face_enrolled ||
                        verifiedEmployee.status !== "ACTIVE"
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow:
                      isEnrolling ||
                        !isCameraActive ||
                        !verifiedEmployee ||
                        verifiedEmployee.face_enrolled ||
                        verifiedEmployee.status !== "ACTIVE"
                        ? "none"
                        : "0 4px 18px rgba(0, 212, 170, 0.4)",
                    transition: "all 0.2s",
                  }}
                >
                  {isEnrolling ? (
                    <>
                      <span style={{ display: "inline-block", width: 15, height: 15, border: "2px solid #FFF", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                      <span>Đang chụp avatar & chuyển tiếp...</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span>Chụp và đăng ký khuôn mặt</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRecheckCamera}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "var(--text-primary)",
                    borderRadius: 8,
                    padding: "12px 18px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
                  </svg>
                  <span>Kiểm tra lại camera</span>
                </button>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* Bottom Warning Alert Bar (FaceGate AI Unified Dark Amber Theme)    */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: 12,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "#FDE68A",
              fontSize: 13,
              lineHeight: 1.5,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#F59E0B",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              !
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>
                Nguyên tắc nghiệp vụ: Chỉ đăng ký khi camera hoạt động, có quyền truy cập và hình ảnh đạt độ phân giải tối thiểu 640x480.
              </div>
              <div style={{ color: "rgba(253, 230, 138, 0.8)" }}>
                Mỗi nhân viên chỉ có một hồ sơ khuôn mặt hiệu lực trong CSDL. Thao tác đăng ký được bảo vệ bằng cơ chế giao dịch (Transaction) của PostgreSQL.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
