"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSessionMessages, editSessionMessage } from "@/lib/api-client";
import { streamChat } from "@/lib/sse-client";
import { useAuth } from "@/components/AuthProvider";
import type { Message, SSEMessage, AgentStatus, ToolCall, ChatRequest, ModelOverride, GeneratedFile } from "@/lib/types";
import { inferFileType } from "@/lib/types";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { AgentStatusBar } from "./AgentStatusBar";
import { CheckCircle2, XCircle } from "lucide-react";

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
  const [selectedModel, setSelectedModel] = useState<ModelOverride | null>(null);
  const { user } = useAuth();
  const abortRef = useRef<(() => void) | null>(null);
  const streamErrorRef = useRef<string | null>(null); // 跟踪 SSE error 事件，用于 onDone 判断
  // 按 sessionId 缓存消息，切换会话时不丢失未保存的流式输出
  const messagesCache = useRef<Record<string, Message[]>>({});
  const previousSessionRef = useRef<string | null>(null);

  // 加载历史消息（优先从后端，回退到缓存）
  useEffect(() => {
    // 保存当前会话消息到缓存
    setMessages((current) => {
      if (previousSessionRef.current) {
        messagesCache.current[previousSessionRef.current] = current;
      }
      previousSessionRef.current = sessionId;
      // 如果缓存中有，先展示缓存（用户体验更流畅）
      return messagesCache.current[sessionId] || [];
    });

    let cancelled = false;
    setIsLoading(true);

    getSessionMessages(sessionId)
      .then((msgs) => {
        if (!cancelled) {
          // 后端返回的消息优先于缓存（可能包含了已完成的流式输出）
          if (msgs.length > 0) {
            setMessages(msgs);
            messagesCache.current[sessionId] = msgs;
          }
          setToolCalls([]);
        }
      })
      .catch(() => {
        // 后端失败时保留缓存中的消息
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, refreshKey]);

  // 通用流式处理
  const runStream = useCallback(
    (request: ChatRequest) => {
      if (isStreaming) return;

      streamErrorRef.current = null; // 每次新流开始时清除错误状态

      setIsStreaming(true);
      setToolCalls([]);

      let aiContent = "";

      const abort = streamChat(request, {
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
                  } else {
                    updated.push({
                      id: `ai-${Date.now()}`,
                      role: "ai",
                      content: aiContent,
                      created_at: new Date().toISOString(),
                    });
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
                  result: event.result || undefined,
                };
                return updated;
              });
              break;

            case "file_generated":
              if (event.file_path && event.file_name) {
                const file: GeneratedFile = {
                  file_name: event.file_name,
                  file_path: event.file_path,
                  file_size: event.file_size || 0,
                  file_type: inferFileType(event.file_name),
                };
                setMessages((prev) => {
                  if (prev.length === 0) return prev;
                  const lastIdx = prev.length - 1;
                  const last = prev[lastIdx];
                  // 只附加到 AI 角色的消息上
                  if (last.role !== "ai") return prev;
                  const updated = {
                    ...last,
                    generated_files: [...(last.generated_files || []), file],
                  };
                  const result = [...prev];
                  result[lastIdx] = updated;
                  return result;
                });
              }
              break;

            case "error":
              streamErrorRef.current = event.content || "Agent 处理异常";
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "ai") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content || `⚠️ Agent 处理异常：${event.content || "未知错误"}`,
                  };
                }
                return updated;
              });
              break;
          }
        },
        onDone: () => {
          setIsStreaming(false);
          setAgentStatus("idle");
          const hadError = streamErrorRef.current;
          if (hadError) {
            // 后端发生了异常（如递归上限、工具执行崩溃等），未完成工具标记为错误
            setToolCalls((prev) =>
              prev.map((tc) =>
                tc.status === "running"
                  ? { ...tc, status: "error", error: hadError }
                  : tc
              )
            );
          } else {
            setToolCalls((prev) =>
              prev.map((tc) => (tc.status === "running" ? { ...tc, status: "success" } : tc))
            );
          }
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
      });

      abortRef.current = abort;
    },
    [isStreaming, onStreamDone]
  );

  // 发送新消息
  const handleSend = useCallback(
    (content: string) => {
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
      setUploadedFiles([]);

      runStream({
        session_id: sessionId,
        message: content,
        ...(selectedModel ? { model_override: selectedModel } : {}),
        ...(uploadedFiles.length > 0 ? { files: uploadedFiles.map((f) => f.path) } : {}),
      });
    },
    [sessionId, selectedModel, uploadedFiles, runStream]
  );

  // 编辑历史消息后重新生成
  const handleEditMessage = useCallback(
    async (index: number, newContent: string) => {
      if (isStreaming) return;
      try {
        await editSessionMessage(sessionId, index, newContent);
        // 刷新消息列表（保留到编辑点的历史）
        const msgs = await getSessionMessages(sessionId);
        setMessages(msgs);
        // 从当前 checkpoint 继续生成新的 Agent 回复
        runStream({
          session_id: sessionId,
          message: "",
          continue_from_state: true,
          ...(selectedModel ? { model_override: selectedModel } : {}),
        });
      } catch (e) {
        console.error("编辑消息失败:", e);
      }
    },
    [sessionId, selectedModel, isStreaming, runStream]
  );

  // 仅组件卸载时取消流（不再随 sessionId 变化触发，保证切换会话时流继续跑）
  useEffect(() => {
    return () => {
      abortRef.current?.();
    };
  }, []);


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

  // 切换 session 时清空文件列表和模型选择
  useEffect(() => {
    setUploadedFiles([]);
    setSelectedModel(null);
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

      {/* 流结束时显示整体任务状态（紧凑条） */}
      {!isStreaming && toolCalls.length > 0 && (
        <div className="mx-auto w-full max-w-3xl px-4">
          {streamErrorRef.current ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">任务执行失败</span>
              <span className="text-destructive/70 truncate">：{streamErrorRef.current}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">任务执行完成</span>
            </div>
          )}
        </div>
      )}

      <MessageList
        messages={messages}
        sessionId={sessionId}
        toolCalls={toolCalls}
        isStreaming={isStreaming}
        onEdit={handleEditMessage}
      />
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
