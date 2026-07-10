"use client";

import { useEffect, useState, useCallback } from "react";
import type { GeneratedFile } from "@/lib/types";
import { X, Download, FileText } from "lucide-react";

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  file: GeneratedFile;
  downloadUrl: string;
  userId: string;
  sessionId: string;
}

export function FilePreviewModal({
  open,
  onClose,
  file,
  downloadUrl,
}: FilePreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  // 按 ESC 关闭
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // 文本/代码文件：加载内容
  const loadTextContent = useCallback(async () => {
    if (file.file_type !== "text" && file.file_type !== "code") return;
    if (textContent !== null) return; // 已加载，不重复请求

    setTextLoading(true);
    setTextError(null);
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error(`加载失败 (${res.status})`);
      const text = await res.text();
      setTextContent(text);
    } catch (e) {
      setTextError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setTextLoading(false);
    }
  }, [file.file_type, downloadUrl, textContent]);

  useEffect(() => {
    if (open) {
      loadTextContent();
    }
  }, [open, loadTextContent]);

  if (!open) return null;

  const fileTypeLabel: Record<string, string> = {
    text: "文本文档",
    code: "代码文件",
    image: "图片",
    pdf: "PDF 文档",
    spreadsheet: "表格",
    archive: "压缩包",
    other: "文件",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        // 点击遮罩关闭
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-4 flex max-h-[85vh] w-full max-w-[90vw] flex-col rounded-xl border border-border bg-background shadow-2xl">
        {/* ─── 标题栏 ─── */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium">{file.file_name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {fileTypeLabel[file.file_type] || "文件"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={downloadUrl}
              download={file.file_name}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Download className="h-3.5 w-3.5" />
              下载
            </a>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ─── 内容区 ─── */}
        <div className="flex-1 overflow-auto p-4">
          {/* 文本/代码 */}
          {(file.file_type === "text" || file.file_type === "code") && (
            <div className="h-full">
              {textLoading && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
                  <span className="ml-2">加载中...</span>
                </div>
              )}
              {textError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {textError}
                </div>
              )}
              {textContent !== null && (
                <pre className="overflow-x-auto rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                  <code>{textContent}</code>
                </pre>
              )}
            </div>
          )}

          {/* 图片 */}
          {file.file_type === "image" && (
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={downloadUrl}
                alt={file.file_name}
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
              />
            </div>
          )}

          {/* PDF */}
          {file.file_type === "pdf" && (
            <iframe
              src={downloadUrl}
              className="h-[70vh] w-full rounded-lg border border-border"
              title={file.file_name}
            />
          )}

          {/* 其他不支持预览的类型 */}
          {!["text", "code", "image", "pdf"].includes(file.file_type) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="mb-1 text-sm text-muted-foreground">
                此文件类型暂不支持在线预览
              </p>
              <p className="mb-4 text-xs text-muted-foreground/60">
                请下载后使用本地应用查看
              </p>
              <a
                href={downloadUrl}
                download={file.file_name}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                下载文件
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
