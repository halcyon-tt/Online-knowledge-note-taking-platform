"use client";

import type React from "react";

import { useState } from "react";
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
}

export function NoteNameDialog({
  open,
  onOpenChange,
  onConfirm,
}: NoteNameDialogProps) {
  const [noteName, setNoteName] = useState("");

  const handleConfirm = () => {
    const trimmedName = noteName.trim();
    if (trimmedName) {
      onConfirm(trimmedName);
      setNoteName("");
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
          <DialogTitle>创建新笔记</DialogTitle>
          <DialogDescription>请输入笔记名称</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="note-name">笔记名称</Label>
            <Input
              id="note-name"
              value={noteName}
              onChange={(e) => setNoteName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入笔记名称..."
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setNoteName("");
              onOpenChange(false);
            }}
          >
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!noteName.trim()}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
