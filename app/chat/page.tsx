"use client";

import { useState, useEffect, useCallback } from "react";
import { getSessions, createSession, deleteSession } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ChatArea } from "./components/ChatArea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, MessageSquare, Sun, Moon } from "lucide-react";
import type { Session } from "@/lib/types";

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // 加载会话列表
  useEffect(() => {
    getSessions()
      .then((list) => {
        if (Array.isArray(list)) {
          setSessions(list);
          if (list.length > 0 && !activeId) {
            setActiveId(list[0].id);
          }
        }
      })
      .catch(() => setSessions([]));
  }, []);

  const handleCreate = useCallback(async () => {
    try {
      const session = await createSession();
      setSessions((prev) => [session, ...prev]);
      setActiveId(session.id);
    } catch {
      // ignore
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteSession(id);
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (activeId === id) {
          setActiveId(null);
          setRefreshKey((k) => k + 1);
        }
      } catch {
        // ignore
      }
    },
    [activeId]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 左侧会话列表 */}
      <aside className="flex w-[280px] shrink-0 flex-col border-r bg-card">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h1 className="text-lg font-semibold text-primary">Geesun Agent</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8"
              title={theme === "dark" ? "切换亮色模式" : "切换暗色模式"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <span className="text-xs text-muted-foreground">{user?.username}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="h-7 text-xs text-muted-foreground"
            >
              退出
            </Button>
          </div>
        </div>

        {/* 会话列表 */}
        <ScrollArea className="flex-1">
          <div className="space-y-0.5 p-2">
            {sessions.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                暂无会话
              </p>
            )}
            {sessions.map((s) => (
              <div key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setActiveId(s.id);
                  setRefreshKey((k) => k + 1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveId(s.id);
                    setRefreshKey((k) => k + 1);
                  }
                }}
                className={`group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  activeId === s.id
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{s.title || "新对话"}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(s.id);
                  }}
                  className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  title="删除会话"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* 新建按钮 */}
        <div className="border-t p-3">
          <Button
            onClick={handleCreate}
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <Plus className="h-4 w-4" />
            新建会话
          </Button>
        </div>
      </aside>

      {/* 右侧聊天区域 */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {activeId ? (
          <ChatArea key={`${activeId}-${refreshKey}`} sessionId={activeId} refreshKey={refreshKey} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <svg
                  className="h-8 w-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-medium">有什么可以帮你的？</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                新建一个会话开始对话
              </p>
              <Button onClick={handleCreate} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                新建会话
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
