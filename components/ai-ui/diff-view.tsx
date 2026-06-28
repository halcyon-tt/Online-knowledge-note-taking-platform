"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface DiffViewProps {
  props: Record<string, unknown>;
  onAction: (action: string, data: unknown) => void;
}

export function DiffView({ props, onAction }: DiffViewProps) {
  const oldText = String(props.oldText ?? "");
  const newText = String(props.newText ?? "");
  const title = props.title ? String(props.title) : "";
  const field = props.field ? String(props.field) : "content";

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
      <CardContent className="p-3 space-y-2">
        {!!title && <p className="text-sm font-medium">{title}</p>}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="font-medium text-red-600 dark:text-red-400 mb-1">原{field === "title" ? "标题" : "文"}</p>
            <p className="whitespace-pre-wrap text-muted-foreground line-through">{oldText}</p>
          </div>
          <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <p className="font-medium text-green-600 dark:text-green-400 mb-1">修改后</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{newText}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => onAction("accept", { newText, field })}
          >
            <Check className="h-3 w-3 mr-1" />
            接受
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs bg-transparent"
            onClick={() => onAction("reject", {})}
          >
            <X className="h-3 w-3 mr-1" />
            拒绝
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
