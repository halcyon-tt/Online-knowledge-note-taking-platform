"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  fetchFolder,
  updateFolder,
  deleteFolder as apiDeleteFolder,
  updateFolderNotes,
} from "@/lib/api/folders";
import { fetchNote, deleteNote as apiDeleteNote } from "@/lib/api/notes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  FileText,
  Trash2,
  Edit2,
  MoreVertical,
  LogOut,
  Trash,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Folder, Note } from "@/types/note";
import { useCurrentFolderIdStore } from "@/lib/store/folders";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FolderPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { setCurrentFolderId } = useCurrentFolderIdStore();

  useEffect(() => {
    async function loadFolder() {
      try {
        const folderData = await fetchFolder(Number(id));
        setFolder(folderData);

        // 获取文件夹内的笔记
        if (folderData.notes_id) {
          const noteIds = folderData.notes_id
            .split(",")
            .filter((nid) => nid.trim() !== "");
          if (noteIds.length > 0) {
            const results = await Promise.allSettled(
              noteIds.map((nid) => fetchNote(Number(nid)))
            );
            const loadedNotes = results
              .filter(
                (r): r is PromiseFulfilledResult<Note> =>
                  r.status === "fulfilled"
              )
              .map((r) => r.value);
            setNotes(loadedNotes);
          }
        }
      } catch (error) {
        console.error("加载文件夹失败:", error);
        router.push("/dashboard");
        return;
      }
      setLoading(false);
    }

    loadFolder();
  }, [id, router]);

  useEffect(() => {
    setCurrentFolderId(id);
  }, []);

  // 重命名文件夹
  const handleRename = async () => {
    if (!folder) return;
    const newName = window.prompt("请输入新的文件夹名:", folder.name);
    if (!newName || newName === folder.name) return;

    try {
      const updated = await updateFolder(Number(id), { name: newName });
      setFolder(updated);
    } catch (error) {
      console.error("重命名失败:", error);
      toast.error("重命名失败");
    }
  };

  // 删除文件夹
  const handleDelete = async () => {
    if (!folder) return;
    const confirmed = window.confirm(
      `确定要删除文件夹 "${folder.name}" 吗？文件夹内的笔记不会被删除。`
    );
    if (!confirmed) return;

    try {
      await apiDeleteFolder(Number(id));
      router.push("/dashboard");
    } catch (error) {
      console.error("删除文件夹失败:", error);
      toast.error("删除文件夹失败");
    }
  };

  // 从文件夹移出笔记
  const handleRemoveNote = async (noteId: string) => {
    if (!folder) return;
    const confirmed = window.confirm("确定要从文件夹中移除这个笔记吗？");
    if (!confirmed) return;

    const currentNoteIds = folder.notes_id
      ? folder.notes_id.split(",").filter((nid) => nid.trim() !== "")
      : [];
    const newNoteIds = currentNoteIds.filter((nid) => nid !== noteId).join(",");

    try {
      const updated = await updateFolderNotes(Number(id), newNoteIds);
      setFolder(updated);
      setNotes((prev) => prev.filter((n) => String(n.id) !== noteId));
    } catch (error) {
      console.error("移出笔记失败:", error);
      toast.error("移出笔记失败");
    }
  };

  // 删除笔记
  const handleDeleteNote = async (noteId: string) => {
    if (!folder) return;

    const currentNoteIds = folder.notes_id
      .split(",")
      .filter((nid) => nid.trim() !== "" && nid !== noteId);
    const newNotesId = currentNoteIds.join(",");

    try {
      await apiDeleteNote(Number(noteId));
      await updateFolderNotes(Number(id), newNotesId);
      setFolder({ ...folder, notes_id: newNotesId });
      setNotes((prev) => prev.filter((n) => String(n.id) !== noteId));
    } catch (error) {
      console.error("删除笔记失败:", error);
      toast.error("删除笔记失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载文件夹内容中...</p>
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">文件夹不存在或已被删除</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {folder.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {notes.length} 个笔记 · 更新于{" "}
              {new Date(folder.updated_at).toLocaleDateString("zh-CN")}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleRename}>
              <Edit2 className="h-4 w-4 mr-2" />
              重命名
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除文件夹
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 笔记列表 */}
      {notes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">文件夹为空</p>
          <p className="text-sm text-muted-foreground">
            从仪表盘拖拽笔记到此文件夹
          </p>
          <Button
            variant="outline"
            className="mt-4 bg-transparent"
            onClick={() => router.push("/dashboard")}
          >
            返回仪表盘
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card
              key={note.id}
              className="hover:bg-accent transition-colors h-full group relative"
            >
              <Link href={`/dashboard/notes/${note.id}`} className="block">
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
                  <p className="text-xs text-muted-foreground mt-2 md:mt-3">
                    {note.updated_at
                      ? new Date(note.updated_at).toLocaleDateString("zh-CN")
                      : "无日期"}
                  </p>
                </CardContent>
              </Link>
              {/* 删除按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (note.id) handleDeleteNote(String(note.id));
                }}
              >
                <Trash className="" />
              </Button>
              {/* 移除按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (note.id) handleRemoveNote(String(note.id));
                }}
              >
                <LogOut />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
