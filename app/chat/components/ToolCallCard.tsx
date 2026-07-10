"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight, Wrench } from "lucide-react";
import type { ToolCall } from "@/lib/types";

interface ToolCallCardProps {
  toolCall: ToolCall;
  isStreaming: boolean;
}

/** 只展示关键的 1-2 个参数，其余收进折叠面板 */
const KEY_PARAMS = new Set(["file_path", "command", "path", "sandbox_path", "host_path"]);

export function ToolCallCard({ toolCall, isStreaming }: ToolCallCardProps) {
  const isRunning = toolCall.status === "running";
  const isSuccess = toolCall.status === "success";
  const isError = toolCall.status === "error";

  // 成功默认折叠，失败/运行中默认展开
  const [expanded, setExpanded] = useState(!isSuccess);
  // 参数区域默认折叠
  const [argsExpanded, setArgsExpanded] = useState(false);
  // 结果区域默认折叠
  const [resultExpanded, setResultExpanded] = useState(false);

  const argsEntries = Object.entries(toolCall.args || {});
  const keyArgs = argsEntries.filter(([k]) => KEY_PARAMS.has(k));
  const extraArgs = argsEntries.filter(([k]) => !KEY_PARAMS.has(k));

  const toggleExpand = () => setExpanded((v) => !v);

  return (
    <div className="group my-1 text-sm">
      {/* ─── 折叠/展开头部 — 始终可见 ─── */}
      <button
        onClick={toggleExpand}
        className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors
          ${isRunning ? "bg-accent/10 ring-1 ring-accent/30 animate-pulse" : ""}
          ${isError ? "bg-destructive/5" : ""}
          ${isSuccess && !expanded ? "hover:bg-muted/50" : ""}
          ${expanded && isSuccess ? "rounded-b-none bg-muted/30" : ""}
        `}
      >
        {/* 状态图标 */}
        {isRunning && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />}
        {isSuccess && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
        {isError && <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />}

        {/* 工具名 */}
        <span className={`font-mono text-xs font-medium ${isError ? "text-destructive" : "text-foreground"}`}>
          {toolCall.tool}
        </span>

        {/* 关键参数摘要（折叠态也展示一行） */}
        {keyArgs.length > 0 && (
          <span className="ml-1 truncate text-[11px] text-muted-foreground">
            {keyArgs.map(([k, v]) => `${k}=${String(v).slice(0, 40)}`).join(", ")}
          </span>
        )}

        {/* 状态文字 */}
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
          {isRunning && "执行中..."}
          {isSuccess && (expanded ? "" : "成功")}
          {isError && "失败"}
        </span>

        {/* 展开/折叠箭头 */}
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* ─── 展开详情 ─── */}
      {expanded && (
        <div className="border border-t-0 border-muted/50 rounded-b-lg bg-muted/20 px-3 py-2 space-y-2">
          {/* 全部参数 */}
          {argsEntries.length > 0 && (
            <div>
              <button
                onClick={() => setArgsExpanded((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                {argsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                参数 ({argsEntries.length})
              </button>
              {argsExpanded && (
                <div className="mt-1 max-h-32 overflow-y-auto rounded bg-muted/50 p-2 font-mono text-[11px] text-muted-foreground">
                  {argsEntries.map(([key, value]) => (
                    <div key={key} className="break-all">
                      <span className="text-foreground/70">{key}</span>:{" "}
                      {typeof value === "string" ? value : JSON.stringify(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 错误信息（完整展示，不做截断） */}
          {isError && toolCall.error && (
            <div>
              <div className="text-[11px] font-medium text-destructive">错误</div>
              <pre className="mt-1 whitespace-pre-wrap break-all rounded bg-destructive/5 p-2 font-mono text-[11px] text-destructive/90">
                {toolCall.error}
              </pre>
            </div>
          )}

          {/* 工具返回结果 */}
          {toolCall.result && (
            <div>
              <button
                onClick={() => setResultExpanded((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                {resultExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                结果
              </button>
              {resultExpanded && (
                <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-all rounded bg-muted/50 p-2 font-mono text-[11px] text-muted-foreground">
                  {toolCall.result}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
