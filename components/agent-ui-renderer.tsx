"use client";

import type { UiEvent } from "@/types/ai";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Check, X, ListTree, ListChecks, Sparkles, Loader2, Circle,
} from "lucide-react";

interface AgentUiRendererProps {
  event: UiEvent;
  onAction: (action: string, data: unknown) => void;
}

function DiffView({ props, onAction }: { props: Record<string, unknown>; onAction: (action: string, data: unknown) => void }) {
  const oldText = String(props.oldText ?? "");
  const newText = String(props.newText ?? "");
  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
      <CardContent className="p-3 space-y-2">
        {!!props.title && <p className="text-sm font-medium">{String(props.title)}</p>}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="font-medium text-red-600 dark:text-red-400 mb-1">原文</p>
            <p className="whitespace-pre-wrap text-muted-foreground line-through">{oldText}</p>
          </div>
          <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <p className="font-medium text-green-600 dark:text-green-400 mb-1">修改后</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{newText}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="h-7 text-xs" onClick={() => onAction("accept", { newText })}>
            <Check className="h-3 w-3 mr-1" />接受
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent" onClick={() => onAction("reject", {})}>
            <X className="h-3 w-3 mr-1" />拒绝
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SuggestionCard({ props, onAction }: { props: Record<string, unknown>; onAction: (action: string, data: unknown) => void }) {
  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardContent className="p-3 space-y-2">
        {!!props.title && <p className="text-sm font-medium">{String(props.title)}</p>}
        {!!props.summary && <p className="text-xs text-muted-foreground">{String(props.summary)}</p>}
        <Button size="sm" className="h-7 text-xs" onClick={() => onAction("apply", { title: props.title, summary: props.summary })}>
          应用
        </Button>
      </CardContent>
    </Card>
  );
}

function TagSuggestions({ props, onAction }: { props: Record<string, unknown>; onAction: (action: string, data: unknown) => void }) {
  const tags = Array.isArray(props.tags) ? props.tags as { name: string; reason?: string }[] : [];
  if (tags.length === 0) return null;
  return (
    <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium">建议标签</p>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
              {tag.name}
            </span>
          ))}
        </div>
        <Button size="sm" className="h-7 text-xs" onClick={() => onAction("apply-tags", { tags: tags.map(t => t.name) })}>
          添加标签
        </Button>
      </CardContent>
    </Card>
  );
}

function OutlineView({ props, onAction }: { props: Record<string, unknown>; onAction: (action: string, data: unknown) => void }) {
  const items = Array.isArray(props.items) ? props.items as { level?: number; text?: string }[] : [];
  const actionItems = Array.isArray(props.actionItems) ? props.actionItems as { text?: string; checked?: boolean }[] : [];
  const outline = Array.isArray(props.outline) ? props.outline as { level?: number; text?: string }[] : items;
  const summary = typeof props.summary === "string" ? props.summary : "";
  if (items.length === 0) return null;
  return (
    <Card className="border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-800">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <ListTree className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <p className="text-sm font-medium">{props.title ? String(props.title) : "大纲"}</p>
        </div>
        <div className="space-y-1">
          {items.map((item, i) => (
            <p
              key={i}
              className="text-xs text-muted-foreground"
              style={{ paddingLeft: `${((item.level ?? 1) - 1) * 12}px` }}
            >
              {item.text}
            </p>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="h-7 text-xs" onClick={() => onAction("preview-outline", { summary, outline, actionItems })}>
            <Sparkles className="h-3 w-3 mr-1" />预览效果
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionItems({ props, onAction }: { props: Record<string, unknown>; onAction: (action: string, data: unknown) => void }) {
  const items = Array.isArray(props.items) ? props.items as { text?: string; checked?: boolean }[] : [];
  const outline = Array.isArray(props.outline) ? props.outline as { level?: number; text?: string }[] : [];
  const actionItems = Array.isArray(props.actionItems) ? props.actionItems as { text?: string; checked?: boolean }[] : items;
  const summary = typeof props.summary === "string" ? props.summary : "";
  if (items.length === 0) return null;
  return (
    <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium">{props.title ? String(props.title) : "待办事项"}</p>
        </div>
        <div className="space-y-1">
          {items.map((item, i) => (
            <label key={i} className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={item.checked ?? false}
                onChange={() => onAction("toggle-item", { index: i, checked: !item.checked })}
                className="h-3 w-3 rounded border-muted-foreground"
              />
              <span className={item.checked ? "line-through text-muted-foreground/50" : "text-muted-foreground"}>
                {item.text}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="h-7 text-xs" onClick={() => onAction("preview-items", { summary, outline, actionItems })}>
            <Sparkles className="h-3 w-3 mr-1" />预览效果
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PolishProgress({ props, onAction }: { props: Record<string, unknown>; onAction: (action: string, data: unknown) => void }) {
  const status = String(props.status ?? "pending");
  const progress = Number(props.progress ?? 0);
  const polishedText = String(props.polishedText ?? "");
  const originalText = String(props.originalText ?? "");

  if (status === "polishing" || status === "running") {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="p-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium">润色中...</p>
            {progress > 0 && (
              <div className="mt-1 h-1.5 w-full bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progress * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "done" || status === "complete") {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium">润色完成</p>
          </div>
          {polishedText && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">润色结果预览：</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {originalText && (
                  <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <p className="font-medium text-red-600 dark:text-red-400 mb-1">原文</p>
                    <p className="whitespace-pre-wrap text-muted-foreground line-through">{originalText.slice(0, 200)}</p>
                  </div>
                )}
                <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <p className="font-medium text-green-600 dark:text-green-400 mb-1">修改后</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{polishedText.slice(0, 200)}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={() => onAction("accept", { newText: polishedText })}>
              <Check className="h-3 w-3 mr-1" />接受
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent" onClick={() => onAction("reject", {})}>
              <X className="h-3 w-3 mr-1" />拒绝
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

function PreviewControls({ props, onAction }: { props: Record<string, unknown>; onAction: (action: string, data: unknown) => void }) {
  const type = String(props.type ?? "outline");
  return (
    <Card className="border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">预览：{type === "outline" ? "大纲" : "待办"}</p>
          <p className="text-xs text-muted-foreground">内容已插入编辑器，可直接编辑修改</p>
        </div>
        <Button size="sm" className="h-7 text-xs" onClick={() => onAction("accept", {})}>
          <Check className="h-3 w-3 mr-1" />应用
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent" onClick={() => onAction("discard", {})}>
          <X className="h-3 w-3 mr-1" />取消
        </Button>
      </CardContent>
    </Card>
  );
}

const UI_COMPONENTS: Record<string, React.ComponentType<{ props: Record<string, unknown>; onAction: (action: string, data: unknown) => void }>> = {
  "diff-view": DiffView,
  "suggestion-card": SuggestionCard,
  "tag-suggestions": TagSuggestions,
  "outline-view": OutlineView,
  "action-items": ActionItems,
  "polish-progress": PolishProgress,
  "preview-controls": PreviewControls,
};

export function AgentUiRenderer({ event, onAction }: AgentUiRendererProps) {
  const Component = UI_COMPONENTS[event.component];
  if (!Component) return null;
  return <Component props={event.props} onAction={onAction} />;
}
