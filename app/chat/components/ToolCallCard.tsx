"use client";

import { Loader2, CheckCircle2, XCircle, Wrench } from "lucide-react";
import type { ToolCall } from "@/lib/types";

interface ToolCallCardProps {
  toolCall: ToolCall;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const isRunning = toolCall.status === "running";
  const isSuccess = toolCall.status === "success";
  const isError = toolCall.status === "error";

  return (
    <div
      className={`my-2 rounded-xl border-2 px-4 py-3 text-sm ${
        isRunning
          ? "border-accent bg-accent/5"
          : isSuccess
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
            : "border-destructive/30 bg-destructive/5"
      }`}
    >
      {/* 工具名 + 图标 */}
      <div className="mb-1.5 flex items-center gap-2 font-medium">
        <Wrench className="h-4 w-4 text-accent" />
        <span>{toolCall.tool}</span>
        {isRunning && (
          <Loader2 className="ml-auto h-4 w-4 animate-spin text-accent" />
        )}
        {isSuccess && (
          <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
        )}
        {isError && (
          <XCircle className="ml-auto h-4 w-4 text-destructive" />
        )}
      </div>

      {/* 关键参数 */}
      {toolCall.args && Object.keys(toolCall.args).length > 0 && (
        <div className="mb-1.5 max-h-20 overflow-y-auto rounded bg-muted/50 p-2 font-mono text-xs text-muted-foreground">
          {Object.entries(toolCall.args).map(([key, value]) => (
            <div key={key}>
              <span className="text-foreground/70">{key}</span>:{" "}
              {typeof value === "string" && value.length > 80
                ? `${value.slice(0, 80)}...`
                : JSON.stringify(value)}
            </div>
          ))}
        </div>
      )}

      {/* 状态文本 */}
      <div
        className={`text-xs ${
          isRunning
            ? "text-accent"
            : isSuccess
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive"
        }`}
      >
        {isRunning && "执行中..."}
        {isSuccess && "执行成功"}
        {isError && (toolCall.error ? `执行失败: ${toolCall.error}` : "执行失败")}
      </div>
    </div>
  );
}
