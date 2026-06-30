"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSessionMessages } from "@/lib/api-client";
import { streamChat } from "@/lib/sse-client";
import { useAuth } from "@/components/AuthProvider";
import type { Message, SSEMessage, AgentStatus, ToolCall } from "@/lib/types";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ToolCallCard } from "./ToolCallCard";
import { AgentStatusBar } from "./AgentStatusBar";

interface ChatAreaProps {
  sessionId: string;
  refreshKey: number;
}

export function ChatArea({ sessionId, refreshKey }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [currentToolName, setCurrentToolName] = useState<string>();
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const { user } = useAuth();
  const abortRef = useRef<(() => void) | null>(null);

  // 加载历史消息
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    getSessionMessages(sessionId)
      .then((msgs) => {
        if (!cancelled) {
          setMessages(msgs);
          setToolCalls([]);
        }
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, refreshKey]);

  // 发送消息
  const handleSend = useCallback(
    (content: string) => {
      if (isStreaming) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setIsStreaming(true);
      setToolCalls([]);

      let aiContent = "";

      const abort = streamChat(
        { session_id: sessionId, message: content },
        {
          onEvent: (event: SSEMessage) => {
            switch (event.type) {
              case "agent_status":
                if (event.status) {
                  setAgentStatus(event.status);
                  if (event.status === "running_tool" && event.tool) {
                    setCurrentToolName(event.tool);
                  }
                }
                break;

              case "token":
                if (event.content) {
                  aiContent += event.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "ai") {
                      updated[updated.length - 1] = {
                        ...last,
                        content: aiContent,
                      };
                    }
                    return updated;
                  });
                }
                break;

              case "tool_call":
                setToolCalls((prev) => [
                  ...prev,
                  {
                    id: event.id || `tool-${Date.now()}`,
                    tool: event.tool || "unknown",
                    args: event.args || {},
                    status: "running",
                  },
                ]);
                break;

              case "tool_result":
                setToolCalls((prev) =>
                  prev.map((tc) =>
                    tc.id === event.id
                      ? { ...tc, status: event.success ? "success" : "error", error: event.error }
                      : tc
                  )
                );
                break;
            }
          },
          onDone: () => {
            setIsStreaming(false);
            setAgentStatus("idle");
          },
          onError: (err) => {
            setIsStreaming(false);
            setAgentStatus("idle");
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "ai") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content || `错误: ${err.message}`,
                };
              }
              return updated;
            });
          },
        }
      );

      abortRef.current = abort;
    },
    [sessionId, isStreaming]
  );

  // 退出时取消流
  useEffect(() => {
    return () => {
      abortRef.current?.();
    };
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Agent 状态栏 */}
      <AgentStatusBar status={agentStatus} toolName={currentToolName} />

      {/* 工具调用卡片（在消息流上方） */}
      {toolCalls.length > 0 && (
        <div className="mx-auto w-full max-w-3xl px-4">
          {toolCalls.map((tc) => (
            <ToolCallCard key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}

      <MessageList messages={messages} />
      <MessageInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
