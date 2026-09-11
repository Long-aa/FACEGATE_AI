"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useRouter } from "next/navigation";

// Shared input style
const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none",
};

// ─── RightFacePanel: Real camera + file upload ────────────────────────────
function RightFacePanel({ onDeviceSelected }: { onDeviceSelected?: (deviceId: string) => void }) {
  const videoRef       = useRef<HTMLVideoElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);

  const [camStatus, setCamStatus]               = useState<"idle" | "connecting" | "live" | "error">("idle");
  const [devices, setDevices]                   = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Notify parent whenever it changes
  useEffect(() => {
    if (selectedDeviceId && onDeviceSelected) {
      onDeviceSelected(selectedDeviceId);
    }
  }, [selectedDeviceId, onDeviceSelected]);

  const [errorMsg, setErrorMsg]         = useState("");
  const [uploadFile, setUploadFile]     = useState<File | null>(null);
  const [uploadDone, setUploadDone]     = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState("");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamStatus("idle");
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startStream = useCallback(async (deviceId: string) => {
    setCamStatus("connecting");
    setErrorMsg("");
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamStatus("live");
    } catch (e: any) {
      const msg = e?.name === "NotFoundError" ? "Không tìm thấy camera. Hãy kiểm tra lại thiết bị."
        : e?.name === "NotAllowedError" ? "Bị từ chối quyền camera. Hãy cấp quyền trong trình duyệt."
        : (e?.message || String(e));
      setErrorMsg(msg);
      setCamStatus("error");
    }
  }, []);

  const handleAutoCamera = async () => {
    setCamStatus("connecting");
    try {
      // Get permission then enumerate
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(s => s.getTracks().forEach(t => t.stop()));
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter(d => d.kind === "videoinput");
      setDevices(cams);
      const firstId = cams[0]?.deviceId || "";
      setSelectedDeviceId(firstId);
      await startStream(firstId);
    } catch (e: any) {
      setErrorMsg("Không có quyền truy cập camera: " + (e?.message || ""));
      setCamStatus("error");
    }
  };

  const handleSwitchDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    await startStream(deviceId);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Check valid extensions: .zip, .jpg, .jpeg, .png
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    const isZip = ext === ".zip";
    const isImg = f.type.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp"].includes(ext);

    if (!isZip && !isImg) {
      setUploadError("Định dạng file không hỗ trợ. Vui lòng tải file nén .ZIP hoặc hình ảnh (.jpg, .png)");
      setUploadFile(null);
      setUploadDone(false);
      return;
    }

    setUploadError("");
    setUploadFile(f);
    setUploading(true);
    setUploadDone(false);
    setTimeout(() => { setUploading(false); setUploadDone(true); }, 2400);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "rgba(20,25,35,0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M5 3h4M3 5v4M19 3h-4M21 5v4M5 21h4M3 19v-4M19 21h-4M21 19v-4"/><circle cx="12" cy="12" r="3"/></svg>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Dữ liệu Face ID</h2>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: camStatus === "live" ? "rgba(0,212,170,0.1)" : "rgba(245,158,11,0.1)", color: camStatus === "live" ? "var(--accent-teal)" : "var(--accent-orange)", border: `1px solid ${camStatus === "live" ? "rgba(0,212,170,0.2)" : "rgba(245,158,11,0.2)"}` }}>
            {camStatus === "live" ? "● Camera LIVE" : "Chưa thu thập"}
          </span>
        </div>

        {/* Viewport */}
        <div style={{ borderRadius: 12, border: `1px solid ${camStatus === "live" ? "rgba(0,212,170,0.35)" : "rgba(255,255,255,0.06)"}`, overflow: "hidden", background: "#000", position: "relative", minHeight: 192, transition: "border-color 0.3s", boxShadow: camStatus === "live" ? "0 0 20px rgba(0,212,170,0.1)" : "none" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: 192, objectFit: "cover", display: camStatus === "live" ? "block" : "none", transform: "scaleX(-1)" }} />

          {camStatus !== "live" && (
            <div style={{ height: 192, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 16 }}>
              {camStatus === "connecting" && (
                <>
                  <div style={{ width: 30, height: 30, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Đang kết nối camera...</div>
                </>
              )}
              {camStatus === "error" && (
                <>
                  <div style={{ fontSize: 26 }}>⚠️</div>
                  <div style={{ fontSize: 11, color: "#ef4444", textAlign: "center", lineHeight: 1.6 }}>{errorMsg}</div>
                  <button onClick={handleAutoCamera} style={{ marginTop: 6, padding: "7px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Thử lại</button>
                </>
              )}
              {camStatus === "idle" && (
                <>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"><path d="M5 3h4M3 5v4M19 3h-4M21 5v4M5 21h4M3 19v-4M19 21h-4M21 19v-4"/></svg>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>OPENCV ENGINE V4.8</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Khung thu nhận: Sẵn sàng</div>
                </>
              )}
              {["TL","TR","BL","BR"].map(c => (
                <div key={c} style={{ position: "absolute", width: 14, height: 14, ...(c.includes("T") ? { top: 10 } : { bottom: 10 }), ...(c.includes("L") ? { left: 10 } : { right: 10 }), borderTop: c.includes("T") ? "2px solid rgba(0,198,255,0.35)" : "none", borderBottom: c.includes("B") ? "2px solid rgba(0,198,255,0.35)" : "none", borderLeft: c.includes("L") ? "2px solid rgba(0,198,255,0.35)" : "none", borderRight: c.includes("R") ? "2px solid rgba(0,198,255,0.35)" : "none" }} />
              ))}
            </div>
          )}

          {camStatus === "live" && (
            <>
              {["TL","TR","BL","BR"].map(c => (
                <div key={c} style={{ position: "absolute", width: 16, height: 16, ...(c.includes("T") ? { top: 10 } : { bottom: 10 }), ...(c.includes("L") ? { left: 10 } : { right: 10 }), borderTop: c.includes("T") ? "2px solid var(--accent-teal)" : "none", borderBottom: c.includes("B") ? "2px solid var(--accent-teal)" : "none", borderLeft: c.includes("L") ? "2px solid var(--accent-teal)" : "none", borderRight: c.includes("R") ? "2px solid var(--accent-teal)" : "none" }} />
              ))}
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 10, fontWeight: 700, color: "#ef4444", background: "rgba(0,0,0,0.75)", padding: "2px 7px", borderRadius: 5 }}>● REC LIVE</div>
              <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 9, color: "rgba(255,255,255,0.45)", background: "rgba(0,0,0,0.6)", padding: "2px 7px", borderRadius: 5 }}>FaceGate AI · OpenCV 4.8</div>
            </>
          )}
        </div>

        {/* Device selector (shown when multiple cams detected) */}
        {devices.length > 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Chọn thiết bị camera ({devices.length} thiết bị)</label>
            {devices.map((d, i) => (
              <button key={d.deviceId} onClick={() => handleSwitchDevice(d.deviceId)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: selectedDeviceId === d.deviceId ? "rgba(0,198,255,0.08)" : "rgba(255,255,255,0.025)", border: `1px solid ${selectedDeviceId === d.deviceId ? "rgba(0,198,255,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: selectedDeviceId === d.deviceId ? (camStatus === "live" ? "var(--accent-teal)" : "var(--accent-blue)") : "rgba(255,255,255,0.15)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: selectedDeviceId === d.deviceId ? "var(--accent-blue)" : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.label || `Camera ${i + 1}`}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                    {d.label?.toLowerCase().includes("integrated") || d.label?.toLowerCase().includes("built") || d.label?.toLowerCase().includes("internal") ? "📷 Webcam tích hợp" : "🔌 Camera ngoài / USB"}
                  </div>
                </div>
                {selectedDeviceId === d.deviceId && camStatus === "live" && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-teal)", flexShrink: 0 }}>LIVE</span>}
              </button>
            ))}
          </div>
        )}

        {/* Spec row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Độ phân giải yêu cầu</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>FHD 60FPS / 1080p</span>
        </div>

        <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          Hệ thống cần thu nạp <strong style={{ color: "var(--text-primary)" }}>15 – 30 khung ảnh</strong> các góc độ (chính diện, nghiêng 15°, ngửa nhẹ) để tạo vector nhúng 512-D.
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {camStatus !== "live" ? (
            <button onClick={handleAutoCamera} disabled={camStatus === "connecting"}
              style={{ width: "100%", padding: "12px", background: "rgba(0,198,255,0.12)", border: "1px solid rgba(0,198,255,0.35)", borderRadius: 10, color: "var(--accent-blue)", fontSize: 13, fontWeight: 700, cursor: camStatus === "connecting" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: camStatus === "connecting" ? 0.7 : 1 }}>
              {camStatus === "connecting" ? (
                <><div style={{ width: 14, height: 14, border: "2px solid rgba(0,198,255,0.3)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 0.75s linear infinite" }} /> Đang kết nối...</>
              ) : (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Bật Camera quét khuôn mặt</>
              )}
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAutoCamera}
                style={{ flex: 1, padding: "10px", background: "rgba(0,198,255,0.08)", border: "1px solid rgba(0,198,255,0.25)", borderRadius: 8, color: "var(--accent-blue)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                🔄 Đổi camera
              </button>
              <button onClick={stopCamera}
                style={{ flex: 1, padding: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                ⏹ Tắt camera
              </button>
            </div>
          )}

          {/* File upload */}
          <input ref={fileInputRef} type="file" accept=".zip,image/*" multiple onChange={handleFileChange} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()}
            style={{ width: "100%", padding: "11px", background: uploadDone ? "rgba(0,212,170,0.08)" : "rgba(255,255,255,0.05)", border: `1px solid ${uploadDone ? "rgba(0,212,170,0.25)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: uploadDone ? "var(--accent-teal)" : "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
            {uploading ? (
              <><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 0.75s linear infinite" }} /> Đang xử lý {uploadFile?.name}...</>
            ) : uploadDone ? (
              <>✓ Đã nạp: {uploadFile?.name?.slice(0, 20)}{(uploadFile?.name?.length ?? 0) > 20 ? "..." : ""}</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Tải lên thư mục ảnh mẫu (.zip / ảnh)</>
            )}
          </button>

          {uploadError && (
            <div style={{ fontSize: 11, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", padding: "8px 12px", borderRadius: 8 }}>
              ⚠️ {uploadError}
            </div>
          )}

          {uploading && (
            <div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg,#00C6FF,#0072FF)", borderRadius: 2, animation: "uploadFill 2.4s ease forwards" }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Đang phân tích & giải nén ảnh mẫu...</div>
            </div>
          )}
          {uploadDone && (
            <div style={{ padding: "9px 12px", background: "rgba(0,212,170,0.05)", border: "1px solid rgba(0,212,170,0.15)", borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-teal)" }}>✓ Tải lên thành công</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{uploadFile?.name} · {uploadFile ? (uploadFile.size / 1024).toFixed(0) + " KB" : ""}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function NewUserPage() {
  const router = useRouter();

  // ── Form state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: "",
    employeeId: `EMP-${Math.floor(2000 + Math.random() * 999)}`,
    email: "",
    phone: "",
    department: "Khối Kỹ thuật & R&D",
    role: "Kỹ sư AI / Lập trình viên cao cấp",
    accessLevel: "rd",
    accessAreas: ["Cửa chính Lobby", "Phòng Server Kỹ thuật", "Cửa phân tầng Thang máy"],
    timeframe: "office",
    rfid: "8A4F-C092",
    pin: "123456",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  // Avatar & Webcam capture state
  const [avatarUrl, setAvatarUrl] = useState<string>("https://i.pravatar.cc/150?u=1");
  const [avatarError, setAvatarError] = useState<string>("");
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Quick webcam modal
  const [webcamModalOpen, setWebcamModalOpen] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamModalError, setWebcamModalError] = useState("");
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  const set = (k: string, v: string | string[]) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[k];
        return copy;
      });
    }
  };

  const generateNewEmpId = () => {
    const newId = `EMP-${Math.floor(2000 + Math.random() * 999)}`;
    setForm(f => ({ ...f, employeeId: newId }));
    if (errors.employeeId) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.employeeId;
        return copy;
      });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) {
      e.name = "Họ và tên đầy đủ không được để trống";
    }
    if (!form.employeeId.trim()) {
      e.employeeId = "Mã nhân viên không được để trống";
    }
    if (!form.email.trim()) {
      e.email = "Email doanh nghiệp không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = "Email không đúng định dạng (ví dụ: ten.ho@company.corp)";
    }
    if (form.phone.trim() && !/^[0-9+() -]{9,15}$/.test(form.phone.trim())) {
      e.phone = "Số điện thoại không hợp lệ (từ 9 đến 15 chữ số)";
    }
    if (!form.department.trim()) {
      e.department = "Vui lòng chọn phòng ban";
    }
    if (!form.role.trim()) {
      e.role = "Chức danh vận hành không được để trống";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Avatar file upload handler (IT01-008)
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const validExts = [".jpg", ".jpeg", ".png"];
    const validMime = file.type === "image/jpeg" || file.type === "image/png";

    if (!validMime && !validExts.includes(ext)) {
      setAvatarError("Định dạng không hợp lệ. Chỉ chấp nhận file JPG hoặc PNG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.");
      return;
    }

    setAvatarError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setAvatarUrl(ev.target.result as string);
        showToast("✓ Đã tải ảnh thẻ thành công");
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick webcam snapshot handlers (IT01-009, IT01-010)
  const openWebcamCapture = async () => {
    setWebcamModalOpen(true);
    setWebcamModalError("");
    setAvatarError("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ API truy cập camera.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setWebcamStream(stream);
      setTimeout(() => {
        if (modalVideoRef.current) {
          modalVideoRef.current.srcObject = stream;
          modalVideoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      const msg = err?.name === "NotFoundError"
        ? "Không tìm thấy thiết bị camera. Hãy kiểm tra kết nối thiết bị."
        : err?.name === "NotAllowedError"
        ? "Bị từ chối quyền truy cập camera. Hãy cho phép quyền trong trình duyệt."
        : (err?.message || "Lỗi truy cập camera");
      setWebcamModalError(msg);
      setAvatarError(msg);
    }
  };

  const closeWebcamCapture = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
      setWebcamStream(null);
    }
    setWebcamModalOpen(false);
    setWebcamModalError("");
  };

  const captureWebcamSnapshot = () => {
    if (!modalVideoRef.current) return;
    try {
      const video = modalVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setAvatarUrl(dataUrl);
        setAvatarError("");
        showToast("✓ Đã chụp ảnh thẻ từ Webcam thành công");
      }
    } catch (e: any) {
      setAvatarError("Lỗi khi chụp khung hình: " + (e?.message || ""));
    }
    closeWebcamCapture();
  };

  // Persist to sessionStorage so enroll page can read it (IT01-014)
  const persistUser = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pendingUser", JSON.stringify({
        ...form,
        id: form.employeeId,
        avatarUrl,
        selectedCameraId
      }));
    }
  };

  // Cancel handler (IT01-015: Hủy bỏ không lưu dữ liệu chưa xác nhận)
  const handleCancel = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("pendingUser");
    }
    router.push("/users");
  };

  // Save WITHOUT face enroll (IT01-013)
  const handleSaveOnly = () => {
    if (!validate()) return;
    setSaving(true);
    persistUser();
    setTimeout(() => {
      setSaving(false);
      showToast(`Đã tạo người dùng ${form.name || form.employeeId} — trạng thái: Chờ nạp Face`);
      setTimeout(() => router.push("/users"), 1200);
    }, 800);
  };

  // Save AND go to face enroll (IT01-014)
  const handleSaveAndEnroll = () => {
    if (!validate()) return;
    setSaving(true);
    persistUser();
    setTimeout(() => {
      setSaving(false);
      router.push("/users/enroll");
    }, 600);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Header (IT01-001) */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, color: "var(--accent-blue)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-blue)" }} />
                HỒ SƠ THỰC THỂ SỐ #{form.employeeId}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Thêm người dùng mới</h1>
              <p style={{ color: "var(--text-secondary)", marginTop: 8, fontSize: 14 }}>
                Nhập thông tin nhân sự, cấu hình quyền ra vào các phân khu và khởi tạo vector nhận diện khuôn mặt OpenCV.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {/* Hủy bỏ (IT01-015) */}
              <button
                type="button"
                onClick={handleCancel}
                style={{ padding: "10px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Hủy bỏ
              </button>
              {/* Save WITHOUT face enroll (IT01-013) */}
              <button
                type="button"
                onClick={handleSaveOnly}
                disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Lưu và không đăng ký khuôn mặt
              </button>
              {/* Save AND go to face enroll (IT01-014) */}
              <button
                type="button"
                onClick={handleSaveAndEnroll}
                disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#00C6FF,#0072FF)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 15px rgba(0,114,255,0.3)", opacity: saving ? 0.7 : 1 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 3h4M3 5v4M19 3h-4M21 5v4M5 21h4M3 19v-4M19 21h-4M21 19v-4"/><circle cx="12" cy="12" r="3"/></svg>
                Lưu & Đăng ký khuôn mặt
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, flex: 1, minHeight: 0 }}>
            {/* Left Column */}
            <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Thông tin nhân viên cơ bản */}
              <div style={{ background: "rgba(20,25,35,0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Thông tin nhân viên cơ bản</h2>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 6, color: "var(--text-muted)" }}>Bắt buộc</span>
                </div>

                {/* Avatar Section (IT01-008, IT01-009, IT01-010) */}
                <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
                  <div style={{ width: 100, height: 100, borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px dashed rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    <img src={avatarUrl} alt="Avatar thẻ nhân viên" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <input ref={avatarFileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: "none" }} onChange={handleAvatarUpload} />
                      <button
                        type="button"
                        onClick={() => avatarFileInputRef.current?.click()}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Tải ảnh thẻ
                      </button>
                      <button
                        type="button"
                        onClick={openWebcamCapture}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        Chụp nhanh Webcam
                      </button>
                    </div>
                    {avatarError && (
                      <span style={{ fontSize: 12, color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
                        ⚠️ {avatarError}
                      </span>
                    )}
                    <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                      Hỗ trợ JPG, PNG (tối đa 5MB). Khuôn mặt chụp chính diện, không đeo khẩu trang hoặc kính râm.
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Họ tên (IT01-002) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Họ và tên đầy đủ *</label>
                    <input
                      value={form.name} onChange={e => set("name", e.target.value)}
                      placeholder="Nguyễn Văn A"
                      style={{ ...inp, border: errors.name ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)" }}
                    />
                    {errors.name && <span style={{ fontSize: 11, color: "#ef4444" }}>{errors.name}</span>}
                  </div>

                  {/* Mã nhân viên (IT01-003) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Mã nhân viên *</label>
                      <span onClick={generateNewEmpId} style={{ fontSize: 11, color: "var(--accent-blue)", cursor: "pointer", fontWeight: 600 }}>
                        Tạo mã tự động
                      </span>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        value={form.employeeId} onChange={e => set("employeeId", e.target.value)}
                        style={{ ...inp, background: "rgba(0,114,255,0.05)", border: errors.employeeId ? "1px solid #ef4444" : "1px solid rgba(0,114,255,0.3)", color: "var(--accent-blue)", fontWeight: 600 }}
                      />
                      <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--accent-blue)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    {errors.employeeId && <span style={{ fontSize: 11, color: "#ef4444" }}>{errors.employeeId}</span>}
                  </div>

                  {/* Email (IT01-004) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Email doanh nghiệp *</label>
                    <input
                      value={form.email} onChange={e => set("email", e.target.value)}
                      placeholder="ten.ho@company.corp"
                      style={{ ...inp, border: errors.email ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)" }}
                    />
                    {errors.email && <span style={{ fontSize: 11, color: "#ef4444" }}>{errors.email}</span>}
                  </div>

                  {/* Phone (IT01-005) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Số điện thoại liên hệ (tùy chọn)</label>
                    <input
                      value={form.phone} onChange={e => set("phone", e.target.value)}
                      placeholder="09xx xxx xxx"
                      style={{ ...inp, border: errors.phone ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)" }}
                    />
                    {errors.phone && <span style={{ fontSize: 11, color: "#ef4444" }}>{errors.phone}</span>}
                  </div>

                  {/* Phòng ban (IT01-006) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Phòng ban *</label>
                    <select
                      value={form.department} onChange={e => set("department", e.target.value)}
                      style={{ ...inp, border: errors.department ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <option value="">-- Chọn phòng ban --</option>
                      {["Khối Kỹ thuật & R&D","Kế toán","Kinh doanh","Khối Vận hành","Nhân sự"].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    {errors.department && <span style={{ fontSize: 11, color: "#ef4444" }}>{errors.department}</span>}
                  </div>

                  {/* Chức danh (IT01-007) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Chức danh vận hành *</label>
                    <input
                      value={form.role} onChange={e => set("role", e.target.value)}
                      placeholder="Kỹ sư AI / Nhân viên..."
                      style={{ ...inp, border: errors.role ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)" }}
                    />
                    {errors.role && <span style={{ fontSize: 11, color: "#ef4444" }}>{errors.role}</span>}
                  </div>
                </div>
              </div>

              {/* Phân quyền & Kiểm soát cửa (IT01-016) */}
              <div style={{ background: "rgba(20,25,35,0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Phân quyền & Kiểm soát cửa (Access Control)</h2>
                  </div>
                  <div style={{ background: "rgba(0,198,255,0.1)", border: "1px solid rgba(0,198,255,0.2)", borderRadius: 6, padding: "4px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-blue)" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-blue)" }}>Real-time Lock Sync</span>
                  </div>
                </div>

                {/* Cấp độ phân quyền nhanh */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12, display: "block" }}>Cấp độ phân quyền nhanh</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div style={{ padding: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, cursor: "pointer", position: "relative" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Cơ bản - Văn phòng</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Cửa sảnh chính & Căng tin</div>
                      <div style={{ position: "absolute", top: 12, right: 12, width: 16, height: 16, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)" }} />
                    </div>
                    <div style={{ padding: "12px", background: "rgba(0,212,170,0.05)", border: "1px solid rgba(0,212,170,0.5)", borderRadius: 10, cursor: "pointer", position: "relative" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-teal)" }}>Nhân viên R&D Tiêu chuẩn</div>
                      <div style={{ fontSize: 11, color: "var(--text-primary)", marginTop: 4 }}>Khu vực làm việc + Lab công nghệ</div>
                      <div style={{ position: "absolute", top: 12, right: 12, width: 16, height: 16, borderRadius: "50%", background: "var(--accent-teal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    </div>
                    <div style={{ padding: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, cursor: "pointer", position: "relative" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Toàn quyền Quản trị</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Tất cả các cửa + Server Room</div>
                      <div style={{ position: "absolute", top: 12, right: 12, width: 16, height: 16, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)" }} />
                    </div>
                  </div>
                </div>

                {/* Danh mục thiết bị cửa */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Danh mục thiết bị cửa được phép mở khóa</label>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Đã chọn: <strong style={{ color: "var(--text-primary)" }}>3 / 4</strong> cửa</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Cửa chính Lobby - Tầng 1</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Khóa từ nam châm • Cam IP #01</div>
                      </div>
                      <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: "var(--accent-teal)", cursor: "pointer" }} />
                    </div>
                    <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Phòng Server Kỹ thuật</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Chốt thả điện từ • Cam IP #03</div>
                      </div>
                      <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: "var(--accent-teal)", cursor: "pointer" }} />
                    </div>
                    <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Cửa phân tầng Thang máy</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Rơle bộ gọi tầng • Tầng 2-6</div>
                      </div>
                      <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: "var(--accent-teal)", cursor: "pointer" }} />
                    </div>
                    <div style={{ padding: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12, opacity: 0.7 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Cửa kho Thiết bị R&D</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Cửa cuốn tự động • Khu B</div>
                      </div>
                      <input type="checkbox" style={{ width: 18, height: 18, cursor: "pointer" }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12, display: "block" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "-2px", marginRight: 6 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Khung giờ hiệu lực ra vào
                    </label>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ flex: 1, padding: "10px", background: "rgba(0,114,255,0.05)", border: "1px solid rgba(0,114,255,0.3)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--bg-primary)", border: "5px solid var(--accent-blue)" }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-blue)" }}>Giờ hành chính</div>
                          <div style={{ fontSize: 10, color: "var(--text-primary)" }}>08:00 - 18:00 (T2-T7)</div>
                        </div>
                      </div>
                      <div style={{ flex: 1, padding: "10px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)" }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Toàn thời gian</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>24/7 (Không giới hạn)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "-2px", marginRight: 6 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Mã thẻ RFID / PIN dự phòng
                      </label>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Tùy chọn</span>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <input value={form.rfid} onChange={e => set("rfid", e.target.value)} style={{ flex: 1, padding: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontFamily: "monospace", outline: "none", textAlign: "center", letterSpacing: "1px" }} />
                      <input type="password" value={form.pin} onChange={e => set("pin", e.target.value)} placeholder="******" style={{ flex: 1, padding: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontFamily: "monospace", outline: "none", textAlign: "center", letterSpacing: "2px" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom save bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                  Dữ liệu mã hóa SHA-256 nội bộ trước khi lưu trữ.
                </div>
                <button
                  type="button"
                  onClick={handleSaveOnly}
                  disabled={saving}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "12px 24px",
                    background: "linear-gradient(135deg, #00C6FF, #0072FF)", border: "none",
                    borderRadius: 10, color: "white", fontSize: 14, fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 15px rgba(0, 114, 255, 0.3)",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  {saving ? "Đang lưu hồ sơ..." : "Lưu hồ sơ người dùng"}
                </button>
              </div>
            </div>

            {/* Right Column — with REAL camera + summary */}
            <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
              <RightFacePanel onDeviceSelected={setSelectedCameraId} />

              {/* Tóm tắt trạng thái hồ sơ */}
              <div style={{ background: "rgba(20,25,35,0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Tóm tắt trạng thái hồ sơ</h2>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Ngày khởi tạo</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Hôm nay, 11/09/2026</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Cán bộ thực hiện</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-green)" }} />
                      Admin Security
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: "1px dashed rgba(255,255,255,0.1)", borderBottom: "1px dashed rgba(255,255,255,0.1)" }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Trạng thái thẻ nhân sự</span>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 8px", background: "rgba(255,255,255,0.1)", borderRadius: 6, color: "var(--text-primary)" }}>Bản nháp (Draft)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Trạng thái Face ID</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--accent-orange)" }}>Chờ kích hoạt AI</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Đồng bộ Controller</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Đang chờ lưu dữ liệu</span>
                  </div>

                  <div style={{ marginTop: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                      <span style={{ color: "var(--text-secondary)" }}>Tiến trình hồ sơ</span>
                      <span style={{ fontWeight: 600, color: "var(--accent-blue)" }}>60% hoàn tất</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: "60%", height: "100%", background: "linear-gradient(90deg, #00C6FF, #0072FF)", borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Quick Webcam Capture Modal (IT01-009, IT01-010) */}
      {webcamModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#111722", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, width: "100%", maxWidth: 520, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "white" }}>
                <span>📷</span> Chụp nhanh ảnh thẻ từ Webcam
              </div>
              <button type="button" onClick={closeWebcamCapture} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
              <div style={{ width: "100%", height: 320, background: "#000", borderRadius: 12, overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {webcamModalError ? (
                  <div style={{ padding: 20, textAlign: "center", color: "#ef4444", fontSize: 13, lineHeight: 1.6 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
                    {webcamModalError}
                  </div>
                ) : (
                  <>
                    <video ref={modalVideoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                    <div style={{ position: "absolute", width: 180, height: 230, border: "2px dashed var(--accent-blue)", borderRadius: "50%", pointerEvents: "none", boxShadow: "0 0 20px rgba(0,198,255,0.3) inset" }} />
                    <div style={{ position: "absolute", bottom: 12, fontSize: 11, color: "rgba(255,255,255,0.8)", background: "rgba(0,0,0,0.6)", padding: "4px 10px", borderRadius: 6 }}>
                      Đặt khuôn mặt trong vòng tròn để chụp ảnh thẻ
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, width: "100%" }}>
                <button type="button" onClick={closeWebcamCapture} style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Hủy thao tác
                </button>
                {!webcamModalError && (
                  <button type="button" onClick={captureWebcamSnapshot} style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#00C6FF,#0072FF)", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    📸 Chụp ảnh ngay
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 99999, display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: "rgba(0,20,14,0.95)", border: "1px solid rgba(0,212,170,0.4)", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,212,170,0.2)", animation: "slideUp 0.3s ease" }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{toast}</span>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes uploadFill { from { width: 0%; } to { width: 100%; } }
        input, select { color-scheme: dark; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.3); }
        input:focus, select:focus { border-color: rgba(0,198,255,0.4) !important; box-shadow: 0 0 0 2px rgba(0,198,255,0.1); }
      ` }} />
    </div>
  );
}
