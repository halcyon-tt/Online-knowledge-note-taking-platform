"use client";

import type React from "react";

import { useEffect, useState, useCallback } from "react";
import { Plus, Home, Sparkles, LogOut, LogIn } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fetchFolder } from "@/lib/api/folders";
import {
  fetchTags,
  createTag as apiCreateTag,
  deleteTag as apiDeleteTag,
} from "@/lib/api/tags";
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
import { useAuth } from "@/contexts/AuthContext";
import { useNotes } from "@/contexts/NotesContext";
import { toast } from "sonner";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // 使用 NotesContext 管理笔记状态
  const { notes, loading, refreshNotes, createNote, updateNote, deleteNote } =
    useNotes();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [tags, setTags] = useState<TagType[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [folderNoteIds, setFolderNoteIds] = useState<string[] | null>(null);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const { state, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const { currentFolderId, setCurrentFolderId } = useCurrentFolderIdStore();

  const { user, signOut, loading: authLoading } = useAuth();
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    async function fetchFolderNoteIds() {
      if (!currentFolderId || currentFolderId.trim() === "") {
        setFolderNoteIds(null);
        return;
      }

      try {
        const data = await fetchFolder(Number(currentFolderId));
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
        console.error("获取文件夹笔记ID失败:", error);
        setFolderNoteIds(null);
      }
    }
    fetchFolderNoteIds();
  }, [currentFolderId]);

  // 加载标签
  const loadTags = useCallback(async () => {
    try {
      const data = await fetchTags();
      setTags(data);
    } catch (error) {
      console.error("加载标签失败:", error);
      setTags([]);
    }
  }, []);

  // 初始加载标签
  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // 当路由变化时，刷新笔记列表
  useEffect(() => {
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/folder")) {
      refreshNotes();
    }
  }, [pathname, refreshNotes]);

  const getTaggedNoteIds = useCallback(() => {
    if (selectedTags.length === 0) return null;

    const selectedTagNames = selectedTags
      .map((tagId) => tags.find((t) => t.id === tagId)?.name)
      .filter(Boolean) as string[];

    return new Set(
      notes
        .filter((note) =>
          note.tags?.some((tag) => selectedTagNames.includes(tag))
        )
        .map((note) => note.id)
        .filter((id): id is number => id != null)
    );
  }, [selectedTags, notes, tags]);

  // 过滤笔记的逻辑
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        let result = [...notes];

        if (
          folderNoteIds &&
          Array.isArray(folderNoteIds) &&
          folderNoteIds.length > 0
        ) {
          result = result.filter(
            (note) => note.id && folderNoteIds.includes(String(note.id))
          );
        }

        if (searchQuery) {
          const lowerQuery = String(searchQuery).toLowerCase();
          console.log("searchQuery:", searchQuery, "notes:", notes);
          result = result.filter((note) => {
            return (
              (note.title && note.title.toLowerCase().includes(lowerQuery)) ||
              (note.content && note.content.toLowerCase().includes(lowerQuery))
            );
          });
        }

        if (selectedTags.length > 0) {
          const taggedNoteIds = getTaggedNoteIds();
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
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [notes, folderNoteIds, searchQuery, selectedTags]);

  const handleCreateNote = () => {
    setShowNameDialog(true);
  };

  const handleConfirmCreateNote = async (noteName: string) => {
    try {
      const note = await createNote({ title: noteName, content: "" });
      router.push(`/dashboard/notes/${note.id}`);
    } catch (error) {
      console.error("创建笔记失败:", error);
      toast.error("创建笔记失败");
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleCreateTag = async (tagName: string) => {
    try {
      const tag = await apiCreateTag({ name: tagName });
      setTags((prev) => [...prev, tag]);
    } catch (error) {
      console.error("创建标签失败:", error);
      toast.error("创建标签失败");
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    try {
      await apiDeleteTag(tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      setSelectedTags((prev) => prev.filter((t) => t !== tagId));
    } catch (error) {
      console.error("删除标签失败:", error);
    }
  };

  const toggleTagFilter = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleStartEdit = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    if (note.id) setEditingId(String(note.id));
    setEditingTitle(note.title || "");
  };

  const handleSaveTitle = async (noteId: number) => {
    const trimmedTitle = editingTitle.trim() || "未命名笔记";

    try {
      await updateNote(noteId, { title: trimmedTitle });
    } catch (error) {
      console.error("更新标题失败:", error);
    }

    setEditingId(null);
    setEditingTitle("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, noteId: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle(noteId);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleLogout = async () => {
    if (logoutLoading) return;

    setLogoutLoading(true);
    try {
      await signOut();
      router.push("/login");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("退出登录失败:", error);
    } finally {
      setLogoutLoading(false);
      if (isMobile) {
        setOpenMobile(false);
      }
    }
  };

  const handleLogin = () => {
    router.push("/login");
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      await deleteNote(noteId);
    } catch (error) {
      console.error("删除笔记失败:", error);
    }
  };

  // 获取用户显示名称
  const getUserDisplayName = () => {
    if (!user) return "";
    const username =
      (user as any).username || (user as any).user_metadata?.username;
    const email = (user as any).email;
    if (username) return username;
    if (email) return email.split("@")[0];
    return "用户";
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
        {authLoading ? (
          <div className="w-full flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        ) : user ? (
          <div className="space-y-3">
            <div className="text-sm text-center text-gray-600">
              当前用户:{" "}
              <span className="font-medium">{getUserDisplayName()}</span>
            </div>
            <Button
              onClick={handleLogout}
              className="w-full"
              variant="outline"
              disabled={logoutLoading}
            >
              {logoutLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                  退出中...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  退出登录
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button onClick={handleLogin} className="w-full">
            <LogIn className="h-4 w-4 mr-2" />
            登录/注册
          </Button>
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
