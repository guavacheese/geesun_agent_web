"use client";

import { type Message } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bot } from "lucide-react";

interface MessageItemProps {
  message: Message;
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

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const { user } = useAuth();

  if (isTool) {
    return null;
  }

  return (
    <div className={`flex w-full gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* 头像 */}
      <div className="shrink-0 pt-0.5">
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

      {/* 气泡 */}
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {/* 用户名 */}
        <p className={`mb-1 text-[11px] ${isUser ? "text-right" : "text-left"} text-muted-foreground`}>
          {isUser ? (user?.id || "用户") : "Geesun Agent"}
        </p>

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-muted text-foreground rounded-tl-md"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {message.created_at && (
          <p className={`mt-1 text-[11px] ${isUser ? "text-right" : "text-left"} text-muted-foreground`}>
            {formatTime(message.created_at)}
          </p>
        )}
      </div>
    </div>
  );
}
