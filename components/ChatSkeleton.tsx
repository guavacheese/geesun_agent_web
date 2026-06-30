"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * 聊天页加载骨架屏
 */
export function ChatSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 左侧会话列表骨架 */}
      <aside className="flex w-[280px] shrink-0 flex-col border-r bg-card p-4">
        <Skeleton className="mb-4 h-6 w-28" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <Skeleton className="mt-auto h-10 w-full" />
      </aside>

      {/* 右侧聊天区域骨架 */}
      <main className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="space-y-4 text-center">
            <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
            <Skeleton className="mx-auto h-6 w-48" />
            <Skeleton className="mx-auto h-4 w-64" />
          </div>
        </div>
        <div className="border-t p-4">
          <div className="mx-auto max-w-3xl">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
