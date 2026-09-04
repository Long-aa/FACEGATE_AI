"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

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
}

const mockCameras: Camera[] = [
  { id: "1", name: "Cửa chính", camId: "CAM-01", status: "Online", fps: 30, latency: 12, resolution: "1920×1080", resLabel: "1080p", type: "entrance" },
  { id: "2", name: "Hầm B1", camId: "CAM-02", status: "Online", fps: 24, latency: 45, resolution: "1280×720", resLabel: "720p", type: "parking" },
  { id: "3", name: "Phòng Server", camId: "CAM-03", status: "Offline", fps: 0, latency: 0, resolution: "Unknown", resLabel: "--", type: "server" },
  { id: "4", name: "Lối vào phụ", camId: "CAM-04", status: "Online", fps: 30, latency: 18, resolution: "1920×1080", resLabel: "1080p", type: "entrance" },
  { id: "5", name: "Bãi đỗ xe", camId: "CAM-05", status: "Online", fps: 15, latency: 60, resolution: "1280×720", resLabel: "720p", type: "parking" },
  { id: "6", name: "Phòng họp B", camId: "CAM-06", status: "Offline", fps: 0, latency: 0, resolution: "Unknown", resLabel: "--", type: "server" },
];

function CameraFeedMock({ type, status }: { type: Camera["type"]; status: Camera["status"] }) {
  if (status === "Offline") {
    return (
      <div style={{ position: "absolute", inset: 0, background: "#050d18", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
          <path d="M1 1l22 22M17 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3m3.5-1H20a2 2 0 0 1 2 2v11.5M9 9l9.5 9.5"/><path d="M15 12a3 3 0 0 0-3-3"/>
        </svg>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>KHÔNG CÓ TÍN HIỆU</span>
      </div>
    );
  }
  const gradients: Record<Camera["type"], string> = {
    entrance: "radial-gradient(ellipse at 40% 60%, #0d2035 0%, #050d18 60%)",
    parking: "radial-gradient(ellipse at 50% 40%, #0a1a10 0%, #050d18 60%)",
    server: "radial-gradient(ellipse at 60% 40%, #1a0d2e 0%, #050d18 60%)",
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: gradients[type] }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,170,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.02) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
      {/* Simulated movement */}
      <div style={{ position: "absolute", bottom: "20%", left: "30%", width: 20, height: 30, background: "rgba(255,255,255,0.06)", borderRadius: 2 }} />
      <div style={{ position: "absolute", bottom: "20%", left: "50%", width: 15, height: 25, background: "rgba(255,255,255,0.04)", borderRadius: 2 }} />
    </div>
  );
}

export default function CamerasPage() {
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<0 | 1 | 2>(0);
  const [camType, setCamType] = useState<"ip" | "webcam" | "nvr" | null>(null);

  const filtered = mockCameras.filter((c) =>
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
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Danh sách Camera</h1>
              <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>Giám sát và quản lý tất cả các luồng camera được kết nối.</p>
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
                Thêm camera
              </button>
            </div>
          </div>

          {/* Camera grid */}
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
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Camera {cam.camId.replace("CAM-", "")} – {cam.name}</div>

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
                      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>ĐỘ PHÂN GIẢI</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: cam.status === "Online" ? "var(--text-primary)" : "var(--text-muted)", marginTop: 3 }}>
                        {cam.status === "Online" ? `${cam.resolution} (${cam.resLabel})` : "Không xác định"}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={cam.status === "Offline"}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", background: cam.status === "Online" ? "rgba(0,212,170,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${cam.status === "Online" ? "rgba(0,212,170,0.2)" : "var(--border)"}`, borderRadius: 8, color: cam.status === "Online" ? "var(--accent-teal)" : "var(--text-muted)", fontSize: 12, fontWeight: 500, cursor: cam.status === "Online" ? "pointer" : "not-allowed", opacity: cam.status === "Offline" ? 0.5 : 1 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Xem
                    </button>
                    <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                      Cấu hình
                    </button>
                    <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", background: cam.status === "Offline" ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${cam.status === "Offline" ? "rgba(59,130,246,0.25)" : "var(--border)"}`, borderRadius: 8, color: cam.status === "Offline" ? "var(--accent-blue)" : "var(--text-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                      Khởi động lại
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                {modalStep === 1 ? "Chọn loại Camera" : "Nhập thông tin kết nối"}
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
                </div>
              )}

              {modalStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Tên camera</label>
                    <input placeholder="VD: Cửa chính" style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                  </div>

                  {camType === "webcam" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Chọn thiết bị</label>
                      <select style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                        <option>Camera chính (USB 0)</option>
                        <option>Webcam tích hợp</option>
                      </select>
                    </div>
                  )}

                  {(camType === "ip" || camType === "nvr") && (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Địa chỉ (IP/RTSP URL)</label>
                        <input placeholder="rtsp://192.168.1.10:554/stream1" style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                      </div>
                      <div style={{ display: "flex", gap: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Tài khoản</label>
                          <input placeholder="admin" style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Mật khẩu</label>
                          <input type="password" placeholder="••••••••" style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, background: "rgba(0,0,0,0.1)" }}>
              {modalStep === 1 && (
                <>
                  <button onClick={() => { setModalStep(0); setCamType(null); }} style={{ padding: "9px 16px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Hủy bỏ</button>
                  <button onClick={() => { if(camType) setModalStep(2); }} style={{ padding: "9px 24px", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, cursor: camType ? "pointer" : "not-allowed", background: camType ? "linear-gradient(135deg,#00D4AA,#3B82F6)" : "rgba(255,255,255,0.1)", opacity: camType ? 1 : 0.5 }}>Tiếp tục</button>
                </>
              )}
              {modalStep === 2 && (
                <>
                  <button onClick={() => setModalStep(1)} style={{ padding: "9px 16px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Quay lại</button>
                  <button onClick={() => { setModalStep(0); setCamType(null); }} style={{ padding: "9px 24px", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "linear-gradient(135deg,#00D4AA,#3B82F6)" }}>Lưu kết nối</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}} />
    </div>
  );
}
