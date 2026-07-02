"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type FormEvent, type ChangeEvent } from "react";
import { Send, Paperclip, X, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getModels } from "@/lib/api-client";
import type { ModelOverride, ModelItemRaw } from "@/lib/types";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  files?: { name: string; path: string }[];
  onFilesChange?: (files: { name: string; path: string }[]) => void;
  onUploadFiles?: (files: FileList) => void;
  model?: ModelOverride | null;
  onModelChange?: (model: ModelOverride | null) => void;
}

// 自定义模型 localStorage key
const STORED_MODELS_KEY = "geesun_models";

function loadStoredModels(): ModelOverride[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORED_MODELS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredModels(models: ModelOverride[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORED_MODELS_KEY, JSON.stringify(models));
}

export function MessageInput({
  onSend,
  disabled,
  files = [],
  onFilesChange,
  onUploadFiles,
  model,
  onModelChange,
}: MessageInputProps) {
  const [input, setInput] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [addModelOpen, setAddModelOpen] = useState(false);
  const [addModelForm, setAddModelForm] = useState({ model_name: "", base_url: "", api_key: "" });
  const [customModels, setCustomModels] = useState<ModelOverride[]>(loadStoredModels);
  const [systemModels, setSystemModels] = useState<ModelItemRaw[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  // 从后端获取系统预装模型
  useEffect(() => {
    getModels()
      .then((res) => setSystemModels(res.models || []))
      .catch(() => setSystemModels([]));
  }, []);

  // 构建完整模型列表：系统预装 + 自定义
  const allModels: (ModelItemRaw | ModelOverride)[] = [
    ...systemModels,
    ...customModels.map((m) => ({ ...m, id: m.model_name })),
  ];

  // 默认模型：从系统预装中取 is_default=true 的，兜底取第一个
  const defaultModel = systemModels.find((m) => m.is_default) || systemModels[0] || null;
  const selectedModel = model || (defaultModel ? { model_name: defaultModel.model_name, base_url: "", api_key: "" } : null);
  const selectedId = selectedModel?.model_name || defaultModel?.model_name || "";
  const selectedLabel = selectedId || "选择模型";

  // 点击外部关闭模型下拉
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;
      onUploadFiles?.(fileList);
      e.target.value = "";
    },
    [onUploadFiles]
  );

  const handleAddModel = () => {
    if (!addModelForm.model_name.trim() || !addModelForm.base_url.trim()) return;
    const newModel: ModelOverride = {
      model_name: addModelForm.model_name.trim(),
      base_url: addModelForm.base_url.trim(),
      api_key: addModelForm.api_key.trim() || undefined,
    };
    const updated = [...customModels, newModel];
    setCustomModels(updated);
    saveStoredModels(updated);
    onModelChange?.(newModel);
    setAddModelOpen(false);
    setAddModelForm({ model_name: "", base_url: "", api_key: "" });
  };

  const selectModel = (m: ModelItemRaw | ModelOverride) => {
    const isSystem = "is_default" in m;
    onModelChange?.(isSystem ? null : { model_name: m.model_name, base_url: "base_url" in m ? m.base_url : "", api_key: "api_key" in m ? m.api_key : "" });
    setModelOpen(false);
  };

  return (
    <div className="border-t bg-background p-4">
      {/* 文件标签 */}
      {files.length > 0 && (
        <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3 text-muted-foreground" />
              <span className="max-w-[160px] truncate">{f.name}</span>
              <button
                onClick={() => onFilesChange?.(files.filter((_, j) => j !== i))}
                className="ml-0.5 rounded-sm p-0.5 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mx-auto max-w-3xl rounded-2xl border bg-muted/50 p-2 transition-colors focus-within:border-primary/50 focus-within:bg-background">
        {/* 输入框 */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
          disabled={disabled}
          rows={1}
          className="min-h-[44px] w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between px-1 pb-1">
          <div className="flex items-center gap-1.5">
            {/* 模型选择器 */}
            <div className="relative" ref={modelRef}>
              <button
                type="button"
                onClick={() => setModelOpen(!modelOpen)}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
              >
                <span className="max-w-[100px] truncate">{selectedLabel}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {modelOpen && (
                <div className="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-lg border bg-card p-1 shadow-lg">
                  {allModels.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectModel(m)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${
                        selectedId === m.model_name
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="flex-1 truncate">{m.model_name}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {"is_default" in m ? "系统预置" : "自定义"}
                      </span>
                    </button>
                  ))}
                  <div className="mx-1 my-0.5 border-t" />
                  <button
                    type="button"
                    onClick={() => { setModelOpen(false); setAddModelOpen(true); }}
                    className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
                  >
                    <Plus className="h-3 w-3" />
                    添加模型
                  </button>
                </div>
              )}
            </div>

            {/* 上传文件按钮 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="上传文件"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* 发送按钮 */}
          <Button
            type="button"
            size="icon"
            disabled={disabled || !input.trim()}
            onClick={() => handleSubmit()}
            className="h-9 w-9 shrink-0 rounded-lg"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 添加模型弹窗 */}
      {addModelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAddModelOpen(false)}>
          <form
            autoComplete="off"
            className="w-full max-w-sm rounded-xl border bg-card p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold">添加自定义模型</h3>
            <input
              type="text"
              name="model-name"
              autoComplete="off"
              placeholder="模型名称（如 gpt-4o）"
              value={addModelForm.model_name}
              onChange={(e) => setAddModelForm((f) => ({ ...f, model_name: e.target.value }))}
              className="mb-2 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <input
              type="text"
              name="model-base-url"
              autoComplete="off"
              placeholder="Base URL（如 https://api.openai.com/v1）"
              value={addModelForm.base_url}
              onChange={(e) => setAddModelForm((f) => ({ ...f, base_url: e.target.value }))}
              className="mb-2 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <input
              type="password"
              name="model-api-key"
              autoComplete="new-password"
              placeholder="API Key（可选）"
              value={addModelForm.api_key}
              onChange={(e) => setAddModelForm((f) => ({ ...f, api_key: e.target.value }))}
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddModelOpen(false)} className="flex-1">
                取消
              </Button>
              <Button onClick={handleAddModel} className="flex-1">
                添加
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
