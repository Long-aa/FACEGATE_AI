/**
 * Centralized API client for FaceGate AI.
 * Handles all REST communication with the FastAPI backend.
 * Automatically attaches JWT authentication tokens from session.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("facegate_session");
    if (raw) {
      const session = JSON.parse(raw);
      if (session && session.token) {
        return { Authorization: `Bearer ${session.token}` };
      }
    }
  } catch {}
  return {};
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    console.warn(`[API Network Error] ${options.method || "GET"} ${url}:`, netErr);
    throw new Error(
      `Không thể kết nối đến máy chủ (${url}). Vui lòng kiểm tra dịch vụ backend hoặc thử lại.`
    );
  }

  if (!response.ok) {
    let errorDetail = `Lỗi hệ thống (${response.status})`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === "string" 
          ? errorJson.detail 
          : JSON.stringify(errorJson.detail);
      }
    } catch {}
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // ── 1. Dashboard ──────────────────────────────────────────────
  dashboard: {
    getStats: () => request<any>("/api/v1/dashboard/stats"),
    getRecentLogs: (limit = 10) =>
      request<any[]>(`/api/v1/dashboard/recent-logs?limit=${limit}`),
    getAiEngine: () => request<any>("/api/v1/dashboard/ai-engine"),
    getAnalytics: (params?: { range?: string; start_date?: string; end_date?: string } | string) => {
      if (typeof params === "string") {
        return request<any>(`/api/v1/dashboard/analytics?range=${params}`);
      }
      const sp = new URLSearchParams();
      if (params?.range) sp.append("range", params.range);
      if (params?.start_date) sp.append("start_date", params.start_date);
      if (params?.end_date) sp.append("end_date", params.end_date);
      const qs = sp.toString();
      return request<any>(`/api/v1/dashboard/analytics${qs ? `?${qs}` : ""}`);
    },
  },

  // ── 2. Users ──────────────────────────────────────────────────
  users: {
    list: (params: { q?: string; search?: string; department?: string; status?: string; role?: string; page?: number; limit?: number } = {}) => {
      const sp = new URLSearchParams();
      const query = params.search || params.q;
      if (query) sp.append("q", query);
      if (params.department) sp.append("department", params.department);
      if (params.status) sp.append("status", params.status);
      if (params.page) sp.append("page", String(params.page));
      if (params.limit) sp.append("limit", String(params.limit));
      return request<any>(`/api/v1/users?${sp.toString()}`);
    },
    get: (id: string) => request<any>(`/api/v1/users/${id}`),
    create: (data: any) =>
      request<any>("/api/v1/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/api/v1/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/api/v1/users/${id}`, {
        method: "DELETE",
      }),
    toggleStatus: (id: string, status: string) =>
      request<any>(`/api/v1/users/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    getAccessHistory: (id: string, limit = 10) =>
      request<any[]>(`/api/v1/users/${id}/access-history?limit=${limit}`),
    getHistory: (id: string, limit = 10) =>
      request<any[]>(`/api/v1/users/${id}/access-history?limit=${limit}`),
    nextEmployeeId: () =>
      request<{ employee_id: string; locked: boolean }>("/api/v1/users/next-employee-id"),
  },

  // ── 2b. Departments ──────────────────────────────────────────
  departments: {
    list: (params: { q?: string; search?: string; access_level?: string; status?: string } = {}) => {
      const sp = new URLSearchParams();
      const query = params.search || params.q;
      if (query) sp.append("q", query);
      if (params.access_level && params.access_level !== "all") sp.append("access_level", params.access_level);
      if (params.status && params.status !== "all") sp.append("status", params.status);
      return request<{ items: any[]; total: number }>(`/api/v1/departments?${sp.toString()}`);
    },
    get: (id: string) => request<any>(`/api/v1/departments/${id}`),
    create: (data: any) =>
      request<any>("/api/v1/departments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/api/v1/departments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string, force = false) =>
      request<void>(`/api/v1/departments/${id}?force=${force}`, {
        method: "DELETE",
      }),
  },

  // ── 3. Access Logs ────────────────────────────────────────────
  accessLogs: {
    list: (params: {
      q?: string;
      search?: string;
      user_id?: string;
      user_type?: string;
      camera_id?: string;
      door_id?: string;
      result?: string;
      status?: string;
      confidence_min?: number;
      confidence_max?: number;
      date_from?: string;
      date_to?: string;
      page?: number;
      limit?: number;
    } = {}) => {
      const sp = new URLSearchParams();
      const query = params.search || params.q;
      if (query) sp.append("q", query);
      if (params.user_id && params.user_id !== "all") sp.append("user_id", params.user_id);
      if (params.user_type && params.user_type !== "all") sp.append("user_type", params.user_type);
      if (params.camera_id && params.camera_id !== "all") sp.append("camera_id", params.camera_id);
      if (params.door_id && params.door_id !== "all") sp.append("door_id", params.door_id);
      const res = params.result || params.status;
      if (res && res !== "all") sp.append("result", res);
      if (params.confidence_min != null) sp.append("confidence_min", String(params.confidence_min));
      if (params.confidence_max != null) sp.append("confidence_max", String(params.confidence_max));
      if (params.date_from) sp.append("date_from", params.date_from);
      if (params.date_to) sp.append("date_to", params.date_to);
      if (params.page) sp.append("page", String(params.page));
      if (params.limit) sp.append("limit", String(params.limit));
      return request<any>(`/api/v1/access-logs?${sp.toString()}`);
    },
    get: (id: string) => request<any>(`/api/v1/access-logs/${id}`),
    getExportUrl: (params?: { status?: string; format?: string; search?: string }) => {
      const sp = new URLSearchParams();
      if (params?.status) sp.append("result", params.status);
      if (params?.search) sp.append("q", params.search);
      const qs = sp.toString();
      return `${API_BASE_URL}/api/v1/access-logs/export${qs ? `?${qs}` : ""}`;
    },
  },

  // ── 4. Cameras ────────────────────────────────────────────────
  cameras: {
    list: (params: { q?: string; status?: string } = {}) => {
      const sp = new URLSearchParams();
      if (params.q) sp.append("q", params.q);
      if (params.status) sp.append("status", params.status);
      return request<any[]>(`/api/v1/cameras?${sp.toString()}`);
    },
    get: (id: string) => request<any>(`/api/v1/cameras/${id}`),
    create: (data: any) =>
      request<any>("/api/v1/cameras", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/api/v1/cameras/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/api/v1/cameras/${id}`, {
        method: "DELETE",
      }),
    test: (id: string) =>
      request<any>(`/api/v1/cameras/${id}/test`, {
        method: "POST",
      }),
    toggleStatus: (id: string) =>
      request<any>(`/api/v1/cameras/${id}/toggle-status`, {
        method: "POST",
      }),
  },

  // ── 5. Doors ──────────────────────────────────────────────────
  doors: {
    list: (params: { q?: string; status?: string } = {}) => {
      const sp = new URLSearchParams();
      if (params.q) sp.append("q", params.q);
      if (params.status) sp.append("status", params.status);
      return request<any[]>(`/api/v1/doors?${sp.toString()}`);
    },
    get: (id: string) => request<any>(`/api/v1/doors/${id}`),
    create: (data: any) =>
      request<any>("/api/v1/doors", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/api/v1/doors/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/api/v1/doors/${id}`, {
        method: "DELETE",
      }),
    unlock: (id: string, duration?: number) =>
      request<any>(`/api/v1/doors/${id}/unlock`, {
        method: "POST",
      }),
    lock: (id: string) =>
      request<any>(`/api/v1/doors/${id}/lock`, {
        method: "POST",
      }),
  },

  // ── 6. Reports ────────────────────────────────────────────────
  reports: {
    getSummary: (rangeType = "today") =>
      request<any>(`/api/v1/reports/summary?range_type=${rangeType}`),
    getExportUrl: (rangeType = "today") =>
      `${API_BASE_URL}/api/v1/reports/export?range_type=${rangeType}`,
  },

  // ── 7. Alerts ─────────────────────────────────────────────────
  alerts: {
    list: (params: { severity?: string; status?: string; time_range?: string; limit?: number } = {}) => {
      const sp = new URLSearchParams();
      if (params.severity) sp.append("severity", params.severity);
      if (params.status) sp.append("status", params.status);
      if (params.time_range) sp.append("time_range", params.time_range);
      if (params.limit) sp.append("limit", String(params.limit));
      return request<any>(`/api/v1/alerts?${sp.toString()}`);
    },
    getUnresolvedCount: () =>
      request<{ count: number }>("/api/v1/alerts/unresolved-count"),
    resolve: (id: string, notes?: string) =>
      request<any>(`/api/v1/alerts/${id}/resolve`, {
        method: "PUT",
      }),
    acknowledgeAll: () =>
      request<any>("/api/v1/alerts/acknowledge-all", {
        method: "PUT",
      }),
    delete: (id: string) =>
      request<any>(`/api/v1/alerts/${id}`, {
        method: "DELETE",
      }),
  },

  // ── 8. Settings ───────────────────────────────────────────────
  settings: {
    get: () => request<{ settings: Record<string, any> }>("/api/v1/settings"),
    update: (settings: Record<string, any>) =>
      request<{ settings: Record<string, any> }>("/api/v1/settings", {
        method: "PUT",
        body: JSON.stringify({ settings }),
      }),
  },

  // ── 8b. Audit Logs (Nhật ký hệ thống) ─────────────────────────
  audit: {
    list: (params: {
      q?: string;
      action?: string;
      entity_type?: string;
      user_name?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      limit?: number;
    } = {}) => {
      const sp = new URLSearchParams();
      if (params.q) sp.append("q", params.q);
      if (params.action && params.action !== "ALL") sp.append("action", params.action);
      if (params.entity_type && params.entity_type !== "ALL") sp.append("entity_type", params.entity_type);
      if (params.user_name) sp.append("user_name", params.user_name);
      if (params.date_from) sp.append("date_from", params.date_from);
      if (params.date_to) sp.append("date_to", params.date_to);
      if (params.page) sp.append("page", String(params.page));
      if (params.limit) sp.append("limit", String(params.limit));
      return request<{ items: any[]; total: number; page: number; limit: number; total_pages: number }>(`/api/v1/audit?${sp.toString()}`);
    },
    getExportUrl: (params?: { action?: string; entity_type?: string; q?: string }) => {
      const sp = new URLSearchParams();
      if (params?.action && params.action !== "ALL") sp.append("action", params.action);
      if (params?.entity_type && params.entity_type !== "ALL") sp.append("entity_type", params.entity_type);
      if (params?.q) sp.append("q", params.q);
      const qs = sp.toString();
      return `${API_BASE_URL}/api/v1/audit/export${qs ? `?${qs}` : ""}`;
    },
  },

  // ── 9. Recognition ────────────────────────────────────────────
  recognition: {
    verify: (data: {
      camera_id?: string;
      door_id?: string;
      employee_id?: string;
      face_vector?: number[];
      image_base64?: string;
      liveness_score?: number;
      liveness_passed?: boolean;
      threshold?: number;
      multi_frame_count?: number;
      face_count?: number;
      simulated_confidence?: number;
      confidence_threshold?: number;
    }) =>
      request<any>("/api/v1/recognition/verify", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getLogs: (limit = 10) =>
      request<any[]>(`/api/v1/recognition/logs?limit=${limit}`),
  },

  // ── 9b. Face Profiles ─────────────────────────────────────────
  faces: {
    preCheck: (employeeId: string) => {
      const encoded = encodeURIComponent(employeeId ?? "");
      return request<any>(`/api/v1/faces/pre-check?employee_id=${encoded}`);
    },
    verifyCamera: (data: {
      camera_index?: number;
      device_id?: string;
      width?: number;
      height?: number;
      is_opened?: boolean;
      permission_granted?: boolean;
      frame_empty?: boolean;
    }) =>
      request<any>("/api/v1/faces/verify-camera", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    list: (status?: string) =>
      request<any[]>(`/api/v1/faces${status ? `?status=${status}` : ""}`),
    get: (employeeId: string) =>
      request<any>(`/api/v1/faces/${employeeId}`),
    enroll: (data: {
      employee_id: string;
      encoding_vector: number[];
      quality_score?: number;
      samples_count?: number;
      master_photo_url?: string;
    }) =>
      request<any>("/api/v1/faces/enroll", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (employeeId: string) =>
      request<any>(`/api/v1/faces/${employeeId}`, {
        method: "DELETE",
      }),
  },

  // ── 10. Auth ──────────────────────────────────────────────────
  auth: {
    login: (username_or_email: string, password: string) =>
      request<any>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ username_or_email, password }),
      }),
    logout: () =>
      request<any>("/api/v1/auth/logout", {
        method: "POST",
      }),
    me: () => request<any>("/api/v1/auth/me"),
  },
};
