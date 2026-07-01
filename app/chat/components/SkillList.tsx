"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getSkills,
  getSkillFiles,
  getSkillFileContent,
  deleteSkill,
} from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import type {
  SkillInfo,
  SkillFilesResponse,
} from "@/lib/types";
import {
  Puzzle,
  Bot,
  User,
  Factory,
  Trash2,
  ChevronRight,
  ChevronDown,
  FileText,
  Upload,
  X,
} from "lucide-react";

// ─── 图标映射 ───

const sourceIcons: Record<string, React.ReactNode> = {
  agent: <Bot className="h-3.5 w-3.5" />,
  user: <User className="h-3.5 w-3.5" />,
  system: <Factory className="h-3.5 w-3.5" />,
};

const sourceLabels: Record<string, string> = {
  agent: "Agent 自创",
  user: "用户上传",
  system: "系统预装",
};

// ─── 文件预览弹窗 ───

function FilePreviewModal({
  path,
  content,
  onClose,
}: {
  path: string;
  content: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="truncate text-sm font-medium">{path}</span>
          <button onClick={onClose} className="rounded p-0.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <pre className="max-h-[60vh] overflow-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap break-all">
          {content || "(空文件)"}
        </pre>
      </div>
    </div>
  );
}

// ─── SkillList 主组件 ───

export function SkillList() {
  const { user } = useAuth();
  const userId = user?.id || "";

  const [skills, setSkills] = useState<Record<string, SkillInfo[]>>({
    system: [],
    agent: [],
    user: [],
  });
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [skillFiles, setSkillFiles] = useState<SkillFilesResponse | null>(null);
  const [preview, setPreview] = useState<{ path: string; content: string } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // 加载 skills
  const loadSkills = useCallback(() => {
    if (!userId) return;
    getSkills(userId)
      .then(setSkills)
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // 展开/折叠 skill 文件列表
  const toggleSkillFiles = async (
    skillName: string,
    source: string
  ) => {
    if (expandedSkill === `${source}:${skillName}`) {
      setExpandedSkill(null);
      setSkillFiles(null);
      return;
    }
    setExpandedSkill(`${source}:${skillName}`);
    try {
      const files = await getSkillFiles(skillName, userId, source);
      setSkillFiles(files);
    } catch {
      setSkillFiles(null);
    }
  };

  // 预览文件内容
  const handleFileClick = async (filePath: string) => {
    if (!expandedSkill) return;
    const [source, skillName] = expandedSkill.split(":");
    try {
      const result = await getSkillFileContent(skillName, userId, source, filePath);
      setPreview({ path: filePath, content: result.content });
    } catch (e) {
      console.error("读取 skill 文件失败:", e);
    }
  };

  // 删除用户 skill
  const handleDelete = async (skillName: string) => {
    if (!confirm(`确定删除 skill "${skillName}" 吗？`)) return;
    try {
      await deleteSkill(skillName, userId);
      loadSkills();
    } catch {
      // ignore
    }
  };

  // 上传 skill
  const handleUpload = async () => {
    if (!uploadName.trim() || !uploadFiles || uploadFiles.length === 0) return;
    setUploading(true);
    setUploadError("");

    try {
      // 调试：检查文件内容
      for (let i = 0; i < uploadFiles.length; i++) {
        console.log(`上传文件[${i}]: ${uploadFiles[i].name}, 大小: ${uploadFiles[i].size} bytes`);
      }

      const formData = new FormData();
      formData.append("skill_name", uploadName.trim());
      formData.append("user_id", userId);
      for (let i = 0; i < uploadFiles.length; i++) {
        formData.append("files", uploadFiles[i]);
      }

      const token = getToken();
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8009";

      // 不要手动传 Content-Type，让浏览器自动设 multipart boundary
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/v1/skill/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "上传失败" }));
        throw new Error(err.detail || "上传失败");
      }

      setUploadOpen(false);
      setUploadName("");
      setUploadFiles(null);
      loadSkills();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const sources = ["system", "agent", "user"] as const;

  return (
    <>
      {/* 上传弹窗 */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setUploadOpen(false)}>
          <div
            className="w-full max-w-md rounded-xl border bg-card p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-medium">上传 Skill</span>
              <button onClick={() => setUploadOpen(false)} className="rounded p-0.5 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Skill 名称（与 SKILL.md 中 name 一致）"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              className="mb-2 w-full rounded-lg border px-3 py-2 text-sm"
            />

            <input
              type="file"
              multiple
              onChange={(e) => setUploadFiles(e.target.files)}
              className="mb-3 w-full text-sm"
            />

            {uploadError && (
              <p className="mb-2 text-xs text-destructive">{uploadError}</p>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || !uploadName.trim() || !uploadFiles}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {uploading ? "上传中..." : "上传"}
            </button>
          </div>
        </div>
      )}

      {/* 文件预览弹窗 */}
      {preview && (
        <FilePreviewModal
          path={preview.path}
          content={preview.content}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Sidebar 区域 */}
      <div className="border-b px-2 pb-2">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpandedSource(expandedSource === "skills" ? null : "skills")}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded px-1 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          {expandedSource === "skills" ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          <Puzzle className="h-4 w-4 shrink-0" />
          <span>Skills</span>
          <span className="text-xs font-normal text-muted-foreground">
            ({skills.system.length + skills.agent.length + skills.user.length})
          </span>
        </div>

        {expandedSource === "skills" &&
          sources.map((src) => {
            const items = skills[src] || [];
            const isExpanded = expandedSource === "skills";

            return (
              <div key={src} className="pl-5 pr-2">
                {/* 分类标题 */}
                <div className="flex items-center gap-1.5 py-1">
                  {sourceIcons[src]}
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {sourceLabels[src]} ({items.length})
                  </span>
                  {src === "user" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setUploadOpen(true); }}
                      className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-accent/10 hover:text-accent"
                      title="上传 Skill"
                    >
                      <Upload className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Skill 列表 */}
                {items.map((skill) => (
                  <div key={skill.name}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSkillFiles(skill.name, src)}
                      className={`flex w-full cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-muted ${
                        expandedSkill === `${src}:${skill.name}` ? "bg-muted" : ""
                      }`}
                    >
                      {expandedSkill === `${src}:${skill.name}` ? (
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate flex-1">{skill.name}</span>
                      {src === "user" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(skill.name);
                          }}
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="删除 Skill"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* 文件列表 */}
                    {expandedSkill === `${src}:${skill.name}` && skillFiles && (
                      <div className="pl-5 pr-1">
                        {skillFiles.files.map((f) => (
                          <button
                            key={f.path}
                            onClick={() => handleFileClick(f.path)}
                            className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[11px] text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate flex-1">{f.path}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {items.length === 0 && (
                  <p className="py-1 text-[11px] text-muted-foreground text-center">
                    暂无
                  </p>
                )}
              </div>
            );
          })}
      </div>
    </>
  );
}
