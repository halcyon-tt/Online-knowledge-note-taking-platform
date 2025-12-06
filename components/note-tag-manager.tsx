"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth-utils";
import {
  getLocalTags,
  addTagToNote,
  removeTagFromNote,
  getLocalNotes,
} from "@/lib/local-storage";
import type { Tag } from "@/types/note";

interface NoteTagManagerProps {
  noteId: string;
  noteTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function NoteTagManager({
  noteId,
  noteTags,
  onTagsChange,
}: NoteTagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const useLocalStorage = !isSupabaseConfigured();

  useEffect(() => {
    async function loadTags() {
      if (useLocalStorage) {
        setTags(getLocalTags());
      } else {
        const supabase = createClient();
        if (!supabase) return;

        const userId = await getUserId();
        if (!userId) {
          setTags([]);
          return;
        }

        const { data } = await supabase
          .from("tags")
          .select("*")
          .eq("user_id", userId)
          .order("name");
        if (data) {
          setTags(data as Tag[]);
        }
      }
    }
    loadTags();
  }, [useLocalStorage]);

  const handleAddTag = async (tagName: string) => {
    if (noteTags.includes(tagName)) return;

    if (useLocalStorage) {
      addTagToNote(noteId, tagName);
      const updatedNote = getLocalNotes().find((n) => n.id === noteId);
      if (updatedNote) {
        onTagsChange(updatedNote.tags || []);
      }
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const newTags = [...noteTags, tagName];
      const { error } = await supabase
        .from("notes")
        .update({ tags: newTags, updated_at: new Date().toISOString() })
        .eq("id", noteId);

      if (!error) {
        onTagsChange(newTags);
      }
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    if (useLocalStorage) {
      removeTagFromNote(noteId, tagName);
      const updatedNote = getLocalNotes().find((n) => n.id === noteId);
      if (updatedNote) {
        onTagsChange(updatedNote.tags || []);
      }
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const newTags = noteTags.filter((t) => t !== tagName);
      const { error } = await supabase
        .from("notes")
        .update({ tags: newTags, updated_at: new Date().toISOString() })
        .eq("id", noteId);

      if (!error) {
        onTagsChange(newTags);
      }
    }
  };

  const availableTags = tags.filter((t) => !noteTags.includes(t.name));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {noteTags.map((tagName) => {
        const tagData = tags.find((t) => t.name === tagName);
        return (
          <Badge
            key={tagName}
            variant="secondary"
            className="text-xs h-6 gap-1"
          >
            <span
              className={`w-2 h-2 rounded-full ${tagData?.color || "bg-gray-400"}`}
            />
            {tagName}
            <button
              onClick={() => handleRemoveTag(tagName)}
              className="ml-0.5 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            添加标签
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          {availableTags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {availableTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="cursor-pointer text-xs h-6 hover:bg-accent"
                  onClick={() => {
                    handleAddTag(tag.name);
                    setOpen(false);
                  }}
                >
                  <span className={`w-2 h-2 rounded-full mr-1 ${tag.color}`} />
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              {tags.length === 0 ? "请先在侧边栏创建标签" : "所有标签已添加"}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
