"use client";

import { useEffect, useState, use } from "react";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import {
  getLocalFolder,
  getLocalNotes,
  updateLocalFolder,
  deleteLocalFolder,
} from "@/lib/local-storage";
import { getUserId } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Trash2, Edit2, MoreVertical, LogOut, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Folder, Note } from "@/types/note";
import { useCurrentFolderIdStore } from "@/lib/store/folders";
import { get } from "http";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FolderPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const useLocalStorage = !isSupabaseConfigured();
  const { setCurrentFolderId } = useCurrentFolderIdStore();

  useEffect(() => {
    async function loadFolder() {
      if (useLocalStorage) {
        // 本地存储模式
        const localFolder = getLocalFolder(id);
        if (!localFolder) {
          router.push("/dashboard");
          return;
        }
        setFolder(localFolder);


        // 获取文件夹内的笔记
        if (localFolder.notes_id) {
          const noteIds = localFolder.notes_id
            .split(",")
            .filter((nid) => nid.trim() !== "");
          const allNotes = getLocalNotes();
          const folderNotes = allNotes.filter((note) =>
            noteIds.includes(note.id)
          );
          setNotes(folderNotes);
        }
      } else {
        // Supabase 模式
        const supabase = createClient();
        if (!supabase) {
          router.push("/dashboard");
          return;
        }

        const userId = await getUserId();
        if (!userId) {
          router.push("/login");
          return;
        }

        // 获取文件夹
        const { data: folderData, error: folderError } = await supabase
          .from("folders")
          .select("*")
          .eq("id", id)
          .eq("user_id", userId)
          .single();

        if (folderError || !folderData) {
          router.push("/dashboard");
          return;
        }

        setFolder(folderData as Folder);

        // 获取文件夹内的笔记
        if (folderData.notes_id) {
          const noteIds = folderData.notes_id
            .split(",")
            .filter((nid: string) => nid.trim() !== "");
          if (noteIds.length > 0) {
            const { data: notesData } = await supabase
              .from("notes")
              .select("*")
              .in("id", noteIds)
              .eq("user_id", userId);

            if (notesData) {
              setNotes(notesData as Note[]);
            }
          }
        }
      }
      setLoading(false);
    }

    loadFolder();
  }, [id, useLocalStorage, router]);

  useEffect(() => {
    // console.log("Folder data:", id);
    setCurrentFolderId(id);
  }, []);

  // 重命名文件夹
  const handleRename = async () => {
    if (!folder) return;
    const newName = window.prompt("请输入新的文件夹名:", folder.name);
    if (!newName || newName === folder.name) return;

    if (useLocalStorage) {
      const updatedFolder = {
        ...folder,
        name: newName,
        updated_at: new Date().toISOString(),
      };
      updateLocalFolder(updatedFolder);
      setFolder(updatedFolder);
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const userId = await getUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from("folders")
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (!error && data) {
        setFolder(data as Folder);
      }
    }
  };

  // 删除文件夹
  const handleDelete = async () => {
    if (!folder) return;
    const confirmed = window.confirm(
      `确定要删除文件夹 "${folder.name}" 吗？文件夹内的笔记不会被删除。`
    );
    if (!confirmed) return;

    if (useLocalStorage) {
      deleteLocalFolder(id);
      router.push("/dashboard");
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const userId = await getUserId();
      if (!userId) return;

      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (!error) {
        router.push("/dashboard");
      }
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

    if (useLocalStorage) {
      const updatedFolder = {
        ...folder,
        notes_id: newNoteIds,
        updated_at: new Date().toISOString(),
      };
      updateLocalFolder(updatedFolder);
      setFolder(updatedFolder);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const userId = await getUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from("folders")
        .update({ notes_id: newNoteIds, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (!error && data) {
        setFolder(data as Folder);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
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

  // 删除笔记
  const handleDeleteNote = async (noteId: string) => {
    if (folder) {
      let notes_string = folder.notes_id.split(",");
      let result = ""
      if (notes_string.length > 2) {
        result = notes_string.filter((nid) => nid !== noteId).join(",");
      } else {
        result = notes_string[0];
      }
      folder.notes_id = result ? result : "";
    }
    if (useLocalStorage) {
      const notes = getLocalNotes().filter((n) => n.id !== noteId);
      setNotes(notes);
      localStorage.setItem("notes", JSON.stringify(notes));
    } else {
      const supabase = createClient();
      if (!supabase) return;
      const userId = await getUserId();
      if (!userId) return;
      {
        const { error } = await supabase.from("notes").delete().eq("id", noteId)
          .eq("user_id", userId);
        if (error) {
          console.error("Error deleting note:", error);
          return;
        }
      }
      {
        const { error } = await supabase
          .from("folders")
          .update({ notes_id: folder.notes_id, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", userId);
        if (error) {
          console.error("Error deleting note:", error);
          return;
        }
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
    setFolder(folder);
    // redirect(`/dashboard/folder/${folder.id}`);
    // window.location.reload();
  };

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
                    {new Date(note.updated_at).toLocaleDateString("zh-CN")}
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
                  handleDeleteNote(note.id);
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
                  handleRemoveNote(note.id);
                }}
              >
                {/* <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /> */}
                {/* <p>移出文件夹</p> */}
                <LogOut />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
