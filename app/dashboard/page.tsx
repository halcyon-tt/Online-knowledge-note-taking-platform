"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { FileStack, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth-utils";
import {
  createLocalFolder,
  createLocalNote,
  getLocalFolders,
  getLocalNotes,
  updateLocalFolder,
} from "@/lib/local-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Folder, Note } from "@/types/note";
import { useCurrentFolderIdStore } from "@/lib/store/folders";
import { useStorageMode } from "@/hooks/useStorageMode"; // 新增导入
import { offlineManager } from "@/lib/offline-manager"; // 新增导入
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useNotes } from "@/contexts/NotesContext"; // 新增导入
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const NOTES_PER_PAGE = 6;

export default function DashboardPage() {
  const router = useRouter();

  // 使用 NotesContext 获取笔记状态
  const { notes: allContextNotes, loading: notesLoading, addNote } = useNotes();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderNoteIds, setFolderNoteIds] = useState<string[] | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [draggingOverFolderId, setDraggingOverFolderId] = useState<string | null>(null);
  // 判断是否在本地存储模式下 是否在线
  const { useLocalStorage, isOnline, storageMode } = useStorageMode();

  const { setCurrentFolderId } = useCurrentFolderIdStore();

  // 本地状态用于分页
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [displayNotes, setDisplayNotes] = useState<Note[]>([]);

  // 从所有笔记中过滤出不在文件夹中的笔记
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);

  // 加载文件夹数据
  useEffect(() => {
    let isMounted = true;

    async function loadFolders() {
      if (useLocalStorage) {
        const localFolders = getLocalFolders();
        if (isMounted) {
          setFolders(localFolders.slice(0, 6));
        }
      } else {
        const supabase = createClient();
        if (supabase) {
          const userId = await getUserId();
          if (userId) {
            const foldersResult = await supabase
              .from("folders")
              .select("*")
              .eq("user_id", userId)
              .order("updated_at", { ascending: false })
              .limit(6);

            const allFolders = (foldersResult.data as Folder[]) || [];
            if (isMounted) {
              setFolders(allFolders);
            }
          }
        }
      }
    }

    loadFolders();

    return () => {
      isMounted = false;
    };
  }, [useLocalStorage]);

  // 获取文件夹中的笔记ID
  useEffect(() => {
    async function fetchFolderNoteIds() {
      const supabase = createClient();
      if (useLocalStorage) {
        // 本地存储模式下，从本地获取文件夹数据
        const localFolders = getLocalFolders();
        const allNoteIdsInFolders = new Set<string>();
        localFolders.forEach((folder) => {
          if (folder.notes_id) {
            const ids = folder.notes_id
              .split(",")
              .filter((id: string) => id && id.trim() !== "");
            ids.forEach((id) => allNoteIdsInFolders.add(id));
          }
        });
        setFolderNoteIds(Array.from(allNoteIdsInFolders));
      } else {
        if (!supabase) {
          console.error("No Supabase client");
          setFolderNoteIds(null);
          return;
        }

        const userId = await getUserId();
        if (!userId) {
          setFolderNoteIds(null);
          return;
        }

        try {
          // 获取所有文件夹的笔记ID
          const { data, error } = await supabase
            .from("folders")
            .select("notes_id")
            .eq("user_id", userId);

          if (error) {
            console.error("Error fetching folder note IDs:", error);
            setFolderNoteIds(null);
            return;
          }

          const allNoteIdsInFolders = new Set<string>();
          (data || []).forEach((folder: any) => {
            if (folder.notes_id) {
              const ids = folder.notes_id
                .split(",")
                .filter((id: string) => id && id.trim() !== "");
              ids.forEach((id: string) => allNoteIdsInFolders.add(id));
            }
          });

          setFolderNoteIds(Array.from(allNoteIdsInFolders));
        } catch (error) {
          console.error("Unexpected error:", error);
          setFolderNoteIds(null);
        }
      }
    }

    fetchFolderNoteIds();
  }, [useLocalStorage, folders]); // 添加 folders 作为依赖，当文件夹更新时重新获取

  // 过滤笔记：只显示不在文件夹中的笔记
  useEffect(() => {
    if (allContextNotes.length === 0) {
      setFilteredNotes([]);
      return;
    }

    if (!folderNoteIds || folderNoteIds.length === 0) {
      // 如果没有文件夹或文件夹中没有笔记，显示所有笔记
      setFilteredNotes([...allContextNotes]);
    } else {
      // 过滤掉在文件夹中的笔记
      const notesNotInFolders = allContextNotes.filter(
        (note) => note.id && !folderNoteIds.includes(note.id)
      );
      setFilteredNotes(notesNotInFolders);
    }
  }, [allContextNotes, folderNoteIds]);

  // 分页处理
  useEffect(() => {
    if (filteredNotes.length === 0) {
      setDisplayNotes([]);
      setTotalPages(1);
      return;
    }

    const startIndex = (currentPage - 1) * NOTES_PER_PAGE;
    const endIndex = startIndex + NOTES_PER_PAGE;
    setDisplayNotes(filteredNotes.slice(startIndex, endIndex));
    setTotalPages(Math.ceil(filteredNotes.length / NOTES_PER_PAGE) || 1);
  }, [filteredNotes, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // 滚动到笔记区域顶部
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 始终显示第一页
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      // 显示当前页附近的页码
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      // 始终显示最后一页
      pages.push(totalPages);
    }

    return pages;
  };

  useEffect(() => {
    setCurrentFolderId("");
  }, []);

  // 创建笔记
  const handleCreateNote = async () => {
    if (useLocalStorage) {
      const newNote = createLocalNote({ title: "未命名笔记", content: "" });
      addNote(newNote); // 使用 Context 的 addNote
      router.push(`/dashboard/notes/${newNote.id}`);
    } else {
      const supabase = createClient();
      if (!supabase) return;

      // 获取当前用户
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("请先登录");
        router.push("/login");
        return;
      }

      // 直接创建笔记，不检查用户记录
      const { data, error } = await supabase
        .from("notes")
        .insert({
          title: "未命名笔记",
          content: "",
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("创建笔记失败:", error);
        alert("创建笔记失败: " + error.message);
        return;
      }

      if (data) {
        addNote(data as Note); // 使用 Context 的 addNote
        router.push(`/dashboard/notes/${data.id}`);
      }
    }
  };

  // 创建文件夹
  const handleCreateFolder = async () => {
    const name = window.prompt("请输入文件夹名:");
    if (!name || name.trim() === "") {
      window.alert("文件夹名不能为空");
      return;
    }

    if (useLocalStorage) {
      const newFolder = createLocalFolder({ name });
      setFolders((prev) => [newFolder as Folder, ...prev]);
    } else {
      const supabase = createClient();
      if (!supabase) return;

      // 获取当前用户
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("请先登录");
        router.push("/login");
        return;
      }

      // 直接创建文件夹，不检查用户记录
      const { data, error } = await supabase
        .from("folders")
        .insert({
          name: name.trim(),
          user_id: user.id,
          notes_id: "", // 初始为空
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("创建文件夹失败:", error);
        alert("创建文件夹失败: " + error.message);
        return;
      }

      if (data) {
        setFolders((prev) => [data as Folder, ...prev]);
      }
    }
  };

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData("noteId", noteId);
    setDraggingNoteId(noteId);
  };

  // 处理拖拽进入文件夹
  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    // 只有在正在拖拽笔记时才阻止默认行为
    if (draggingNoteId) {
      e.preventDefault();
      setDraggingOverFolderId(folderId);
    }
  };

  // 处理拖拽离开文件夹
  const handleDragLeave = (e: React.DragEvent) => {
    if (draggingNoteId) {
      e.preventDefault();
      setDraggingOverFolderId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, folderId: string) => {
    if (!draggingNoteId) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const noteId = e.dataTransfer.getData("noteId");

    if (!noteId) return;

    const targetFolder = folders.find((f) => f.id === folderId);
    if (!targetFolder) return;

    const draggedNote = allContextNotes.find((n) => n.id === noteId);
    if (!draggedNote) return;

    if (useLocalStorage) {
      const currentNoteIds = targetFolder.notes_id
        ? targetFolder.notes_id.split(",").filter((id) => id.trim() !== "")
        : [];

      if (!currentNoteIds.includes(noteId)) {
        const newNoteIds = [...currentNoteIds, noteId].join(",");
        const updatedFolder = { ...targetFolder, notes_id: newNoteIds };

        updateLocalFolder(updatedFolder);

        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? updatedFolder : f))
        );

        // 笔记列表会自动通过 Context 更新
        alert(`笔记已添加到文件夹 ${targetFolder.name}`);
      } else {
        alert("该笔记已在此文件夹中");
      }
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const userId = await getUserId();
      if (!userId) {
        alert("请先登录");
        return;
      }

      const currentNoteIds = targetFolder.notes_id
        ? targetFolder.notes_id.split(",").filter((id) => id.trim() !== "")
        : [];

      if (!currentNoteIds.includes(noteId)) {
        const newNoteIds = [...currentNoteIds, noteId].join(",");

        const { data, error } = await supabase
          .from("folders")
          .update({
            notes_id: newNoteIds,
            updated_at: new Date().toISOString(),
          })
          .eq("id", folderId)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) {
          console.error("更新文件夹失败:", error);
          alert("添加笔记到文件夹失败");
          return;
        }

        if (data) {
          setFolders((prev) =>
            prev.map((f) => (f.id === folderId ? (data as Folder) : f))
          );

          alert(`笔记已添加到文件夹 ${targetFolder.name}`);
        }
      } else {
        alert("该笔记已在此文件夹中");
      }
    }

    setDraggingOverFolderId(null);
    setDraggingNoteId(null);
  };

  // 重置拖拽状态
  const handleDragEnd = () => {
    setDraggingNoteId(null);
    setDraggingOverFolderId(null);
  };

  if (notesLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          欢迎回来
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          开始编写你的 Markdown 笔记
          {useLocalStorage && (
            <span className="text-yellow-500 ml-2">(本地存储模式)</span>
          )}
          {!isOnline && isSupabaseConfigured() && (
            <span className="text-red-500 ml-2">(网络离线)</span>
          )}
        </p>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-dashed h-full">
          <div className="flex flex-row sm:flex-col items-center justify-evenly h-full gap-3 p-4 sm:p-6">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleCreateNote}
              className="flex-1 sm:flex-none sm:w-2/3 bg-transparent"
            >
              <Plus className="h-5 w-5 mr-2" />
              新建笔记
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleCreateFolder}
              className="flex-1 sm:flex-none sm:w-2/3 bg-transparent"
            >
              <Plus className="h-5 w-5 mr-2" />
              新建文件夹
            </Button>
          </div>
        </Card>

        {/* 文件夹卡片 */}
        {folders.map((folder) => (
          <Card
            key={folder.id}
            className={`
              hover:bg-accent transition-colors cursor-pointer h-full
              ${draggingOverFolderId === folder.id ? "ring-2 ring-primary bg-primary/10" : ""}
            `}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
            onDragEnd={handleDragEnd}
          >
            <Link href={`/dashboard/folder/${folder.id}`} className="block">
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileStack className="h-4 w-4" />
                  <span className="truncate">{folder.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mt-2 md:mt-3">
                  {folder.notes_id
                    ? `${folder.notes_id.split(",").filter((id) => id.trim() !== "").length} 个笔记`
                    : "暂无笔记"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(folder.updated_at).toLocaleDateString("zh-CN")}
                </p>
                {draggingOverFolderId === folder.id && (
                  <div className="mt-4 p-2 text-center text-sm text-primary bg-primary/10 rounded">
                    拖拽到此处添加
                  </div>
                )}
              </CardContent>
            </Link>
          </Card>
        ))}

        {/* 笔记卡片 */}
        {displayNotes.map((note) => (
          <Link
            key={note.id}
            href={`/dashboard/notes/${note.id}`}
            draggable
            onDragStart={(e) => {
              if (note.id) handleDragStart(e, note.id);
            }}
            onDragEnd={handleDragEnd}
            className={`
              cursor-move transition-opacity block
              ${draggingNoteId === note.id ? "opacity-50" : ""}
            `}
          >
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  <span className="truncate">{note.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {note.content
                    ? note.content.replace(/<[^>]*>/g, "").slice(0, 100)
                    : "暂无内容"}
                </p>
                <div className="flex items-center justify-between mt-2 md:mt-3">
                  <p className="text-xs text-muted-foreground">
                    {note.updated_at
                      ? new Date(note.updated_at).toLocaleDateString("zh-CN")
                      : "无日期"}
                  </p>
                  <div className="hidden sm:block text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                    可拖拽
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {totalPages > 1 && filteredNotes.length > 0 && (
        <div className="mt-8">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  size="default"
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {getPageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {page === "ellipsis" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      size="default"
                      onClick={() => handlePageChange(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  size="default"
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          {/* 分页信息 */}
          <p className="text-center text-sm text-muted-foreground mt-3">
            共 {filteredNotes.length} 篇笔记，第 {currentPage} / {totalPages} 页
          </p>
        </div>
      )}

      {/* 拖拽提示 - 移动端隐藏 */}
      {draggingNoteId && (
        <div className="hidden sm:block fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          拖拽笔记到文件夹上进行添加
        </div>
      )}
    </div>
  );
}