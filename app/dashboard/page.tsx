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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const NOTES_PER_PAGE = 6;

export default function DashboardPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]); // 存储所有笔记
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [draggingOverFolderId, setDraggingOverFolderId] = useState<
    string | null
  >(null);
  const useLocalStorage = !isSupabaseConfigured();
  const { setCurrentFolderId } = useCurrentFolderIdStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 加载数据
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      if (useLocalStorage) {
        const localNotes = getLocalNotes();
        const localFolders = getLocalFolders();

        // 获取所有文件夹中的笔记ID
        const noteIdsInFolders = new Set<string>();
        localFolders.forEach((folder) => {
          if (folder.notes_id) {
            const ids = folder.notes_id
              .split(",")
              .filter((id) => id.trim() !== "");
            ids.forEach((id) => noteIdsInFolders.add(id));
          }
        });

        console.log("Note IDs in folders (local):", noteIdsInFolders);

        // 过滤掉已经在文件夹中的笔记
        const filteredNotes = localNotes.filter(
          (note) => note.id && !noteIdsInFolders.has(note.id)
        );

        setAllNotes(filteredNotes);
        setTotalPages(Math.ceil(filteredNotes.length / NOTES_PER_PAGE) || 1);
        setNotes(filteredNotes.slice(0, NOTES_PER_PAGE));
        setFolders(localFolders.slice(0, 6));
      } else {
        const supabase = createClient();
        if (supabase) {
          const userId = await getUserId();
          if (userId) {
            // 同时获取笔记和文件夹
            const [notesResult, foldersResult] = await Promise.all([
              supabase
                .from("notes")
                .select("*")
                .eq("user_id", userId)
                .order("updated_at", { ascending: false }),
              supabase
                .from("folders")
                .select("*")
                .eq("user_id", userId)
                .order("updated_at", { ascending: false })
                .limit(6),
            ]);

            const fetchedNotes = (notesResult.data as Note[]) || [];
            const allFolders = (foldersResult.data as Folder[]) || [];

            // 获取所有文件夹中的笔记ID
            const noteIdsInFolders = new Set<string>();
            allFolders.forEach((folder) => {
              if (folder.notes_id) {
                const ids = folder.notes_id
                  .split(",")
                  .filter((id) => id.trim() !== "");
                ids.forEach((id) => noteIdsInFolders.add(id));
              }
            });

            // 过滤掉已经在文件夹中的笔记
            const filteredNotes = fetchedNotes.filter(
              (note) => note.id && !noteIdsInFolders.has(note.id)
            );

            setAllNotes(filteredNotes);
            setTotalPages(
              Math.ceil(filteredNotes.length / NOTES_PER_PAGE) || 1
            );
            setNotes(filteredNotes.slice(0, NOTES_PER_PAGE));
            setFolders(allFolders);
          }
        }
      }
      setLoading(false);
    }

    loadData();
  }, [useLocalStorage]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * NOTES_PER_PAGE;
    const endIndex = startIndex + NOTES_PER_PAGE;
    setNotes(allNotes.slice(startIndex, endIndex));
  }, [currentPage, allNotes]);

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
      router.push(`/dashboard/notes/${newNote.id}`);
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const userId = await getUserId();
      if (!userId) {
        alert("请先登录");
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("notes")
        .insert({ title: "未命名笔记", content: "", user_id: userId })
        .select()
        .single();
      if (data) {
        router.push(`/dashboard/notes/${data.id}`);
      }
    }
  };

  // 创建文件夹
  const handleCreateFolder = async () => {
    const name = window.prompt("请输入文件夹名:");
    if (!name) {
      window.alert("文件夹名不能为空");
      return;
    }
    if (useLocalStorage) {
      const newFolder = createLocalFolder({ name });
      setFolders((prev) => [newFolder as Folder, ...prev]);
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const userId = await getUserId();
      if (!userId) {
        alert("请先登录");
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("folders")
        .insert({ name, user_id: userId })
        .select()
        .single();
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

  // 处理拖拽放置
  const handleDrop = async (e: React.DragEvent, folderId: string) => {
    // 只有在正在拖拽笔记时才处理
    if (!draggingNoteId) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const noteId = e.dataTransfer.getData("noteId");

    if (!noteId) return;

    // 找到目标文件夹
    const targetFolder = folders.find((f) => f.id === folderId);
    if (!targetFolder) return;

    // 找到被拖拽的笔记
    const draggedNote = notes.find((n) => n.id === noteId);
    if (!draggedNote) return;

    if (useLocalStorage) {
      // 本地存储模式
      const currentNoteIds = targetFolder.notes_id
        ? targetFolder.notes_id.split(",").filter((id) => id.trim() !== "")
        : [];

      // 检查是否已经存在
      if (!currentNoteIds.includes(noteId)) {
        const newNoteIds = [...currentNoteIds, noteId].join(",");
        const updatedFolder = { ...targetFolder, notes_id: newNoteIds };

        // 更新本地存储
        updateLocalFolder(updatedFolder);

        // 更新状态
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? updatedFolder : f))
        );

        const updatedAllNotes = allNotes.filter((n) => n.id !== noteId);
        setAllNotes(updatedAllNotes);
        setTotalPages(Math.ceil(updatedAllNotes.length / NOTES_PER_PAGE) || 1);
        // 如果当前页没有笔记了，回到上一页
        if (
          currentPage > 1 &&
          (currentPage - 1) * NOTES_PER_PAGE >= updatedAllNotes.length
        ) {
          setCurrentPage(currentPage - 1);
        }
      }
    } else {
      // Supabase 模式
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

      // 检查是否已经存在
      if (!currentNoteIds.includes(noteId)) {
        const newNoteIds = [...currentNoteIds, noteId].join(",");

        // 更新数据库
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
          // 更新文件夹状态
          setFolders((prev) =>
            prev.map((f) => (f.id === folderId ? (data as Folder) : f))
          );

          const updatedAllNotes = allNotes.filter((n) => n.id !== noteId);
          setAllNotes(updatedAllNotes);
          setTotalPages(
            Math.ceil(updatedAllNotes.length / NOTES_PER_PAGE) || 1
          );
          if (
            currentPage > 1 &&
            (currentPage - 1) * NOTES_PER_PAGE >= updatedAllNotes.length
          ) {
            setCurrentPage(currentPage - 1);
          }

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

  if (loading) {
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
        {notes.map((note) => (
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

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
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
            共 {allNotes.length} 篇笔记，第 {currentPage} / {totalPages} 页
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
