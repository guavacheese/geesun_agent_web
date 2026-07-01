// ================================================================
// SSE 客户端 — 流式事件解析器（fetch ReadableStream）
// SSE 直连后端避免 Turbopack rewrite 代理缓冲，CORS 已在后端配置
// ================================================================

import { getToken, clearAuth } from "./auth";
import type { ChatRequest, SSEMessage } from "./types";

/** SSE 需直连后端，不走 Next.js rewrite（Turbopack 代理会缓冲流） */
const SSE_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8009";

export type SSECallback = (event: SSEMessage) => void;
export type SSEDoneCallback = () => void;
export type SSEErrorCallback = (error: Error) => void;

export interface SSEHandlers {
  onEvent: SSECallback;
  onDone?: SSEDoneCallback;
  onError?: SSEErrorCallback;
}

/**
 * 发起 SSE 流式聊天请求
 * 返回 abort 函数用于取消请求
 */
export function streamChat(
  request: ChatRequest,
  handlers: SSEHandlers
): () => void {
  const token = getToken();
  const controller = new AbortController();

  const url = `${SSE_BASE}/api/v1/chat`;

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (res.status === 401) {
        clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail || `请求失败 (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // 保留最后一个可能不完整的行
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6); // 去掉 "data: " 前缀

          // SSE [DONE] 信号
          if (data === "[DONE]") {
            handlers.onDone?.();
            return;
          }

          try {
            const event = JSON.parse(data) as SSEMessage;
            handlers.onEvent(event);
          } catch {
            // 跳过无法解析的行
          }
        }
      }

      // 处理流结束但未收到 [DONE] 的情况
      handlers.onDone?.();
    })
    .catch((err) => {
      if (err.name === "AbortError") return;
      handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
    });

  return () => controller.abort();
}
