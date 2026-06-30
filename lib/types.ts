// ================================================================
// 类型定义 — 对齐后端 FastAPI 接口
// ================================================================

/** 用户信息 */
export interface User {
  id: string;
  username: string;
  email?: string;
}

/** 登录请求 */
export interface LoginRequest {
  username: string;
  password: string;
}

/** 登录响应 */
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
  // agent_status
  status?: AgentStatus;
  tool?: string;
  // token
  content?: string;
  // tool_call
  id?: string;
  args?: Record<string, unknown>;
  // tool_result
  success?: boolean;
  error?: string | null;
}

/** 聊天请求 */
export interface ChatRequest {
  session_id: string;
  message: string;
  model_override?: {
    model?: string;
    temperature?: number;
  };
}

/** 模型信息 */
export interface ModelInfo {
  id: string;
  name: string;
}
