"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Maximize2, Minimize2, Type, Wand2 } from "lucide-react";
import { polishText, expandText, condenseText } from "@/lib/ai-client";
import type { PolishStyle } from "@/types/ai";
import { toast } from "sonner";

interface AIContextMenuProps {
  editor: unknown;
  open: boolean;
  x: number;
  y: number;
  selectedText: string;
  onClose: () => void;
  onResult: (text: string) => void;
}

const POLISH_STYLES: { value: PolishStyle; label: string }[] = [
  { value: "fluent", label: "流畅" },
  { value: "professional", label: "专业" },
  { value: "concise", label: "简洁" },
  { value: "casual", label: "口语" },
  { value: "academic", label: "学术" },
];

export function AIContextMenu({ open, x, y, selectedText, onClose, onResult }: AIContextMenuProps) {
  const [submenu, setSubmenu] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setSubmenu(null);
      setLoading(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose]);

  const handleAction = useCallback(async (action: string, style?: PolishStyle) => {
    setLoading(action);
    try {
      let result: string;
      if (action === "expand") {
        result = await expandText(selectedText);
      } else if (action === "condense") {
        result = await condenseText(selectedText);
      } else if (action === "polish" && style) {
        const resp = await polishText({ text: selectedText, style });
        result = resp.polishedText;
      } else {
        return;
      }
      onResult(result);
      toast.success("AI 处理完成");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI 处理失败");
    } finally {
      setLoading(null);
    }
  }, [selectedText, onResult, onClose]);

  if (!open) return null;

  const menuStyle: React.CSSProperties = {
    position: "fixed",
    left: `${Math.min(x, window.innerWidth - 220)}px`,
    top: `${Math.min(y, window.innerHeight - 300)}px`,
    zIndex: 9999,
  };

  const menu = (
    <div ref={menuRef} style={menuStyle} className="min-w-[180px] rounded-lg border border-border bg-popover p-1 shadow-xl">
      <button
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
        onClick={() => handleAction("expand")}
        disabled={loading !== null}
      >
        {loading === "expand" ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          : <Maximize2 className="h-3 w-3" />}
        扩写
      </button>
      <button
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
        onClick={() => handleAction("condense")}
        disabled={loading !== null}
      >
        {loading === "condense" ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          : <Minimize2 className="h-3 w-3" />}
        精简
      </button>

      <div className="relative">
        <button
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
          onMouseEnter={() => setSubmenu(submenu === "rewrite" ? null : "rewrite")}
          disabled={loading !== null}
        >
          <Wand2 className="h-3 w-3" />
          改写风格
          <span className="ml-auto text-muted-foreground">▸</span>
        </button>
        {submenu === "rewrite" && (
          <div className="absolute left-full top-0 ml-1 min-w-[120px] rounded-lg border border-border bg-popover p-1 shadow-xl">
            {POLISH_STYLES.map((s) => (
              <button
                key={s.value}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                onClick={() => handleAction("polish", s.value)}
                disabled={loading !== null}
              >
                {loading === `polish-${s.value}` ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  : <Type className="h-3 w-3" />}
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(menu, document.body);
}
