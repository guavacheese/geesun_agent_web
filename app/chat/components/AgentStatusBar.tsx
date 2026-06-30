"use client";

import { Loader2, Brain, Hammer } from "lucide-react";
import type { AgentStatus } from "@/lib/types";

interface AgentStatusBarProps {
  status: AgentStatus;
  toolName?: string;
}

export function AgentStatusBar({ status, toolName }: AgentStatusBarProps) {
  if (status === "idle") return null;

  return (
    <div className="mx-auto mb-3 flex max-w-3xl items-center gap-2 rounded-lg bg-accent/10 px-4 py-2 text-sm text-accent">
      {status === "thinking" ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <Brain className="h-4 w-4" />
          <span>Agent 正在思考...</span>
        </>
      ) : (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <Hammer className="h-4 w-4" />
          <span>正在执行: {toolName || "..."}</span>
        </>
      )}
    </div>
  );
}
