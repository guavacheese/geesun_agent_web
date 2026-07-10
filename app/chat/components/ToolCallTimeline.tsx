"use client";

import type { ToolCall } from "@/lib/types";
import { ToolCallCard } from "./ToolCallCard";

interface ToolCallTimelineProps {
  toolCalls: ToolCall[];
  isStreaming: boolean;
}

/**
 * 工具调用时间线 — 包裹多条 ToolCallCard
 * 渲染在 AI 消息气泡下方，按时间顺序展示所有工具调用
 */
export function ToolCallTimeline({ toolCalls, isStreaming }: ToolCallTimelineProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 border-l-2 border-muted pl-3">
      {toolCalls.map((tc) => (
        <ToolCallCard key={tc.id} toolCall={tc} isStreaming={isStreaming} />
      ))}
    </div>
  );
}
