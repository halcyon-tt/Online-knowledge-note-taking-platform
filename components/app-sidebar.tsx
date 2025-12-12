"use client";

import type React from "react";

import { useEffect, useState, useCallback } from "react";
import { Plus, Home, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth-utils";
import {
  createLocalNote,
  getLocalNotes,
  updateLocalNote,
  getLocalTags,
  createLocalTag,
  deleteLocalTag,
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
import { AISearchDialog } from "@/components/ai-search-dialog";
import { NoteNameDialog } from "@/components/note-name-dialog";
import type { Note, Tag as TagType } from "@/types/note";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCurrentFolderIdStore } from "@/lib/store/folders";

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
  const [loginStatus, setLoginStatus] = useState("登录/注册");
  const [folderNoteIds, setFolderNoteIds] = useState<string[] | null>(null);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const { state, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const { currentFolderId, setCurrentFolderId } = useCurrentFolderIdStore();

  useEffect(() => {
    async function checkLoginStatus() {
      if (!useLocalStorage) {
        const supabase = createClient();
        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            setLoginStatus(
              `已登录: ${user.user_metadata?.username || user.email || "用户"}`
            );
          } else {
            setLoginStatus("登录/注册");
          }
        }
      }
    }
    checkLoginStatus();
  }, [useLocalStorage]);

  useEffect(() => {
    async function fetchFolderNoteIds() {
      const supabase = createClient();
      if (currentFolderId.trim() !== "" && !useLocalStorage) {
        if (!supabase) {
          console.error("No Supabase client");
          setFolderNoteIds(null);
          return;
        }
      }
      const userId = await getUserId();
      if (!userId) {
        alert("请先登录");
        setFolderNoteIds(null);
        router.push("/login");
        return;
      }
      try {
        const { data, error } = await supabase
          .from("folders")
          .select("notes_id")
          .eq("id", currentFolderId)
          .eq("user_id", userId)
          .single();

        if (error) {
          console.error("Error fetching folder note IDs:", error);
          setFolderNoteIds(null);
          return;
        }

        if (data && data.notes_id) {
          const ids = data.notes_id
            .split(",")
            .filter((id: string) => id && id.trim() !== "")
            .map((id: string) => id.trim());
          setFolderNoteIds(ids);
        } else {
          setFolderNoteIds(null);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        alert("查询文件夹时发生未知错误");
        setFolderNoteIds(null);
      }
    }
    fetchFolderNoteIds();
  }, [currentFolderId, useLocalStorage]);

  const loadNotes = useCallback(async () => {
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

        const userId = await getUserId();
        if (!userId) {
          setNotes([]);
          setTags([]);
          return;
        }

        const { data, error } = await supabase
          .from("notes")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (error) {
          console.error("Error loading notes:", error);
          setNotes([]);
        } else {
          setNotes((data as Note[]) || []);
        }

        const { data: tagsData } = await supabase
          .from("tags")
          .select("*")
          .eq("user_id", userId)
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
  }, [useLocalStorage]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const getTaggedNoteIds = useCallback(async () => {
    if (selectedTags.length === 0) return null;

    if (useLocalStorage) {
      return new Set(
        notes
          .filter((note) =>
            note.tags?.some((tag) => selectedTags.includes(tag))
          )
          .map((note) => note.id)
          .filter(Boolean) as string[]
      );
    } else {
      const supabase = createClient();
      if (!supabase) return null;

      const { data } = await supabase
        .from("note_tags")
        .select("note_id")
        .in("tag_id", selectedTags);

      return new Set(
        (data || []).map((item: { note_id: string }) => item.note_id)
      );
    }
  }, [selectedTags, useLocalStorage, notes]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        let result = [...notes];

        if (
          folderNoteIds &&
          Array.isArray(folderNoteIds) &&
          folderNoteIds.length > 0
        ) {
          result = result.filter(
            (note) => note.id && folderNoteIds.includes(note.id)
          );
        }

        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          result = result.filter((note) => {
            return (
              (note.title && note.title.toLowerCase().includes(lowerQuery)) ||
              (note.content && note.content.toLowerCase().includes(lowerQuery))
            );
          });
        }

        if (selectedTags.length > 0) {
          const taggedNoteIds = await getTaggedNoteIds();
          if (taggedNoteIds) {
            result = result.filter(
              (note) => note.id && taggedNoteIds.has(note.id)
            );
          }
        }

        setFilteredNotes(result);
      } catch (error) {
        console.error("过滤笔记时出错:", error);
        setFilteredNotes([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [notes, folderNoteIds, searchQuery, selectedTags, getTaggedNoteIds]);

  const handleCreateNote = () => {
    setShowNameDialog(true);
  };

  const handleConfirmCreateNote = async (noteName: string) => {
    if (useLocalStorage) {
      const newNote = createLocalNote({ title: noteName, content: "" });
      setNotes(getLocalNotes());
      router.push(`/dashboard/notes/${newNote.id}`);
    } else {
      const supabase = createClient();
      if (!supabase) {
        console.error("No Supabase client");
        return;
      }

      const userId = await getUserId();
      if (!userId) {
        alert("请先登录");
        router.push("/login");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("notes")
          .insert({
            title: noteName,
            content: "",
            user_id: userId,
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
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        alert("创建笔记时发生未知错误");
      }
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleCreateTag = async (tagName: string) => {
    if (useLocalStorage) {
      createLocalTag(tagName);
      setTags(getLocalTags());
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const userId = await getUserId();
      if (!userId) {
        alert("请先登录");
        return;
      }

      const { data, error } = await supabase
        .from("tags")
        .insert({ name: tagName, user_id: userId })
        .select()
        .single();

      if (error) {
        console.error("Error creating tag:", error);
        alert("创建标签失败: " + error.message);
        return;
      }

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

  const toggleTagFilter = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleStartEdit = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    if (note.id) setEditingId(note.id);
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

  const handleLogin = async () => {
    if (loginStatus.startsWith("已登录")) {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
        await supabase.auth.signOutWithOAuth();
        setLoginStatus("登录/注册");
      }
    } else {
      router.push("/login");
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (useLocalStorage) {
      const notes = getLocalNotes().filter((n) => n.id !== noteId);
      setNotes(notes);
      localStorage.setItem("notes", JSON.stringify(notes));
    } else {
      const supabase = createClient();
      if (!supabase) return;
      const { error } = await supabase.from("notes").delete().eq("id", noteId);
      if (error) {
        console.error("Error deleting note:", error);
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className={
        (state === "collapsed" ? "w-0" : "w-64 min-w-64 max-w-64") +
        " overflow-hidden"
      }
    >
      <SidebarHeaderComponent />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                  <Link href="/dashboard" onClick={handleNavClick}>
                    <Home className="h-4 w-4" />
                    <span>首页</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard/ai-chat"}
                >
                  <Link href="/dashboard/ai-chat" onClick={handleNavClick}>
                    <Sparkles className="h-4 w-4" />
                    <span>AI 智能对话</span>
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

        <SidebarGroup>
          <AISearchDialog />
        </SidebarGroup>

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
          handleDeleteNote={handleDeleteNote}
        />
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <Button onClick={handleLogin} className="w-full">
          {loginStatus}
        </Button>
        {useLocalStorage && (
          <p className="text-xs text-yellow-600 mt-2 text-center">
            本地存储模式
          </p>
        )}
      </SidebarFooter>

      <NoteNameDialog
        open={showNameDialog}
        onOpenChange={setShowNameDialog}
        onConfirm={handleConfirmCreateNote}
      />
    </Sidebar>
  );
}
