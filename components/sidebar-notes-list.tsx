"use client";

import { Loader2 } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { SidebarNoteItem } from "@/components/sidebar-note-item";
import type { Note, Tag as TagType } from "@/types/note";
import type React from "react";

interface SidebarNotesListProps {
  notes: Note[];
  filteredNotes: Note[];
  tags: TagType[];
  loading: boolean;
  searchQuery: string;
  selectedTags: string[];
  pathname: string;
  editingId: string | null;
  editingTitle: string;
  onStartEdit: (e: React.MouseEvent, note: Note) => void;
  onSaveTitle: (noteId: string) => void;
  onCancelEdit: () => void;
  onTitleChange: (title: string) => void;
  onKeyDown: (e: React.KeyboardEvent, noteId: string) => void;
}

export function SidebarNotesList({
  notes,
  filteredNotes,
  tags,
  loading,
  searchQuery,
  selectedTags,
  pathname,
  editingId,
  editingTitle,
  onStartEdit,
  onSaveTitle,
  onCancelEdit,
  onTitleChange,
  onKeyDown,
}: SidebarNotesListProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between">
        <span>我的笔记</span>
        <span className="text-xs text-muted-foreground">
          {filteredNotes.length}
          {filteredNotes.length !== notes.length && `/${notes.length}`} 篇
        </span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <>
              {filteredNotes.map((note) => (
                <SidebarNoteItem
                  key={note.id}
                  note={note}
                  tags={tags}
                  pathname={pathname}
                  editingId={editingId}
                  editingTitle={editingTitle}
                  onStartEdit={onStartEdit}
                  onSaveTitle={onSaveTitle}
                  onCancelEdit={onCancelEdit}
                  onTitleChange={onTitleChange}
                  onKeyDown={onKeyDown}
                />
              ))}
              {filteredNotes.length === 0 && (
                <p className="px-2 py-4 text-sm text-muted-foreground text-center">
                  {searchQuery || selectedTags.length > 0
                    ? "没有匹配的笔记"
                    : "暂无笔记"}
                </p>
              )}
            </>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
