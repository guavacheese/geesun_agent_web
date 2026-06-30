// ================================================================
// API 客户端 — 封装 HTTP 请求（fetch + JWT auth header）
// 所有请求通过 Next.js rewrite 代理到后端，避免 CORS
// 后端地址在 next.config.ts → rewrites 中配置
// ================================================================

import { getToken, clearAuth } from "./auth";
import type { LoginRequest, LoginResponse, Session, Message } from "./types";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** 通用 fetch 封装，自动附加 Authorization header */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("认证已过期，请重新登录", 401);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail || `请求失败 (${res.status})`, res.status);
  }

  return res.json();
}

// ---- 认证 ----

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---- 会话管理 ----

export async function getSessions(): Promise<Session[]> {
  return request<Session[]>("/api/v1/sessions");
}

export async function createSession(title?: string): Promise<Session> {
  return request<Session>("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify({ title: title || "新对话" }),
  });
}

export async function deleteSession(id: string): Promise<void> {
  await request(`/api/v1/sessions/${id}`, { method: "DELETE" });
}

export async function getSessionMessages(id: string): Promise<Message[]> {
  return request<Message[]>(`/api/v1/sessions/${id}/messages`);
}

export { ApiError };
