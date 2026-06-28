"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface PreviewControlsProps {
  props: Record<string, unknown>;
  onAction: (action: string, data: unknown) => void;
}

export function PreviewControls({ props, onAction }: PreviewControlsProps) {
  const type = String(props.type ?? "outline");
  return (
    <Card className="border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">
            预览：{type === "outline" ? "大纲" : "待办"}
          </p>
          <p className="text-xs text-muted-foreground">
            内容已插入编辑器，可直接编辑修改
          </p>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => onAction("accept", {})}
        >
          <Check className="h-3 w-3 mr-1" />
          应用
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs bg-transparent"
          onClick={() => onAction("discard", {})}
        >
          <X className="h-3 w-3 mr-1" />
          取消
        </Button>
      </CardContent>
    </Card>
  );
}
