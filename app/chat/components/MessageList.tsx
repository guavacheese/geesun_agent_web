"use client";

import { useEffect, useRef } from "react";
import { type Message, type ToolCall } from "@/lib/types";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  messages: Message[];
  sessionId: string;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
  onEdit?: (index: number, newContent: string) => void;
}

export function MessageList({ messages, sessionId, toolCalls, isStreaming, onEdit }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 找到最后一条 AI 消息的索引，将 toolCalls 传给该条消息
  const lastAiIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "ai") return i;
    }
    return -1;
  })();

  if (messages.length === 0) {
    return (
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
            在下方输入消息开始对话
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4">
      <div className="mx-auto max-w-3xl space-y-4 py-6">
        {messages.map((msg, index) => (
          <MessageItem
            key={msg.id}
            message={msg}
            sessionId={sessionId}
            toolCalls={index === lastAiIndex ? toolCalls : undefined}
            isStreaming={index === lastAiIndex ? isStreaming : undefined}
            onEdit={onEdit ? (content) => onEdit(index, content) : undefined}
            onCopy={() => {}}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
