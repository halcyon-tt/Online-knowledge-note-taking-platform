"use client";

import type React from "react";

import { useEffect, useState, useMemo, useCallback, use } from "react";
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
import { AISearchDialog } from "@/components/ai-search-dialog";
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

  // 侧边栏打开状态
  const { state, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const { currentFolderId, setCurrentFolderId } = useCurrentFolderIdStore();

  // 检查登录状态
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
        console.log("Fetching note IDs for folder:", currentFolderId);
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
          // 确保 notes_id 存在且是有效字符串
          const ids = data.notes_id
            .split(",")
            .filter((id: string) => id && id.trim() !== "")
            .map((id: string) => id.trim());
          setFolderNoteIds(ids);
        } else {
          setFolderNoteIds(null); // 设置为空数组，而不是 null
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        alert("查询文件夹时发生未知错误");
        setFolderNoteIds(null);
      }
    }
    fetchFolderNoteIds();
  }, [currentFolderId, useLocalStorage]);



  // 加载笔记的函数
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
        console.log("Loaded notes:", data.length);
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

  // 获取用户笔记 - 初始加载和 useLocalStorage 变化时
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // 监听 pathname 变化，当路由变化时重新加载笔记
  useEffect(() => {
    if (pathname) {
      loadNotes();
    }
  }, [pathname, loadNotes]);

  // 过滤笔记
  const filteredNotes = useMemo(() => {
    let result = [...notes];
    // 修正文件夹过滤条件：检查是否存在且非空
    if (folderNoteIds && Array.isArray(folderNoteIds) && folderNoteIds.length > 0) {
      result = result.filter(note => folderNoteIds.includes(note.id));
    }
    // 第二步：应用搜索和标签过滤
    if (!searchQuery && selectedTags.length === 0) {
      return result;
    }

    if (useLocalStorage) {
      return searchLocalNotes(searchQuery, selectedTags);
    }

    const lowerQuery = searchQuery.toLowerCase();
    return result.filter(note => {
      const matchesQuery =
        !searchQuery ||
        note.title.toLowerCase().includes(lowerQuery) ||
        note.content.toLowerCase().includes(lowerQuery);

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some(tag => note.tags?.includes(tag));

      return matchesQuery && matchesTags;
    });
  }, [notes, folderNoteIds, searchQuery, selectedTags, useLocalStorage]);

  //   if (currentFolderId.trim() !== "") {
  //     const supabase = createClient();
  //     if (!supabase) {
  //       console.error("No Supabase client");
  //       return;
  //     }

  //     const userId = await getUserId();
  //     if (!userId) {
  //       alert("请先登录");
  //       router.push("/login");
  //       return;
  //     }

  //     try {
  //       const { data, error } = await supabase
  //         .from("folders")
  //         .select()
  //         .eq("id", currentFolderId)
  //         .single();

  //       const notes_id = data.notes_id.split(",") as string[];
  //       console.log("notes_id:", notes.filter((note) => notes_id.includes(note.id)));

  //       if (error) {
  //         console.error("Error creating note:", error);
  //         return;
  //       }

  //       return notes.filter((note) => notes_id.includes(note.id));


  //     } catch (error) {
  //       console.error("Unexpected error:", error);
  //       alert("查询文件夹时发生未知错误");
  //     }

  //   }

  //   if (!searchQuery && selectedTags.length === 0) {
  //     return notes;
  //   }

  //   if (useLocalStorage) {
  //     return searchLocalNotes(searchQuery, selectedTags);
  //   }

  //   const lowerQuery = searchQuery.toLowerCase();
  //   return notes.filter((note) => {
  //     const matchesQuery =
  //       !searchQuery ||
  //       note.title.toLowerCase().includes(lowerQuery) ||
  //       note.content.toLowerCase().includes(lowerQuery);

  //     const matchesTags =
  //       selectedTags.length === 0 ||
  //       selectedTags.some((tag) => note.tags?.includes(tag));

  //     return matchesQuery && matchesTags;
  //   });
  // }, [notes, searchQuery, selectedTags, useLocalStorage]);

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
            title: "未命名笔记",
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
          router.refresh();
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

  // 创建新标签
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

  // 删除标签
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

  // 切换标签过滤
  const toggleTagFilter = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  // 开始编辑标题
  const handleStartEdit = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(note.id);
    setEditingTitle(note.title || "");
  };

  // 保存标题
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

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent, noteId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle(noteId);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  // 处理登录/登出
  const handleLogin = async () => {
    if (loginStatus.startsWith("已登录")) {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
        await supabase.auth.signOutWithOAuth()
        setLoginStatus("登录/注册");
      }
    } else {
      router.push("/login");
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // 导航时关闭移动端侧边栏
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // 删除笔记
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
    router.refresh();
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
    </Sidebar>
  );
}
