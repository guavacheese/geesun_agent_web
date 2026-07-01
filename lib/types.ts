// ================================================================
// 类型定义 — 对齐后端 FastAPI 接口
// ================================================================

// ---- 前端统一类型 ----

/** 用户信息 */
export interface User {
  id: string;
  username: string;
}

/** 登录请求 */
export interface LoginRequest {
  username: string;
  password: string;
}

/** 登录响应（前端统一格式，由 adapter 转换） */
export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

/** 会话 */
export interface Session {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}

/** 消息角色 */
export type MessageRole = "user" | "ai" | "tool";

/** 消息 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  tool_calls?: ToolCall[];
  created_at?: string;
}

/** 工具调用 */
export interface ToolCall {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  success?: boolean;
  error?: string | null;
  status: "running" | "success" | "error";
}

/** SSE 事件类型 */
export type SSEEventType =
  | "agent_status"
  | "token"
  | "tool_call"
  | "tool_result"
  | "error"
  | "done";

/** Agent 状态 */
export type AgentStatus = "idle" | "thinking" | "running_tool";

/** SSE 事件数据 */
export interface SSEMessage {
  type: SSEEventType;
  status?: AgentStatus;
  tool?: string;
  content?: string;
  id?: string;
  args?: Record<string, unknown>;
  success?: boolean;
  error?: string | null;
}

/** 聊天请求 */
export interface ChatRequest {
  session_id: string;
  message: string;
}

/** 模型信息 */
export interface ModelInfo {
  id: string;
  name: string;
}

// ---- 后端原始返回类型（字段名与后端一致） ----

export interface LoginResponseRaw {
  access_token: string;
  token_type: string;
  user: {
    user_id: string;
    display_name: string;
    role: string;
  };
}

export interface SessionRaw {
  session_id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}

export interface SessionsResponseRaw {
  sessions: SessionRaw[];
}

/** 后端消息原始字段 */
export interface MessageRaw {
  id?: string;
  role: string;
  content: string;
  created_at?: string;
}

export interface MessagesResponseRaw {
  messages: MessageRaw[];
}

// ---- 适配器：后端原始格式 → 前端统一格式 ----

export function adaptLoginResponse(raw: LoginResponseRaw): LoginResponse {
  return {
    access_token: raw.access_token,
    token_type: "bearer",
    user: {
      id: raw.user.user_id,
      username: raw.user.display_name,
    },
  };
}

export function adaptSessionsResponse(raw: SessionsResponseRaw): Session[] {
  return raw.sessions.map((s) => ({
    id: s.session_id,
    title: s.title,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }));
}

export function adaptSession(raw: SessionRaw): Session {
  return {
    id: raw.session_id,
    title: raw.title,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

export function adaptMessagesResponse(raw: MessagesResponseRaw): Message[] {
  return raw.messages.map((m) => ({
    id: m.id || "",
    role: m.role as MessageRole,
    content: m.content,
    created_at: m.created_at,
  }));
}
