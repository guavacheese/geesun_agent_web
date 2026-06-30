// ================================================================
// 认证工具 — JWT token 存储、解析、校验
// ================================================================

const TOKEN_KEY = "geesun_auth_token";
const USER_KEY = "geesun_auth_user";

export interface StoredUser {
  id: string;
  username: string;
  email?: string;
}

/** 存储 token 到 localStorage */
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

/** 获取 token */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** 删除 token */
export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

/** 存储用户信息 */
export function setUser(user: StoredUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** 获取用户信息 */
export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** 清除所有认证信息 */
export function clearAuth(): void {
  removeToken();
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

/** 检查是否已认证 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/** 解析 JWT payload（不验证签名，仅用于客户端判断过期） */
export function parseToken(token: string): { exp?: number } | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

/** 检查 token 是否过期 */
export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  const payload = parseToken(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 < Date.now();
}
