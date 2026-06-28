"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Check,
  Loader2,
  Search,
  BookOpen,
  Tag,
  FileEdit,
  Sparkles,
  Wrench,
  X,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { executeEditorTool, getCurrentEditor } from "@/lib/editor-bridge";
import type { Editor } from "@tiptap/react";

// AG-UI Phase C：把 agent 的工具调用列表渲染为有序步骤流。
// 每个 step：图标 + 中文标签 + 状态 (pending/running/done/failed) + 简短输出 + 详细 diff（可选）。
// 用 CSS 入场动画做错落效果（依赖 globals.css 里的 @keyframes thinkingStepIn）。

interface StepData {
  id: string;
  tool: string;
  args: unknown;
  result?: unknown;
  done?: boolean;
}

interface ThinkingStepsProps {
  steps: StepData[];
  onUndo?: (step: StepData) => void;
}

// 工具的友好元数据：图标 + 中文标签 + 颜色
const TOOL_META: Record<
  string,
  { icon: LucideIcon; label: string; colorClass: string }
> = {
  search_notes: {
    icon: Search,
    label: "搜索笔记",
    colorClass: "text-sky-600 dark:text-sky-400 bg-sky-100/60 dark:bg-sky-900/40",
  },
  get_note: {
    icon: BookOpen,
    label: "读取笔记",
    colorClass:
      "text-violet-600 dark:text-violet-400 bg-violet-100/60 dark:bg-violet-900/40",
  },
  list_tags: {
    icon: Tag,
    label: "列出标签",
    colorClass:
      "text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/40",
  },
  propose_note_update: {
    icon: FileEdit,
    label: "生成修改建议",
    colorClass:
      "text-rose-600 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-900/40",
  },
  edit_note_text: {
    icon: FileEdit,
    label: "修改文本",
    colorClass:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40",
  },
  stream_edit_note_text: {
    icon: Sparkles,
    label: "流式生成",
    colorClass:
      "text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40",
  },
};

function getToolMeta(tool: string) {
  return (
    TOOL_META[tool] ?? {
      icon: Wrench,
      label: tool,
      colorClass:
        "text-muted-foreground bg-muted",
    }
  );
}

// 把工具结果格式化为一行人类可读的摘要
function summarizeResult(tool: string, result: unknown): string | null {
  if (result == null) return null;
  if (tool === "edit_note_text" || tool === "stream_edit_note_text") {
    const r = result as {
      applied?: boolean;
      finished?: boolean;
      newText?: string;
      reason?: string;
    };
    if (!(r.applied || r.finished)) {
      return `未应用${r.reason ? `（${r.reason}）` : ""}`;
    }
    return r.newText ? `${r.newText.length} 字` : "已应用";
  }
  if (tool === "search_notes" && Array.isArray(result)) {
    return `找到 ${result.length} 篇`;
  }
  if (tool === "get_note") {
    const r = result as { title?: string };
    return r?.title ? `《${r.title}》` : null;
  }
  if (tool === "list_tags" && Array.isArray(result)) {
    return `${result.length} 个标签`;
  }
  return null;
}

function StepRow({
  step,
  index,
  onUndo,
}: {
  step: StepData;
  index: number;
  onUndo?: (step: StepData) => void;
}) {
  const meta = getToolMeta(step.tool);
  const Icon = meta.icon;
  const summary = step.done ? summarizeResult(step.tool, step.result) : null;

  // 错落入场：每个 step 延迟 60ms
  const animationDelay = `${Math.min(index * 60, 400)}ms`;

  return (
    <div
      className="thinking-step flex items-start gap-2 text-xs"
      style={{ animationDelay }}
    >
      {/* 序号 + 图标 */}
      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${meta.colorClass}`}>
        <Icon className="h-3 w-3" />
      </div>

      {/* 步骤内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-foreground/80 font-medium">{meta.label}</span>
          {summary && (
            <span className="text-muted-foreground/70 text-[11px]">· {summary}</span>
          )}
          {/* 状态指示 */}
          {step.done ? (
            <Check className="h-3 w-3 text-green-500 dark:text-green-400" />
          ) : (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* 编辑工具的 diff 详情 + 撤销 */}
        {(step.tool === "edit_note_text" || step.tool === "stream_edit_note_text") && (() => {
          const r = step.result as {
            applied?: boolean;
            finished?: boolean;
            oldText?: string;
            newText?: string;
            from?: number;
            insertedAt?: number;
          } | undefined;
          if (!r || (!r.applied && !r.finished) || !r.newText) return null;
          const fromPos = r.from ?? r.insertedAt ?? 0;
          return (
            <Card className="mt-1.5 bg-muted/20 border-border/40">
              <CardContent className="p-1.5 space-y-1">
                {r.oldText && (
                  <div className="p-1.5 rounded bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60">
                    <p className="font-medium text-[10px] text-red-600 dark:text-red-400 mb-0.5">原文</p>
                    <p className="whitespace-pre-wrap text-muted-foreground line-through text-[11px] leading-relaxed">{r.oldText}</p>
                  </div>
                )}
                <div className="p-1.5 rounded bg-green-50/80 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/60">
                  <p className="font-medium text-[10px] text-green-600 dark:text-green-400 mb-0.5">{r.oldText ? "替换为" : "插入"}</p>
                  <p className="whitespace-pre-wrap text-muted-foreground text-[11px] leading-relaxed">{r.newText}</p>
                </div>
                {r.oldText && (
                  <div className="flex justify-end gap-1 pt-0.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] bg-transparent"
                      onClick={() => {
                        const editor = getCurrentEditor<Editor>();
                        if (!editor) return;
                        // Phase D：跳转到 AI 修改的位置
                        try {
                          const docSize = editor.state.doc.content.size;
                          const safePos = Math.max(0, Math.min(fromPos, docSize));
                          editor.commands.focus();
                          editor.commands.setTextSelection({
                            from: safePos,
                            to: Math.min(safePos + (r.newText?.length ?? 0), docSize),
                          });
                          editor.commands.scrollIntoView();
                        } catch {
                          // 静默
                        }
                      }}
                      title="跳转到这次修改的位置"
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      跳转
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] bg-transparent"
                      onClick={() => {
                        const ok = executeEditorTool("edit_note_text", {
                          operation: "replaceRange",
                          from: fromPos,
                          to: fromPos + r.newText!.length,
                          text: r.oldText!,
                        }) as { applied?: boolean } | null;
                        if (!ok?.applied) {
                          alert("撤销失败：内容可能已变化，无法定位。");
                        }
                      }}
                      title="撤销这次 AI 修改"
                    >
                      <X className="h-3 w-3 mr-1" />
                      撤销
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}

export function ThinkingSteps({ steps, onUndo }: ThinkingStepsProps) {
  if (steps.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {steps.map((step, i) => (
        <StepRow key={step.id || i} step={step} index={i} onUndo={onUndo} />
      ))}
    </div>
  );
}
