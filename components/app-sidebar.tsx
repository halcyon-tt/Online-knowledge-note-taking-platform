"use client";

import type React from "react";

import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Home,
  Loader2,
  Pencil,
  Check,
  X,
  Search,
  Tag,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Note, Tag as TagType } from "@/types/note";
import { log } from "console";

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
  const [newTagName, setNewTagName] = useState("");
  const [showTagsSection, setShowTagsSection] = useState(true);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [loginStatus, setLoginStatus] = useState("登录/注册");

  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await createClient().auth.getUser();

      if (user) {
        setLoginStatus(`已登录: ${user.user_metadata.username}`);
      } else {
        setLoginStatus("登录/注册");
      }
    })();
  }, []);


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

  const handleCreateTag = async () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;

    if (tags.some((t) => t.name === trimmedName)) {
      alert("标签已存在");
      return;
    }

    if (useLocalStorage) {
      createLocalTag(trimmedName);
      setTags(getLocalTags());
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("tags")
        .insert({ name: trimmedName, user_id: DEFAULT_USER_ID })
        .select()
        .single();

      if (data) {
        setTags((prev) => [...prev, data as TagType]);
      }
    }
    setIsPopoverOpen(false);
    setNewTagName("");
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

  const handleLogin = async () => {
    if (loginStatus.startsWith("已登录")) {
      await createClient().auth.signOut()
      setLoginStatus("登录/注册");
    } else router.push("/login");
  }

  return (
    <Sidebar
      collapsible="icon"
      className="w-64 min-w-64 max-w-64 overflow-hidden"
    >
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
          <Button onClick={handleCreateNote} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            新建笔记
          </Button>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent className="px-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索笔记..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel
            className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded px-2 -mx-2"
            onClick={() => setShowTagsSection(!showTagsSection)}
          >
            <div className="flex items-center gap-1">
              {showTagsSection ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Tag className="h-3.5 w-3.5" />
              <span>标签</span>
            </div>
            <span className="text-xs text-muted-foreground">{tags.length}</span>
          </SidebarGroupLabel>
          {showTagsSection && (
            <SidebarGroupContent className="overflow-hidden">
              <div className="px-2 space-y-2 overflow-hidden min-w-0 max-w-full">
                {/* 新建标签 */}
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      新建标签
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="flex gap-1">
                      <Input
                        placeholder="标签名称"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleCreateTag()
                        }
                        className="h-7 text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-7 px-2"
                        onClick={handleCreateTag}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 标签列表 */}
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto overflow-x-hidden min-w-0 max-w-full">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={
                        selectedTags.includes(tag.name) ? "default" : "outline"
                      }
                      className="cursor-pointer text-xs h-6 group max-w-[100px] min-w-0 flex-shrink-0 overflow-hidden"
                    >
                      <span
                        className={`w-2 h-2 rounded-full mr-1 flex-shrink-0 ${tag.color}`}
                      />
                      <span
                        className="truncate min-w-0 flex-1"
                        onClick={() => toggleTagFilter(tag.name)}
                      >
                        {tag.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTag(tag.id);
                        }}
                        className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {tags.length === 0 && (
                    <p className="text-xs text-muted-foreground">暂无标签</p>
                  )}
                </div>

                {/* 已选标签提示 */}
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center h-6 text-xs text-muted-foreground"
                    onClick={() => setSelectedTags([])}
                  >
                    清除筛选 ({selectedTags.length})
                  </Button>
                )}
              </div>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

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
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <span className="truncate block max-w-full">
                                {note.title || "未命名笔记"}
                              </span>
                              {/* 显示笔记标签 */}
                              {note.tags && note.tags.length > 0 && (
                                <div className="flex gap-0.5 mt-0.5">
                                  {note.tags.slice(0, 2).map((tagName) => {
                                    const tagData = tags.find(
                                      (t) => t.name === tagName
                                    );
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
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">

        <Button onClick={handleLogin} className="w-full">
          {loginStatus}
          {/* 登录/注册 */}
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
