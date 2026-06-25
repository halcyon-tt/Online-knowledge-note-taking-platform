"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { FileStack, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchFolders,
  createFolder as apiCreateFolder,
  updateFolderNotes,
} from "@/lib/api/folders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNotes } from "@/contexts/NotesContext";
import { toast } from "sonner";

const NOTES_PER_PAGE = 6;

export default function DashboardPage() {
  const router = useRouter();

  // 使用 NotesContext 获取笔记状态
  const {
    notes: allContextNotes,
    loading: notesLoading,
    createNote,
  } = useNotes();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderNoteIds, setFolderNoteIds] = useState<string[] | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [draggingOverFolderId, setDraggingOverFolderId] = useState<
    string | null
  >(null);
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
      try {
        const data = await fetchFolders();
        if (isMounted) {
          setFolders(data.slice(0, 6));
        }
      } catch (error) {
        console.error("加载文件夹失败:", error);
      }
    }

    loadFolders();

    return () => {
      isMounted = false;
    };
  }, []);

  // 从 folders 中提取笔记ID，不需要单独请求
  useEffect(() => {
    const allNoteIdsInFolders = new Set<string>();
    folders.forEach((folder) => {
      if (folder.notes_id) {
        const ids = folder.notes_id
          .split(",")
          .filter((id: string) => id && id.trim() !== "");
        ids.forEach((id) => allNoteIdsInFolders.add(id));
      }
    });
    setFolderNoteIds(Array.from(allNoteIdsInFolders));
  }, [folders]);

  // 过滤笔记：只显示不在文件夹中的笔记
  useEffect(() => {
    if (allContextNotes.length === 0) {
      setFilteredNotes([]);
      return;
    }

    if (!folderNoteIds || folderNoteIds.length === 0) {
      setFilteredNotes([...allContextNotes]);
    } else {
      const notesNotInFolders = allContextNotes.filter(
        (note) => note.id && !folderNoteIds.includes(String(note.id))
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
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  useEffect(() => {
    setCurrentFolderId("");
  }, []);

  // 创建笔记
  const handleCreateNote = async () => {
    try {
      const note = await createNote({ title: "未命名笔记", content: "" });
      router.push(`/dashboard/notes/${note.id}`);
    } catch (error) {
      console.error("创建笔记失败:", error);
      toast.error("创建笔记失败");
    }
  };

  // 创建文件夹
  const handleCreateFolder = async () => {
    setFolderName("");
    setCreateFolderOpen(true);
  };
  const handleConfirmCreateFolder = async () => {
    const name = folderName.trim();
    if (!name) {
      toast.warning("文件夹名不能为空");
      return;
    }

    try {
      const folder = await apiCreateFolder({ name });
      setFolders((prev) => [folder, ...prev]);
      setCreateFolderOpen(false); // 关闭弹窗
      toast.success("文件夹创建成功");
    } catch (error) {
      console.error("创建文件夹失败:", error);
      toast.error("创建文件夹失败");
    }
  };

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData("noteId", noteId);
    setDraggingNoteId(noteId);
  };

  // 处理拖拽进入文件夹
  const handleDragOver = (e: React.DragEvent, folderId: string | number) => {
    if (draggingNoteId) {
      e.preventDefault();
      setDraggingOverFolderId(String(folderId));
    }
  };

  // 处理拖拽离开文件夹
  const handleDragLeave = (e: React.DragEvent) => {
    if (draggingNoteId) {
      e.preventDefault();
      setDraggingOverFolderId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, folderId: string | number) => {
    if (!draggingNoteId) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const noteId = e.dataTransfer.getData("noteId");
    if (!noteId) return;

    const targetFolder = folders.find((f) => f.id === folderId);
    if (!targetFolder) return;

    const draggedNote = allContextNotes.find((n) => String(n.id) === noteId);
    if (!draggedNote) return;

    const currentNoteIds = targetFolder.notes_id
      ? targetFolder.notes_id.split(",").filter((id) => id.trim() !== "")
      : [];

    if (currentNoteIds.includes(noteId)) {
      toast.info("该笔记已在此文件夹中");
    } else {
      const newNoteIds = [...currentNoteIds, noteId].join(",");

      try {
        const updated = await updateFolderNotes(Number(folderId), newNoteIds);
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? updated : f))
        );
        toast.success(`笔记已添加到文件夹 ${targetFolder.name}`);
      } catch (error) {
        console.error("更新文件夹失败:", error);
        toast.error("添加笔记到文件夹失败");
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
              if (note.id) handleDragStart(e, String(note.id));
            }}
            onDragEnd={handleDragEnd}
            className={`
              cursor-move transition-opacity block
              ${String(draggingNoteId) === String(note.id) ? "opacity-50" : ""}
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
      {/* 新建文件夹弹窗 */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>创建新文件夹</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Input
              placeholder="请输入文件夹名称"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmCreateFolder();
              }}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateFolderOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleConfirmCreateFolder}>确认创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
