"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Sparkles, X } from "lucide-react";

interface PolishProgressProps {
  props: Record<string, unknown>;
  onAction: (action: string, data: unknown) => void;
}

export function PolishProgress({ props, onAction }: PolishProgressProps) {
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
              <p className="text-xs font-medium text-muted-foreground">
                润色结果预览：
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {originalText && (
                  <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <p className="font-medium text-red-600 dark:text-red-400 mb-1">
                      原文
                    </p>
                    <p className="whitespace-pre-wrap text-muted-foreground line-through">
                      {originalText.slice(0, 200)}
                    </p>
                  </div>
                )}
                <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <p className="font-medium text-green-600 dark:text-green-400 mb-1">
                    修改后
                  </p>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {polishedText.slice(0, 200)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => onAction("accept", { newText: polishedText })}
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

  return null;
}
