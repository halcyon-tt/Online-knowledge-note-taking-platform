"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TagSuggestionsProps {
  props: Record<string, unknown>;
  onAction: (action: string, data: unknown) => void;
}

export function TagSuggestions({ props, onAction }: TagSuggestionsProps) {
  const tags = Array.isArray(props.tags)
    ? (props.tags as { name: string; reason?: string }[])
    : [];
  if (tags.length === 0) return null;

  return (
    <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium">建议标签</p>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
              title={tag.reason ?? ""}
            >
              {tag.name}
            </span>
          ))}
        </div>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            onAction("apply-tags", { tags: tags.map((t) => t.name) })
          }
        >
          添加标签
        </Button>
      </CardContent>
    </Card>
  );
}
