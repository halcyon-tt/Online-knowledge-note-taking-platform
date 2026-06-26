"use client";

import type React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Loader2, RefreshCw, Check, X, CornerDownLeft, Type } from "lucide-react";
import { polishText } from "@/lib/ai-client";
import type { PolishStyle } from "@/types/ai";
import { toast } from "sonner";

interface AIPolishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  onConfirm: (polishedText: string) => void;
  onInsertBelow: (polishedText: string) => void;
  onReject: () => void;
}

const STYLE_OPTIONS: { value: PolishStyle; label: string; desc: string }[] = [
  { value: "fluent", label: "流畅优化", desc: "修正语病，通顺自然" },
  { value: "professional", label: "专业严谨", desc: "正式书面，专业表达" },
  { value: "concise", label: "简洁精炼", desc: "删减冗余，保留核心" },
  { value: "casual", label: "口语自然", desc: "平实易懂，日常语气" },
];

export function AIPolishDialog({
  open,
  onOpenChange,
  selectedText,
  onConfirm,
  onInsertBelow,
  onReject,
}: AIPolishDialogProps) {
  const [style, setStyle] = useState<PolishStyle>("fluent");
  const [polishedText, setPolishedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handlePolish = useCallback(async () => {
    if (!selectedText.trim()) return;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setLoading(true);
    setError(null);
    setPolishedText(null);

    try {
      const data = await polishText(
        { text: selectedText, style },
        abortController.signal
      );
      setPolishedText(data.polishedText);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "润色服务异常");
    } finally {
      setLoading(false);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [selectedText, style]);

  const handleConfirm = () => {
    if (polishedText) {
      onConfirm(polishedText);
      onOpenChange(false);
    }
  };

  const handleInsertBelow = () => {
    if (polishedText) {
      onInsertBelow(polishedText);
      onOpenChange(false);
    }
  };

  const handleCopy = async () => {
    if (!polishedText) return;
    try {
      await navigator.clipboard.writeText(polishedText);
      toast.success("润色结果已复制");
    } catch {
      toast.error("复制失败，请重试");
    }
  };

  const handleReject = () => {
    abortControllerRef.current?.abort();
    onReject();
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      abortControllerRef.current?.abort();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-muted-foreground" />
            润色
          </DialogTitle>
          <DialogDescription>
            选择语言风格，预览结果后再决定如何应用。
          </DialogDescription>
        </DialogHeader>

        {/* Style selector */}
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant="outline"
              size="sm"
              onClick={() => {
                setStyle(opt.value);
                setPolishedText(null);
              }}
              className={
                style === opt.value
                  ? "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background"
                  : "bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Original text preview */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">原文</p>
          <div className="p-3 rounded-lg bg-muted/50 text-sm max-h-[120px] overflow-y-auto">
            {selectedText}
          </div>
        </div>

        {/* Result area */}
        <ScrollArea className="flex-1 min-h-[120px]">
          {loading ? (
            <div className="flex items-center justify-center h-full py-8">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">AI 正在润色...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          ) : polishedText ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">润色结果</p>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm leading-relaxed whitespace-pre-wrap">
                {polishedText}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full py-8">
              <p className="text-sm text-muted-foreground">
                选择润色风格后点击“开始润色”
              </p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          {polishedText ? (
            <>
              <Button variant="outline" onClick={handleReject} className="bg-transparent">
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button variant="outline" onClick={handlePolish} disabled={loading} className="bg-transparent">
                <RefreshCw className="h-4 w-4 mr-1" />
                重新生成
              </Button>
              <Button variant="outline" onClick={handleCopy} className="bg-transparent">
                <Copy className="h-4 w-4 mr-1" />
                复制
              </Button>
              <Button variant="outline" onClick={handleInsertBelow} className="bg-transparent">
                <CornerDownLeft className="h-4 w-4 mr-1" />
                插入下方
              </Button>
              <Button onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-1" />
                确认替换
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleReject} className="bg-transparent">
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button onClick={handlePolish} disabled={loading}>
                <Type className="h-4 w-4 mr-1" />
                开始润色
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
