"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { FileText, Plus, Home, Loader2, Pencil, Check, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  createLocalNote,
  getLocalNotes,
  updateLocalNote,
} from "@/lib/local-storage";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Note } from "@/types/note";

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

  // 获取用户笔记
  useEffect(() => {
    async function loadNotes() {
      setLoading(true);
      try {
        if (useLocalStorage) {
          setNotes(getLocalNotes());
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <span className="font-semibold text-lg">笔记</span>
          </Link>
          <ThemeToggle />
        </div>
      </SidebarHeader>

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
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>我的笔记</span>
            <span className="text-xs text-muted-foreground">
              {notes.length} 篇
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
                  {notes.map((note) => (
                    <SidebarMenuItem key={note.id}>
                      {editingId === note.id ? (
                        <div className="flex items-center gap-1 px-2 py-1.5">
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, note.id)}
                            className="h-7 text-sm flex-1"
                            autoFocus
                            placeholder="笔记标题"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0"
                            onClick={() => handleSaveTitle(note.id)}
                          >
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0"
                            onClick={handleCancelEdit}
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
                            <span className="truncate flex-1">
                              {note.title || "未命名笔记"}
                            </span>
                            <button
                              onClick={(e) => handleStartEdit(e, note)}
                              className="h-5 w-5 shrink-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}
                  {notes.length === 0 && (
                    <p className="px-2 py-4 text-sm text-muted-foreground text-center">
                      暂无笔记
                    </p>
                  )}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <Button onClick={handleCreateNote} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          新建笔记
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
