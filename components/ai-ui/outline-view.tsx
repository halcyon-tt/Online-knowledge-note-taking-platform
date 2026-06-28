"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListTree, Sparkles } from "lucide-react";

interface OutlineViewProps {
  props: Record<string, unknown>;
  onAction: (action: string, data: unknown) => void;
}

export function OutlineView({ props, onAction }: OutlineViewProps) {
  const items = Array.isArray(props.items)
    ? (props.items as { level?: number; text?: string }[])
    : [];
  const actionItems = Array.isArray(props.actionItems)
    ? (props.actionItems as { text?: string; checked?: boolean }[])
    : [];
  const outline = Array.isArray(props.outline)
    ? (props.outline as { level?: number; text?: string }[])
    : items;
  const summary = typeof props.summary === "string" ? props.summary : "";
  if (items.length === 0) return null;

  return (
    <Card className="border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-800">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <ListTree className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <p className="text-sm font-medium">
            {props.title ? String(props.title) : "大纲"}
          </p>
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
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              onAction("preview-outline", { summary, outline, actionItems })
            }
          >
            <Sparkles className="h-3 w-3 mr-1" />
            预览效果
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
