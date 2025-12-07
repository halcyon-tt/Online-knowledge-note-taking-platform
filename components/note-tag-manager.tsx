"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
} from "lucide-react";
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

const PAGE_SIZE = 5;

export function NoteTagManager({
  noteId,
  noteTags,
  onTagsChange,
}: NoteTagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const useLocalStorage = !isSupabaseConfigured();

  // 加载标签
  useEffect(() => {
    async function loadTags() {
      setLoading(true);
      try {
        if (useLocalStorage) {
          setTags(getLocalTags());
          setLoading(false);
          return;
        }

        const supabase = createClient();
        if (!supabase) {
          setLoading(false);
          return;
        }

        const userId = await getUserId();
        if (!userId) {
          setTags([]);
          setLoading(false);
          return;
        }

        // 加载所有标签
        const { data: tagsData } = await supabase
          .from("tags")
          .select("*")
          .eq("user_id", userId)
          .order("name");

        if (tagsData) {
          setTags(tagsData as Tag[]);
        }

        // 加载笔记已有标签
        const { data: noteTagsData } = await supabase
          .from("note_tags")
          .select("tag_id")
          .eq("note_id", noteId)
          .eq("user_id", userId);

        if (noteTagsData && noteTagsData.length > 0) {
          const tagIds = noteTagsData.map((nt) => nt.tag_id);
          const tagNames: string[] = [];

          for (const tagId of tagIds) {
            const tag = tagsData?.find((t) => t.id === tagId);
            if (tag) {
              tagNames.push(tag.name);
            }
          }

          if (tagNames.length > 0) {
            onTagsChange(tagNames);
          }
        }
      } catch (error) {
        console.error("加载标签失败:", error);
      } finally {
        setLoading(false);
      }
    }
    loadTags();
  }, [useLocalStorage, noteId]);

  // 添加标签
  const handleAddTag = async (tagId: string) => {
    const tagData = tags.find((t) => t.id === tagId);
    if (!tagData) return;

    // 检查是否已添加
    if (noteTags.includes(tagData.name)) {
      setOpen(false);
      return;
    }

    setSaving(true);
    try {
      if (useLocalStorage) {
        addTagToNote(noteId, tagId);
        const updatedNote = getLocalNotes().find((n) => n.id === noteId);
        if (updatedNote) {
          onTagsChange(updatedNote.tags || []);
        }
      } else {
        const supabase = createClient();
        if (!supabase) return;

        const userId = await getUserId();
        if (!userId) {
          alert("请先登录");
          return;
        }

        const { error } = await supabase.from("note_tags").insert({
          tag_id: tagId,
          note_id: noteId,
          user_id: userId,
          created_at: new Date().toISOString(),
        });

        if (error) {
          console.error("添加标签失败:", error);
          alert("添加标签失败: " + error.message);
          return;
        }

        onTagsChange([...noteTags, tagData.name]);
      }
    } catch (error) {
      console.error("添加标签出错:", error);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  // 移除标签
  const handleRemoveTag = async (tagName: string) => {
    setSaving(true);
    try {
      if (useLocalStorage) {
        const tagData = tags.find((t) => t.name === tagName);
        if (tagData) {
          removeTagFromNote(noteId, tagData.id);
        }
        onTagsChange(noteTags.filter((t) => t !== tagName));
      } else {
        const supabase = createClient();
        if (!supabase) return;

        const userId = await getUserId();
        if (!userId) return;

        const tagData = tags.find((t) => t.name === tagName);
        if (!tagData) return;

        const { error } = await supabase
          .from("note_tags")
          .delete()
          .eq("note_id", noteId)
          .eq("tag_id", tagData.id)
          .eq("user_id", userId);

        if (!error) {
          onTagsChange(noteTags.filter((t) => t !== tagName));
        }
      }
    } catch (error) {
      console.error("移除标签出错:", error);
    } finally {
      setSaving(false);
    }
  };

  // 可用标签（未添加到笔记的）
  const availableTags = tags.filter((t) => !noteTags.includes(t.name));

  // 分页
  const totalPages = Math.ceil(availableTags.length / PAGE_SIZE);
  const paginatedTags = availableTags.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">加载标签中...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 保存状态指示 */}
      {saving && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">保存中...</span>
        </div>
      )}

      {/* 已添加的标签列表 */}
      {noteTags.map((tagName) => {
        const tagData = tags.find((t) => t.name === tagName);
        return (
          <Badge
            key={tagName}
            variant="secondary"
            className="text-xs h-6 gap-1 pr-1"
          >
            <span
              className={`w-2 h-2 rounded-full ${tagData?.color || "bg-gray-400"}`}
            />
            {tagName}
            <button
              onClick={() => handleRemoveTag(tagName)}
              className="ml-0.5 hover:text-destructive p-0.5 rounded hover:bg-destructive/10"
              disabled={saving}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}

      {/* 添加标签按钮 */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={saving}
          >
            <Plus className="h-3 w-3 mr-1" />
            添加标签
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          {availableTags.length > 0 ? (
            <>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {paginatedTags.map((tag) => {
                  const isAdded = noteTags.includes(tag.name);
                  return (
                    <div
                      key={tag.id}
                      className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                        isAdded
                          ? "bg-primary/10 cursor-default"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => !isAdded && handleAddTag(tag.id)}
                    >
                      <span
                        className={`w-3 h-3 rounded-full mr-2 ${tag.color || "bg-gray-400"}`}
                      />
                      <span className="text-sm flex-1 truncate">
                        {tag.name}
                      </span>
                      {isAdded ? (
                        <Check className="h-3 w-3 text-primary" />
                      ) : (
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 分页控制 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={currentPage >= totalPages - 1}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              {tags.length === 0 ? "请先在侧边栏创建标签" : "所有标签已添加"}
            </p>
          )}
        </PopoverContent>
      </Popover>

      {/* 保存按钮 */}
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-xs ml-2 bg-transparent"
        disabled={saving}
        onClick={() => {
          // 手动触发保存确认
          setSaving(true);
          setTimeout(() => setSaving(false), 500);
        }}
      >
        {saving ? (
          <>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            保存中
          </>
        ) : (
          <>
            <Check className="h-3 w-3 mr-1" />
            已保存
          </>
        )}
      </Button>
    </div>
  );
}
