// ================================================================
// API 客户端 — 封装 HTTP 请求（fetch + JWT auth header）
// 所有请求通过 Next.js rewrite 代理到后端，避免 CORS
// ================================================================

import { getToken, clearAuth } from "./auth";
import type {
  LoginRequest,
  LoginResponse,
  Session,
  Message,
  LoginResponseRaw,
  SessionsResponseRaw,
  SessionRaw,
  MessagesResponseRaw,
  SkillsResponse,
  SkillFilesResponse,
  SkillFileContent,
} from "./types";
import {
  adaptLoginResponse,
  adaptSessionsResponse,
  adaptSession,
  adaptMessagesResponse,
} from "./types";

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

  const res = await fetch(path, {
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
  const raw = await request<LoginResponseRaw>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return adaptLoginResponse(raw);
}

// ---- 会话管理 ----

export async function getSessions(): Promise<Session[]> {
  // 后端返回 { sessions: [...] } 包装对象，需要解包
  const raw = await request<SessionsResponseRaw>("/api/v1/sessions");
  return adaptSessionsResponse(raw);
}

export async function createSession(title?: string): Promise<Session> {
  const raw = await request<SessionRaw>("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify({ title: title || "新对话" }),
  });
  return adaptSession(raw);
}

export async function deleteSession(id: string): Promise<void> {
  await request(`/api/v1/sessions/${id}`, { method: "DELETE" });
}

export async function pinSession(id: string): Promise<Session> {
  const raw = await request<SessionRaw>(`/api/v1/sessions/${id}/pin`, { method: "PATCH" });
  return adaptSession(raw);
}

export async function unpinSession(id: string): Promise<Session> {
  const raw = await request<SessionRaw>(`/api/v1/sessions/${id}/unpin`, { method: "PATCH" });
  return adaptSession(raw);
}

export async function getSessionMessages(id: string): Promise<Message[]> {
  // 后端返回 { messages: [...] } 包装对象，需要解包
  const raw = await request<MessagesResponseRaw>(`/api/v1/sessions/${id}/messages`);
  return adaptMessagesResponse(raw);
}

// ---- Skills ----

export async function getSkills(userId: string): Promise<SkillsResponse> {
  return request<SkillsResponse>(`/api/v1/skills?user_id=${encodeURIComponent(userId)}`);
}

export async function getSkillFiles(
  skillName: string,
  userId: string,
  source: string
): Promise<SkillFilesResponse> {
  return request<SkillFilesResponse>(
    `/api/v1/skill/${encodeURIComponent(skillName)}/files?user_id=${encodeURIComponent(userId)}&source=${source}`
  );
}

export async function getSkillFileContent(
  skillName: string,
  userId: string,
  source: string,
  filePath: string
): Promise<SkillFileContent> {
  return request<SkillFileContent>(
    `/api/v1/skill/${encodeURIComponent(skillName)}/file?user_id=${encodeURIComponent(userId)}&source=${source}&path=${encodeURIComponent(filePath)}`
  );
}

export async function deleteSkill(skillName: string, userId: string): Promise<void> {
  await request(`/api/v1/skill/${encodeURIComponent(skillName)}?user_id=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export { ApiError };
