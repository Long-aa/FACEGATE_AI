import { api } from "./api";

export interface User {
  id: string;
  employee_id: string;
  name: string;
  email?: string;
  role: string;
  avatar: string;
  department: string;
  permissions: string[];
}

export interface Session {
  user: User;
  token: string;
  expiresAt: number;
}

const SESSION_KEY = "facegate_session";

export async function login(usernameOrEmail: string, password: string): Promise<Session> {
  const res = await api.auth.login(usernameOrEmail, password);
  
  const user: User = {
    id: res.user.id,
    employee_id: res.user.employee_id,
    name: res.user.name,
    email: res.user.email,
    role: res.user.role,
    avatar: res.user.name.split(" ").map((n: string) => n[0]).slice(-2).join(""),
    department: res.user.department || "Quản Trị",
    permissions: res.user.permissions || ["*"],
  };

  const session: Session = {
    user,
    token: res.access_token,
    expiresAt: res.expires_at * 1000,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  return session;
}

export async function logout(): Promise<void> {
  try {
    await api.auth.logout();
  } catch {}
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
    if (session.expiresAt && session.expiresAt < Date.now()) {
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
