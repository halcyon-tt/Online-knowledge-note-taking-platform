"use client";

import type React from "react";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NoteNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (noteName: string) => void;
  title?: string;
  description?: string;
  label?: string;
  placeholder?: string;
  confirmLabel?: string;
  defaultValue?: string;
}

export function NoteNameDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "创建新笔记",
  description = "请输入笔记名称",
  label = "笔记名称",
  placeholder = "输入笔记名称...",
  confirmLabel = "创建",
  defaultValue = "",
}: NoteNameDialogProps) {
  const [noteName, setNoteName] = useState(defaultValue);

  useEffect(() => {
    if (open) {
      setNoteName(defaultValue);
    }
  }, [defaultValue, open]);

  const handleConfirm = () => {
    const trimmedName = noteName.trim();
    if (trimmedName) {
      onConfirm(trimmedName);
      setNoteName(defaultValue);
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="note-name">{label}</Label>
            <Input
              id="note-name"
              value={noteName}
              onChange={(e) => setNoteName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setNoteName(defaultValue);
              onOpenChange(false);
            }}
          >
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!noteName.trim()}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
