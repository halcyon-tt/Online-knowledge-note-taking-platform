"use client";

import type React from "react";
import { FileText, Pencil, Check, X, Trash } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { Note, Tag as TagType } from "@/types/note";

interface SidebarNoteItemProps {
  note: Note;
  tags: TagType[];
  pathname: string;
  editingId: string | null;
  editingTitle: string;
  onStartEdit: (e: React.MouseEvent, note: Note) => void;
  onSaveTitle: (noteId: string) => void;
  onCancelEdit: () => void;
  onTitleChange: (title: string) => void;
  onKeyDown: (e: React.KeyboardEvent, noteId: string) => void;
  handleDeleteNote: (noteId: string) => void;
}

export function SidebarNoteItem({
  note,
  tags,
  pathname,
  editingId,
  editingTitle,
  onStartEdit,
  onSaveTitle,
  onCancelEdit,
  onTitleChange,
  onKeyDown,
  handleDeleteNote,
}: SidebarNoteItemProps) {
  const isEditing = editingId === note.id;

  return (
    <SidebarMenuItem key={note.id}>
      {isEditing ? (
        <div className="flex items-center gap-1 px-2 py-1.5">
          <Input
            value={editingTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={(e) => note.id && onKeyDown(e, note.id)}
            className="h-7 text-sm flex-1"
            autoFocus
            placeholder="笔记标题"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={() => note.id && onSaveTitle(note.id)}
          >
            <Check className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={onCancelEdit}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      ) : (
        <SidebarMenuButton
          asChild
          isActive={pathname === `/dashboard/notes/${note.id}`}
          className="group"
        >
          <Link href={`/dashboard/notes/${note.id}`}>
            <FileText className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0 overflow-hidden">
              <span className="truncate block max-w-full">
                {note.title || "未命名笔记"}
              </span>
              {/* 显示笔记标签 */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {note.tags.slice(0, 2).map((tagName) => {
                    const tagData = tags.find((t) => t.name === tagName);
                    return (
                      <span
                        key={tagName}
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tagData?.color || "bg-gray-400"}`}
                      />
                    );
                  })}
                  {note.tags.length > 2 && (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      +{note.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={(e) => onStartEdit(e, note)}
              className="h-5 w-5 shrink-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
            {/* <button
                onClick={() => handleDeleteNote(note.id)}
              className="h-5 w-5 shrink-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
            >
              <Trash className="h-3 w-3 text-muted-foreground" />
            </button> */}
          </Link>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  );
}
