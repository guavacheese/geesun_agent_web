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
  onStreamDone?: () => void;
}

export function ChatArea({ sessionId, refreshKey, onStreamDone }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [currentToolName, setCurrentToolName] = useState<string>();
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; path: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<import("@/lib/types").ModelOverride | null>(null);
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

      const now = new Date().toISOString();

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        created_at: now,
      };

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: "",
        created_at: now,
      };

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setUploadedFiles([]);  // 发送后清空本轮文件
      setIsStreaming(true);
      setToolCalls([]);

      let aiContent = "";

      const abort = streamChat(
        {
          session_id: sessionId,
          message: content,
          ...(selectedModel ? { model_override: selectedModel } : {}),
          ...(uploadedFiles.length > 0 ? { files: uploadedFiles.map((f) => f.path) } : {}),
        },
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
                setToolCalls((prev) => {
                  // 优先按 id 匹配；后端 tool_result 不发 id 时按 tool 名称匹配最近一张 running 卡片
                  const idx = prev.findIndex((tc) => tc.id === event.id);
                  const targetIdx =
                    idx >= 0
                      ? idx
                      : (() => {
                          for (let i = prev.length - 1; i >= 0; i--) {
                            if (prev[i].status === "running" && prev[i].tool === event.tool) {
                              return i;
                            }
                          }
                          return -1;
                        })();
                  if (targetIdx < 0) return prev;
                  const updated = [...prev];
                  updated[targetIdx] = {
                    ...updated[targetIdx],
                    status: event.success ? "success" : "error",
                    error: event.error,
                  };
                  return updated;
                });
                break;
            }
          },
          onDone: () => {
            setIsStreaming(false);
            setAgentStatus("idle");
            // 流结束兜底：把残留的 running 卡片标为 success，避免永久转圈
            setToolCalls((prev) =>
              prev.map((tc) => (tc.status === "running" ? { ...tc, status: "success" } : tc))
            );
            onStreamDone?.();
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

  // 上传文件到后端
  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (!user?.id) return;
      const formData = new FormData();
      formData.append("user_id", user.id);
      formData.append("session_id", sessionId);
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8009";
        const res = await fetch(`${API_BASE}/api/v1/upload`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(`上传失败 (${res.status})`);
        const data = await res.json();
        const results: { name: string; path: string }[] =
          data.uploaded?.map((u: { filename: string; path: string }) => ({
            name: u.filename,
            path: u.path,
          })) || [];
        setUploadedFiles((prev) => [...prev, ...results]);
      } catch (e) {
        console.error("文件上传失败:", e);
      }
    },
    [user?.id, sessionId]
  );

  // 移除已上传文件
  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 切换 session 时清空文件列表
  useEffect(() => {
    setUploadedFiles([]);
  }, [sessionId, refreshKey]);

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
      <MessageInput
        onSend={handleSend}
        disabled={isStreaming}
        files={uploadedFiles}
        onFilesChange={setUploadedFiles}
        onUploadFiles={handleFileUpload}
        model={selectedModel}
        onModelChange={setSelectedModel}
      />
    </div>
  );
}
