"use client";

import { useState, useCallback } from "react";
import type { Session } from "@/lib/types";

export interface ChatShellContext {
  sessions: Session[];
  activeSessionId: string | null;
  setSessions: (sessions: Session[]) => void;
  setActiveSessionId: (id: string | null) => void;
  addSession: (session: Session) => void;
  removeSession: (id: string) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

/**
 * ChatShell 向下传递的全局状态
 * 通过 props 而非 Context，避免不必要重渲染
 */
export function useChatShellState(): ChatShellContext {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const addSession = useCallback((session: Session) => {
    setSessions((prev) => [session, ...prev]);
  }, []);

  const removeSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    sessions,
    activeSessionId,
    setSessions,
    setActiveSessionId,
    addSession,
    removeSession,
    refreshKey,
    triggerRefresh,
  };
}
