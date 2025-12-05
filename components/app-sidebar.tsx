"use client";

import type React from "react";

import { useEffect, useState, useMemo } from "react";
import { Plus, Home } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  createLocalNote,
  getLocalNotes,
  updateLocalNote,
  getLocalTags,
  createLocalTag,
  deleteLocalTag,
  searchLocalNotes,
} from "@/lib/local-storage";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { SidebarHeaderComponent } from "@/components/sidebar-header";
import { SidebarSearch } from "@/components/sidebar-search";
import { SidebarTagsSection } from "@/components/sidebar-tags-section";
import { SidebarNotesList } from "@/components/sidebar-notes-list";
import type { Note, Tag as TagType } from "@/types/note";

// 固定用户ID（在实现登录功能前使用）
const DEFAULT_USER_ID = "4af03726-c537-4a07-a9a9-3c05a266954a";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const useLocalStorage = !isSupabaseConfigured();

  const [searchQuery, setSearchQuery] = useState("");
  const [tags, setTags] = useState<TagType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // 获取用户笔记
  useEffect(() => {
    async function loadNotes() {
      setLoading(true);
      try {
        if (useLocalStorage) {
          setNotes(getLocalNotes());
          setTags(getLocalTags());
        } else {
          const supabase = createClient();
          if (!supabase) {
            setNotes([]);
            return;
          }

          const { data, error } = await supabase
            .from("notes")
            .select("*")
            .eq("user_id", DEFAULT_USER_ID)
            .order("updated_at", { ascending: false });

          if (error) {
            console.error("Error loading notes:", error);
            setNotes([]);
          } else {
            setNotes((data as Note[]) || []);
          }

          // 加载标签
          const { data: tagsData } = await supabase
            .from("tags")
            .select("*")
            .order("name");

          if (tagsData) {
            setTags(tagsData as TagType[]);
          }
        }
      } catch (error) {
        console.error("Failed to load notes:", error);
        setNotes([]);
      } finally {
        setLoading(false);
      }
    }

    loadNotes();
  }, [useLocalStorage]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery && selectedTags.length === 0) {
      return notes;
    }

    if (useLocalStorage) {
      return searchLocalNotes(searchQuery, selectedTags);
    }

    // Supabase 模式下的前端筛选
    const lowerQuery = searchQuery.toLowerCase();
    return notes.filter((note) => {
      const matchesQuery =
        !searchQuery ||
        note.title.toLowerCase().includes(lowerQuery) ||
        note.content.toLowerCase().includes(lowerQuery);

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => note.tags?.includes(tag));

      return matchesQuery && matchesTags;
    });
  }, [notes, searchQuery, selectedTags, useLocalStorage]);

  // 创建新笔记
  const handleCreateNote = async () => {
    if (useLocalStorage) {
      const newNote = createLocalNote({ title: "未命名笔记", content: "" });
      setNotes(getLocalNotes());
      router.push(`/dashboard/notes/${newNote.id}`);
      router.refresh();
    } else {
      const supabase = createClient();
      if (!supabase) {
        console.error("No Supabase client");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("notes")
          .insert({
            title: "未命名笔记",
            content: "",
            user_id: DEFAULT_USER_ID,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating note:", error);
          alert("创建笔记失败: " + error.message);
          return;
        }

        if (data) {
          setNotes((prev) => [data as Note, ...prev]);
          router.push(`/dashboard/notes/${data.id}`);
          router.refresh();
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        alert("创建笔记时发生未知错误");
      }
    }
  };

  const handleCreateTag = async (tagName: string) => {
    if (useLocalStorage) {
      createLocalTag(tagName);
      setTags(getLocalTags());
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("tags")
        .insert({ name: tagName, user_id: DEFAULT_USER_ID })
        .select()
        .single();

      if (data) {
        setTags((prev) => [...prev, data as TagType]);
      }
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (useLocalStorage) {
      deleteLocalTag(tagId);
      setTags(getLocalTags());
      setNotes(getLocalNotes());
      setSelectedTags((prev) => {
        const tag = tags.find((t) => t.id === tagId);
        return tag ? prev.filter((t) => t !== tag.name) : prev;
      });
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase.from("tags").delete().eq("id", tagId);
      if (error) {
        console.error("Error deleting tag:", error);
        return;
      }

      const deletedTag = tags.find((t) => t.id === tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      if (deletedTag) {
        setSelectedTags((prev) => prev.filter((t) => t !== deletedTag.name));
      }
    }
  };

  const toggleTagFilter = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleStartEdit = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(note.id);
    setEditingTitle(note.title || "");
  };

  const handleSaveTitle = async (noteId: string) => {
    const trimmedTitle = editingTitle.trim() || "未命名笔记";

    if (useLocalStorage) {
      updateLocalNote(noteId, { title: trimmedTitle });
      setNotes(getLocalNotes());
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from("notes")
        .update({ title: trimmedTitle, updated_at: new Date().toISOString() })
        .eq("id", noteId);

      if (error) {
        console.error("Error updating title:", error);
        return;
      }

      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? {
                ...n,
                title: trimmedTitle,
                updated_at: new Date().toISOString(),
              }
            : n
        )
      );
    }

    setEditingId(null);
    setEditingTitle("");
    router.refresh();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, noteId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle(noteId);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="w-64 min-w-64 max-w-64 overflow-hidden"
    >
      <SidebarHeaderComponent />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                  <Link href="/dashboard">
                    <Home className="h-4 w-4" />
                    <span>首页</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <Button onClick={handleCreateNote} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            新建笔记
          </Button>
        </SidebarGroup>

        <SidebarSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <SidebarTagsSection
          tags={tags}
          selectedTags={selectedTags}
          onTagCreate={handleCreateTag}
          onTagDelete={handleDeleteTag}
          onTagToggle={toggleTagFilter}
          onClearFilter={() => setSelectedTags([])}
        />

        <SidebarNotesList
          notes={notes}
          filteredNotes={filteredNotes}
          tags={tags}
          loading={loading}
          searchQuery={searchQuery}
          selectedTags={selectedTags}
          pathname={pathname}
          editingId={editingId}
          editingTitle={editingTitle}
          onStartEdit={handleStartEdit}
          onSaveTitle={handleSaveTitle}
          onCancelEdit={handleCancelEdit}
          onTitleChange={setEditingTitle}
          onKeyDown={handleKeyDown}
        />
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <Button onClick={handleCreateNote} className="w-full">
          登录/注册
        </Button>
        {useLocalStorage && (
          <p className="text-xs text-yellow-600 mt-2 text-center">
            本地存储模式
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
