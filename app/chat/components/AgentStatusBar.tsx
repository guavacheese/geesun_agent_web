"use client";

import { Loader2, Hammer } from "lucide-react";
import type { AgentStatus } from "@/lib/types";

interface AgentStatusBarProps {
  status: AgentStatus;
  toolName?: string;
}

/**
 * Agent 状态指示条
 * - thinking: 不显示，token 内容已直接流入 AI 消息，不需要额外占位
 * - running_tool: 显示当前执行的工具名
 * - idle: 隐藏
 */
export function AgentStatusBar({ status, toolName }: AgentStatusBarProps) {
  // thinking 时不显示——AI 消息已经在累计 token 内容，用户可直接看到
  if (status === "idle" || status === "thinking") return null;

  return (
    <div className="mx-auto mb-3 flex max-w-3xl items-center gap-2 rounded-lg bg-accent/10 px-4 py-2 text-sm text-accent">
      <Loader2 className="h-4 w-4 animate-spin" />
      <Hammer className="h-4 w-4" />
      <span>正在执行: {toolName || "..."}</span>
    </div>
  );
}
