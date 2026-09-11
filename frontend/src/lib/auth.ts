// Mock authentication data & utilities

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: "super_admin" | "admin" | "security" | "viewer";
  avatar: string;
  department: string;
  lastLogin?: string;
  permissions: string[];
}

// Dữ liệu ảo để đăng nhập
export const MOCK_USERS: User[] = [
  {
    id: "USR-001",
    username: "admin",
    password: "Admin@123",
    name: "Nguyễn Văn Admin",
    role: "super_admin",
    avatar: "NV",
    department: "Quản Trị Hệ Thống",
    lastLogin: "2026-09-08T06:00:00Z",
    permissions: ["*"],
  },
  {
    id: "USR-002",
    username: "security",
    password: "Security@123",
    name: "Trần Bảo An",
    role: "security",
    avatar: "TB",
    department: "Bảo Vệ & An Ninh",
    lastLogin: "2026-09-08T07:30:00Z",
    permissions: ["cameras.view", "alerts.view", "doors.control", "access-logs.view"],
  },
  {
    id: "USR-003",
    username: "manager",
    password: "Manager@123",
    name: "Lê Thị Quản Lý",
    role: "admin",
    avatar: "LQ",
    department: "Quản Lý Vận Hành",
    lastLogin: "2026-09-07T14:00:00Z",
    permissions: ["cameras.view", "users.manage", "reports.view", "access-logs.view"],
  },
];

const SESSION_KEY = "facegate_session";

export interface Session {
  user: Omit<User, "password">;
  token: string;
  expiresAt: number;
}

export function login(username: string, password: string): Session | null {
  const user = MOCK_USERS.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) return null;

  const { password: _, ...userWithoutPassword } = user;
  const session: Session = {
    user: userWithoutPassword,
    token: `mock_token_${Math.random().toString(36).slice(2)}`,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  return session;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}
