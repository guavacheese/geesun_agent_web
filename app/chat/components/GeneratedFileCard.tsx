"use client";

import { useState } from "react";
import type { GeneratedFile } from "@/lib/types";
import { FilePreviewModal } from "./FilePreviewModal";
import { FileText, Image, FileSpreadsheet, FileArchive, File } from "lucide-react";
import { getToken } from "@/lib/auth";

interface GeneratedFileCardProps {
  file: GeneratedFile;
  userId: string;
  sessionId: string;
}

/** 根据文件类型返回对应的图标组件 */
function FileTypeIcon({ fileType, className }: { fileType: GeneratedFile["file_type"]; className?: string }) {
  switch (fileType) {
    case "image":
      return <Image className={className} />;
    case "text":
    case "code":
      return <FileText className={className} />;
    case "spreadsheet":
      return <FileSpreadsheet className={className} />;
    case "archive":
      return <FileArchive className={className} />;
    default:
      return <File className={className} />;
  }
}

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** 从虚拟路径中提取相对于会话的文件名 */
function extractFilename(filePath: string, userId: string, sessionId: string): string {
  // file_path 格式: /reports/{userId}/{sessionId}/{filename} 或 /uploads/{userId}/{sessionId}/{filename}
  const prefix = `/${userId}/${sessionId}/`;
  const idx = filePath.indexOf(prefix);
  if (idx >= 0) {
    return filePath.slice(idx + prefix.length);
  }
  // fallback: 取路径最后一段
  return filePath.split("/").pop() || filePath;
}

export function GeneratedFileCard({ file, userId, sessionId }: GeneratedFileCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  // 构造可下载的 URL（通过 Next.js rewrite 代理到后端）
  const filename = extractFilename(file.file_path, userId, sessionId);
  const encodedFilename = filename.split("/").map(encodeURIComponent).join("/");
  const downloadUrl = `/api/v1/files/${userId}/${sessionId}/${encodedFilename}`;

  const sizeLabel = formatFileSize(file.file_size);
  const canPreview = ["text", "code", "image", "pdf"].includes(file.file_type);

  const handleDownload = async () => {
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(downloadUrl, { headers });
      if (!res.ok) throw new Error(`下载失败 (${res.status})`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch (e) {
      console.error("下载失败:", e);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2 text-sm transition-colors hover:bg-card/80">
        {/* 文件图标 */}
        <div className="flex shrink-0 items-center justify-center">
          <FileTypeIcon
            fileType={file.file_type}
            className="h-5 w-5 text-muted-foreground"
          />
        </div>

        {/* 文件名 + 大小 */}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-foreground">
            {file.file_name}
          </div>
          {sizeLabel && (
            <div className="text-xs text-muted-foreground">{sizeLabel}</div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex shrink-0 items-center gap-1">
          {canPreview && (
            <button
              onClick={() => setPreviewOpen(true)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              预览
            </button>
          )}
          <button
            onClick={handleDownload}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            下载
          </button>
        </div>
      </div>

      {/* 预览弹窗 */}
      {previewOpen && (
        <FilePreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          file={file}
          downloadUrl={downloadUrl}
          userId={userId}
          sessionId={sessionId}
        />
      )}
    </>
  );
}
