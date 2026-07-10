"use client";

import { useState, type KeyboardEvent, type FormEvent } from "react";
import { type Message } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bot, Copy, Check, Pencil } from "lucide-react";
import { GeneratedFileCard } from "./GeneratedFileCard";

interface MessageItemProps {
  message: Message;
  sessionId: string;
  onEdit?: (newContent: string) => void;
  onCopy?: (content: string) => void;
}

function formatTime(isoStr?: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export function MessageItem({ message, sessionId, onEdit, onCopy }: MessageItemProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const { user } = useAuth();
  const [hover, setHover] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  if (isTool) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      onCopy?.(message.content);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleEditStart = () => {
    setEditValue(message.content);
    setEditing(true);
  };

  const handleEditCancel = () => {
    setEditing(false);
    setEditValue(message.content);
  };

  const handleEditSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === message.content) {
      handleEditCancel();
      return;
    }
    onEdit?.(trimmed);
    setEditing(false);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  return (
    <div
      className={`group flex w-full items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* 头像 */}
      <div className="shrink-0 flex flex-col items-center">
        {isUser ? (
          <Avatar className="h-7 w-7 bg-primary/20">
            <AvatarFallback className="bg-primary/20 text-primary text-[11px] font-medium">
              {user?.username?.slice(0, 2) || <User className="h-3.5 w-3.5" />}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="h-7 w-7 bg-accent/20">
            <AvatarFallback className="bg-accent/20 text-accent">
              <Bot className="h-3.5 w-3.5" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* 内容列 */}
      <div className={`relative max-w-[80%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {/* 用户名 */}
        <p className="h-7 flex items-center text-[11px] text-muted-foreground">
          {isUser ? (user?.id || "用户") : "Geesun Agent"}
        </p>

        {/* 编辑模式 */}
        {editing ? (
          <form onSubmit={handleEditSubmit} className="w-full min-w-[240px]">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleEditKeyDown}
              autoFocus
              rows={3}
              className="w-full resize-none rounded-xl border bg-muted/50 px-4 py-3 text-sm outline-none focus:border-primary/50 focus:bg-background"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleEditCancel}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                取消
              </button>
              <button
                type="submit"
                className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
              >
                发送
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* 气泡 */}
            <div
              className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                isUser
                  ? "bg-primary text-primary-foreground rounded-tr-md"
                  : "bg-muted text-foreground rounded-tl-md"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>

              {/* Agent Copy 按钮（垂直居中，始终可见） */}
              {!isUser && (
                <button
                  onClick={handleCopy}
                  className="absolute -right-9 top-1/2 -translate-y-1/2 rounded-full border bg-card p-1.5 text-muted-foreground shadow-sm hover:text-foreground"
                  title="复制"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>

            {/* Agent 生成的文件卡片列表 */}
            {!isUser && message.generated_files && message.generated_files.length > 0 && (
              <div className="w-full space-y-2">
                {message.generated_files.map((file, i) => (
                  <GeneratedFileCard
                    key={`${file.file_path}-${i}`}
                    file={file}
                    userId={user?.id || ""}
                    sessionId={sessionId}
                  />
                ))}
              </div>
            )}

            {/* 时间戳 + 用户操作按钮 */}
            <div className="flex items-center gap-2">
              {message.created_at && (
                <p className="text-[11px] text-muted-foreground">
                  {formatTime(message.created_at)}
                </p>
              )}

              {/* 用户 Copy / Edit 按钮 */}
              {isUser && hover && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={handleCopy}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="复制"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                  {onEdit && (
                    <button
                      onClick={handleEditStart}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="编辑"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
