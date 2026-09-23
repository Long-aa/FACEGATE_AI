"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/ToastNotification";

interface Camera {
  id: string;
  name: string;
  camId: string;
  status: "Online" | "Offline";
  fps: number;
  latency: number;
  resolution: string;
  resLabel: string;
  type: "entrance" | "parking" | "server";
  rtspUrl?: string;
  ipAddress?: string;
}

function CameraFeedMock({ type, status }: { type: Camera["type"]; status: Camera["status"] }) {
  if (status === "Offline") {
    return (
      <div style={{ position: "absolute", inset: 0, background: "#050d18", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
          <path d="M1 1l22 22M17 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3m3.5-1H20a2 2 0 0 1 2 2v11.5M9 9l9.5 9.5"/><path d="M15 12a3 3 0 0 0-3-3"/>
        </svg>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>KHÔNG CÓ TÍN HIỆU CSDL</span>
      </div>
    );
  }
  const gradients: Record<Camera["type"], string> = {
    entrance: "radial-gradient(ellipse at 40% 60%, #0d2035 0%, #050d18 60%)",
    parking: "radial-gradient(ellipse at 50% 40%, #0a1a10 0%, #050d18 60%)",
    server: "radial-gradient(ellipse at 60% 40%, #1a0d2e 0%, #050d18 60%)",
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: gradients[type] || gradients.entrance }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,170,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.02) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
      <div style={{ position: "absolute", bottom: "20%", left: "30%", width: 20, height: 30, background: "rgba(255,255,255,0.06)", borderRadius: 2 }} />
      <div style={{ position: "absolute", bottom: "20%", left: "50%", width: 15, height: 25, background: "rgba(255,255,255,0.04)", borderRadius: 2 }} />
    </div>
  );
}

export default function CamerasPage() {
  const router = useRouter();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<0 | 1 | 2>(0);
  const [camType, setCamType] = useState<"ip" | "webcam" | "nvr" | null>(null);

  // New Camera Form
  const [newCamName, setNewCamName] = useState("");
  const [newCamRtsp, setNewCamRtsp] = useState("");
  const [newCamIp, setNewCamIp] = useState("192.168.1.100");
  const [newCamPort, setNewCamPort] = useState("554");
  const [newCamLocation, setNewCamLocation] = useState("Cửa chính");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [cameraToDelete, setCameraToDelete] = useState<Camera | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load real cameras from DB
  const loadCameras = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.cameras.list();
      if (Array.isArray(data)) {
        const mapped: Camera[] = data.map((c: any) => {
          const isOnline = c.status?.toUpperCase() === "ONLINE";
          const res = c.resolution || "1920×1080";
          return {
            id: c.id,
            name: c.name,
            camId: c.name.toUpperCase().slice(0, 8),
            status: isOnline ? "Online" : "Offline",
            fps: c.fps || (isOnline ? 30 : 0),
            latency: c.latency_ms || (isOnline ? 18 : 0),
            resolution: res,
            resLabel: res.includes("1080") ? "1080p" : res.includes("720") ? "720p" : "FHD",
            type: c.name.toLowerCase().includes("server") ? "server" : c.name.toLowerCase().includes("hầm") || c.name.toLowerCase().includes("bãi") ? "parking" : "entrance",
            rtspUrl: c.rtsp_url,
            ipAddress: c.ip_address,
          };
        });
        setCameras(mapped);
      }
    } catch (err) {
      console.error("Failed to load cameras from DB:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  // Test camera connection in DB
  const handleTestCamera = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.cameras.test(id);
      toast.success(
        `Trạng thái: ${res.status} • Độ trễ: ${res.latency_ms || 18}ms • ${res.message || "Kết nối ổn định"}`,
        "KIỂM TRA CAMERA THÀNH CÔNG"
      );
      await loadCameras();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi kiểm tra kết nối camera.", "KIỂM TRA THẤT BẠI");
    } finally {
      setTestingId(null);
    }
  };

  // Toggle status in DB
  const handleToggleStatus = async (id: string) => {
    try {
      await api.cameras.toggleStatus(id);
      toast.info("Đã cập nhật trạng thái camera trong CSDL.");
      await loadCameras();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi thay đổi trạng thái camera.");
    }
  };

  // Delete Camera from DB
  const handleDeleteCamera = async () => {
    if (!cameraToDelete) return;
    setDeletingId(cameraToDelete.id);
    try {
      await api.cameras.delete(cameraToDelete.id);
      toast.success(`Đã xóa camera "${cameraToDelete.name}" khỏi CSDL thành công!`, "XÓA THÀNH CÔNG");
      setCameraToDelete(null);
      await loadCameras();
    } catch (err: any) {
      console.error("Failed to delete camera:", err);
      toast.error(err.message || "Lỗi khi xóa camera khỏi cơ sở dữ liệu.", "XÓA THẤT BẠI");
    } finally {
      setDeletingId(null);
    }
  };

  // Create Camera in DB
  const handleCreateCamera = async () => {
    if (!newCamName.trim()) {
      toast.warning("Vui lòng nhập tên camera!", "THIẾU THÔNG TIN");
      return;
    }
    try {
      await api.cameras.create({
        name: newCamName,
        camera_type: camType === "webcam" ? "WEBCAM" : "RTSP",
        ip_address: newCamIp,
        port: parseInt(newCamPort) || 554,
        rtsp_url: newCamRtsp || `rtsp://${newCamIp}:${newCamPort}/live`,
        location: newCamLocation,
        resolution: "1920x1080",
        fps: 30,
        status: "ONLINE",
      });
      setModalStep(0);
      setCamType(null);
      toast.success(`Đã thêm camera "${newCamName}" vào CSDL!`, "THÊM CAMERA THÀNH CÔNG");
      setNewCamName("");
      setNewCamRtsp("");
      await loadCameras();
    } catch (err) {
      console.error("Failed to create camera in DB:", err);
      toast.error("Lỗi khi thêm camera vào CSDL.", "THÊM CAMERA THẤT BẠI");
    }
  };

  const filtered = cameras.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.camId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Danh sách Camera (Từ CSDL)</h1>
              <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>Giám sát và quản lý tất cả các luồng camera được cấu hình trong PostgreSQL.</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm camera..."
                  style={{ padding: "9px 12px 9px 36px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none", width: 200 }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--accent-teal)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                />
              </div>
              <button 
                onClick={() => { setModalStep(1); setCamType(null); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 15px rgba(0,212,170,0.3)", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,212,170,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,212,170,0.3)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Thêm camera vào CSDL
              </button>
            </div>
          </div>

          {/* Camera grid */}
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              Đang tải danh sách camera từ CSDL...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              Không tìm thấy camera nào trong cơ sở dữ liệu.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {filtered.map((cam) => (
                <div
                  key={cam.id}
                  onMouseEnter={() => setHovered(cam.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: "var(--bg-card)", border: `1px solid ${hovered === cam.id ? "rgba(0,212,170,0.25)" : "var(--border)"}`,
                    borderRadius: 14, overflow: "hidden", transition: "all 0.2s ease",
                    transform: hovered === cam.id ? "translateY(-2px)" : "none",
                    boxShadow: hovered === cam.id ? "0 8px 30px rgba(0,0,0,0.4)" : "none",
                  }}
                >
                  {/* Camera thumbnail */}
                  <div style={{ position: "relative", height: 160, overflow: "hidden" }}>
                    <CameraFeedMock type={cam.type} status={cam.status} />
                    {/* Status badge */}
                    <div style={{
                      position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 5,
                      padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: cam.status === "Online" ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)",
                      color: "white", backdropFilter: "blur(4px)",
                    }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "white", opacity: 0.8 }} />
                      {cam.status === "Online" ? "TRỰC TUYẾN" : "NGOẠI TUYẾN"}
                    </div>
                    {/* Cam ID tag */}
                    <div style={{ position: "absolute", bottom: 10, left: 10, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 4 }}>
                      {cam.camId}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Camera {cam.camId} – {cam.name}</div>

                    {/* Stats grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>TRẠNG THÁI</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: cam.status === "Online" ? "var(--accent-green)" : "var(--accent-red)", marginTop: 3 }}>{cam.status === "Online" ? "Trực tuyến" : "Ngoại tuyến"}</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>FPS / ĐỘ TRỄ</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 3 }}>
                          {cam.status === "Online" ? `${cam.fps} / ${cam.latency}ms` : "-- / --"}
                        </div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px", gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>ĐỘ PHÂN GIẢI & ĐỊA CHỈ</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginTop: 3, fontFamily: "monospace" }}>
                          {cam.resolution} • {cam.ipAddress || "LAN/RTSP"}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => router.push("/recognition")}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.2)", borderRadius: 8, color: "var(--accent-teal)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        Xem
                      </button>
                      <button
                        onClick={() => handleToggleStatus(cam.id)}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                        Bật/Tắt
                      </button>
                      <button
                        disabled={testingId === cam.id}
                        onClick={() => handleTestCamera(cam.id)}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 8, color: "var(--accent-blue)", fontSize: 12, fontWeight: 500, cursor: testingId === cam.id ? "not-allowed" : "pointer" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                        {testingId === cam.id ? "Test..." : "Test"}
                      </button>
                      <button
                        onClick={() => setCameraToDelete(cam)}
                        title="Xóa camera khỏi CSDL"
                        style={{ width: 34, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: "var(--accent-red)", cursor: "pointer", transition: "all 0.15s ease" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modals for Add Camera */}
      {modalStep > 0 && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 16, width: "100%", maxWidth: 500,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            display: "flex", flexDirection: "column",
            animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                {modalStep === 1 ? "Chọn loại Camera" : "Nhập thông tin kết nối CSDL"}
              </h2>
              <button onClick={() => { setModalStep(0); setCamType(null); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            
            <div style={{ padding: "24px", flex: 1 }}>
              {modalStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { id: "webcam", title: "Webcam / Camera máy tính", desc: "Sử dụng camera được kết nối trực tiếp qua USB hoặc tích hợp sẵn." },
                    { id: "ip", title: "Camera IP (RTSP / ONVIF)", desc: "Kết nối camera qua mạng LAN/WAN bằng địa chỉ IP." },
                    { id: "nvr", title: "Đầu ghi (DVR / NVR)", desc: "Kết nối hệ thống camera thông qua đầu ghi tập trung." }
                  ].map(type => (
                    <label key={type.id} 
                      style={{ display: "flex", gap: 14, padding: "16px", background: camType === type.id ? "rgba(0,212,170,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${camType === type.id ? "rgba(0,212,170,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}
                      onClick={() => setCamType(type.id as any)}
                    >
                      <input type="radio" name="camType" checked={camType === type.id} readOnly style={{ accentColor: "var(--accent-teal)", marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{type.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{type.desc}</div>
                      </div>
                    </label>
                  ))}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                    <button
                      disabled={!camType}
                      onClick={() => setModalStep(2)}
                      style={{ padding: "9px 20px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 8, color: "white", fontWeight: 600, cursor: camType ? "pointer" : "not-allowed", opacity: camType ? 1 : 0.5 }}
                    >
                      Tiếp tục →
                    </button>
                  </div>
                </div>
              )}

              {modalStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Tên camera</label>
                    <input
                      value={newCamName}
                      onChange={e => setNewCamName(e.target.value)}
                      placeholder="VD: Cửa chính Lobby"
                      style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Vị trí lắp đặt</label>
                    <input
                      value={newCamLocation}
                      onChange={e => setNewCamLocation(e.target.value)}
                      placeholder="VD: Tầng 1 - Sảnh A"
                      style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                    />
                  </div>

                  {camType === "webcam" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Chọn thiết bị</label>
                      <select style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                        <option>Camera chính (USB 0)</option>
                        <option>Webcam tích hợp</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Địa chỉ IP</label>
                          <input
                            value={newCamIp}
                            onChange={e => setNewCamIp(e.target.value)}
                            placeholder="192.168.1.100"
                            style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Port</label>
                          <input
                            value={newCamPort}
                            onChange={e => setNewCamPort(e.target.value)}
                            placeholder="554"
                            style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>RTSP Stream URL</label>
                        <input
                          value={newCamRtsp}
                          onChange={e => setNewCamRtsp(e.target.value)}
                          placeholder="rtsp://192.168.1.100:554/live"
                          style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                        />
                      </div>
                    </>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button
                      onClick={() => setModalStep(1)}
                      style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer" }}
                    >
                      ← Quay lại
                    </button>
                    <button
                      onClick={handleCreateCamera}
                      style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg,#00D4AA,#3B82F6)", border: "none", borderRadius: 8, color: "white", fontWeight: 700, cursor: "pointer" }}
                    >
                      Lưu camera vào CSDL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Camera */}
      {cameraToDelete && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 16, width: "100%", maxWidth: 440, padding: "24px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.15)",
            display: "flex", flexDirection: "column", gap: 16,
            animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", fontSize: 20 }}>
                🗑️
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Xác nhận xóa Camera</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>Thao tác này sẽ xóa vĩnh viễn khỏi CSDL PostgreSQL.</p>
              </div>
            </div>

            <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{cameraToDelete.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                Mã: <span style={{ color: "var(--accent-teal)" }}>{cameraToDelete.camId}</span> • Độ phân giải: {cameraToDelete.resolution}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                RTSP: <span style={{ fontFamily: "monospace" }}>{cameraToDelete.rtspUrl || cameraToDelete.ipAddress || "Local"}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => setCameraToDelete(null)}
                style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={handleDeleteCamera}
                style={{ flex: 1.5, padding: "10px", background: "linear-gradient(135deg, #EF4444, #B91C1C)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 700, cursor: deletingId ? "not-allowed" : "pointer", boxShadow: "0 4px 15px rgba(239, 68, 68, 0.35)", opacity: deletingId ? 0.7 : 1 }}
              >
                {deletingId ? "Đang xóa..." : "Xóa camera ngay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
