"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SuggestionCardProps {
  props: Record<string, unknown>;
  onAction: (action: string, data: unknown) => void;
}

export function SuggestionCard({ props, onAction }: SuggestionCardProps) {
  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardContent className="p-3 space-y-2">
        {!!props.title && <p className="text-sm font-medium">{String(props.title)}</p>}
        {!!props.summary && (
          <p className="text-xs text-muted-foreground">{String(props.summary)}</p>
        )}
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            onAction("apply", {
              title: props.title,
              summary: props.summary,
            })
          }
        >
          应用
        </Button>
      </CardContent>
    </Card>
  );
}
