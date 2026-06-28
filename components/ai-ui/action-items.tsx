"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, Sparkles } from "lucide-react";

interface ActionItemsProps {
  props: Record<string, unknown>;
  onAction: (action: string, data: unknown) => void;
}

export function ActionItems({ props, onAction }: ActionItemsProps) {
  const items = Array.isArray(props.items)
    ? (props.items as { text?: string; checked?: boolean }[])
    : [];
  const outline = Array.isArray(props.outline)
    ? (props.outline as { level?: number; text?: string }[])
    : [];
  const actionItems = Array.isArray(props.actionItems)
    ? (props.actionItems as { text?: string; checked?: boolean }[])
    : items;
  const summary = typeof props.summary === "string" ? props.summary : "";
  if (items.length === 0) return null;

  return (
    <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium">
            {props.title ? String(props.title) : "待办事项"}
          </p>
        </div>
        <div className="space-y-1">
          {items.map((item, i) => (
            <label
              key={i}
              className="flex items-center gap-2 text-xs cursor-pointer"
            >
              <input
                type="checkbox"
                checked={item.checked ?? false}
                onChange={() =>
                  onAction("toggle-item", {
                    index: i,
                    checked: !item.checked,
                  })
                }
                className="h-3 w-3 rounded border-muted-foreground"
              />
              <span
                className={
                  item.checked
                    ? "line-through text-muted-foreground/50"
                    : "text-muted-foreground"
                }
              >
                {item.text}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              onAction("preview-items", { summary, outline, actionItems })
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
