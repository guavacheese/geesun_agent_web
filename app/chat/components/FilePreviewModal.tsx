"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { GeneratedFile } from "@/lib/types";
import { X, Download, FileText } from "lucide-react";
import { getToken } from "@/lib/auth";

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  file: GeneratedFile;
  downloadUrl: string;
  userId: string;
  sessionId: string;
}

/** 带 Authorization header 的 fetch */
async function authFetch(url: string): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`加载失败 (${res.status})`);
  return res;
}

/** 通过 fetch blob 触发文件下载 */
async function downloadWithAuth(url: string, filename: string): Promise<void> {
  const res = await authFetch(url);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
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
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const prevBlobUrlRef = useRef<string | null>(null);

  // 组件卸载时释放 blob URL
  useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
    };
  }, []);

  // 文本/代码文件：加载内容
  const loadTextContent = useCallback(async () => {
    if (file.file_type !== "text" && file.file_type !== "code") return;
    if (textContent !== null) return;

    setTextLoading(true);
    setTextError(null);
    try {
      const res = await authFetch(downloadUrl);
      const text = await res.text();
      setTextContent(text);
    } catch (e) {
      setTextError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setTextLoading(false);
    }
  }, [file.file_type, downloadUrl, textContent]);

  // 图片/PDF：加载 blob 数据用于预览
  const loadPreviewBlob = useCallback(async () => {
    if (file.file_type !== "image" && file.file_type !== "pdf") return;
    if (previewBlobUrl) return;

    setPreviewLoading(true);
    setTextError(null);
    try {
      const res = await authFetch(downloadUrl);
      const blob = await res.blob();
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      prevBlobUrlRef.current = url;
      setPreviewBlobUrl(url);
    } catch (e) {
      setTextError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setPreviewLoading(false);
    }
  }, [file.file_type, downloadUrl, previewBlobUrl]);

  useEffect(() => {
    if (open) {
      loadTextContent();
      loadPreviewBlob();
    }
  }, [open, loadTextContent, loadPreviewBlob]);

  const handleDownload = useCallback(() => {
    downloadWithAuth(downloadUrl, file.file_name);
  }, [downloadUrl, file.file_name]);

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
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Download className="h-3.5 w-3.5" />
              下载
            </button>
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
          {/* 加载提示（非文本类型） */}
          {previewLoading && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
              <span className="ml-2">加载中...</span>
            </div>
          )}

          {/* 错误提示 */}
          {textError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {textError}
            </div>
          )}

          {/* 文本/代码 */}
          {(file.file_type === "text" || file.file_type === "code") && (
            <div className="h-full">
              {textLoading && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
                  <span className="ml-2">加载中...</span>
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
          {file.file_type === "image" && previewBlobUrl && (
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewBlobUrl}
                alt={file.file_name}
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
              />
            </div>
          )}

          {/* PDF */}
          {file.file_type === "pdf" && previewBlobUrl && (
            <iframe
              src={previewBlobUrl}
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
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                下载文件
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
