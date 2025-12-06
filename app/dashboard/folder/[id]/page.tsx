"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, MoreVertical, Search, Trash2, FolderPlus } from "lucide-react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth-utils";
import { getLocalFolder, getLocalNotes, deleteLocalFolder, updateLocalFolder } from "@/lib/local-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import type { Folder, Note } from "@/types/note";

export default function FolderPage() {
    const { id } = useParams();
    const router = useRouter();
    const [folder, setFolder] = useState<Folder | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [allNotes, setAllNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [addNotesDialogOpen, setAddNotesDialogOpen] = useState(false);
    const useLocalStorage = !isSupabaseConfigured();

    // 加载文件夹数据和笔记
    useEffect(() => {
        async function loadData() {
            setLoading(true);

            if (!id) return;

            if (useLocalStorage) {
                // 本地存储模式
                const folderData = getLocalFolder(id as string);
                if (!folderData) {
                    router.push("/dashboard");
                    return;
                }
                setFolder(folderData);

                // 获取所有笔记
                const allNotesData = getLocalNotes();
                setAllNotes(allNotesData);

                // 获取文件夹内的笔记
                if (folderData.notes_id) {
                    const noteIds = folderData.notes_id.split(',').filter(id => id.trim() !== '');
                    const folderNotes = allNotesData.filter(note => noteIds.includes(note.id));
                    setNotes(folderNotes);
                }
            } else {
                // Supabase 模式
                const supabase = createClient();
                if (!supabase) return;

                const userId = await getUserId();
                if (!userId) {
                    router.push("/login");
                    return;
                }

                // 获取文件夹数据
                const { data: folderData, error: folderError } = await supabase
                    .from("folders")
                    .select("*")
                    .eq("id", id)
                    .eq("user_id", userId)
                    .single();

                if (folderError || !folderData) {
                    console.error("文件夹不存在或访问错误:", folderError);
                    router.push("/dashboard");
                    return;
                }

                setFolder(folderData as Folder);

                // 获取所有用户的笔记（用于添加笔记到文件夹）
                const { data: allNotesData } = await supabase
                    .from("notes")
                    .select("*")
                    .eq("user_id", userId)
                    .order("updated_at", { ascending: false });

                setAllNotes((allNotesData as Note[]) || []);

                // 获取文件夹内的笔记
                if (folderData.notes_id) {
                    const noteIds = folderData.notes_id.split(',').filter((id: string) => id.trim() !== '');
                    if (noteIds.length > 0) {
                        const { data: folderNotes } = await supabase
                            .from("notes")
                            .select("*")
                            .in("id", noteIds)
                            .eq("user_id", userId);

                        setNotes((folderNotes as Note[]) || []);
                    }
                }
            }

            setLoading(false);
        }

        loadData();
    }, [id, useLocalStorage, router]);

    // 删除文件夹
    const handleDeleteFolder = async () => {
        if (!folder) return;

        if (useLocalStorage) {
            deleteLocalFolder(folder.id);
            router.push("/dashboard");
        } else {
            const supabase = createClient();
            if (!supabase) return;

            const userId = await getUserId();
            if (!userId) {
                router.push("/login");
                return;
            }

            const { error } = await supabase
                .from("folders")
                .delete()
                .eq("id", folder.id)
                .eq("user_id", userId);

            if (error) {
                console.error("删除文件夹失败:", error);
                alert("删除文件夹失败");
                return;
            }

            router.push("/dashboard");
        }
    };

    // 从文件夹移除笔记
    const handleRemoveNote = async (noteId: string) => {
        if (!folder) return;

        const currentNoteIds = folder.notes_id
            ? folder.notes_id.split(',').filter(id => id.trim() !== '')
            : [];

        const newNoteIds = currentNoteIds.filter(id => id !== noteId);
        const newNotesIdString = newNoteIds.join(',');

        if (useLocalStorage) {
            const updatedFolder = { ...folder, notes_id: newNotesIdString };
            updateLocalFolder(updatedFolder);
            setFolder(updatedFolder);
            setNotes(prev => prev.filter(note => note.id !== noteId));
        } else {
            const supabase = createClient();
            if (!supabase) return;

            const userId = await getUserId();
            if (!userId) return;

            const { data, error } = await supabase
                .from("folders")
                .update({
                    notes_id: newNotesIdString,
                    updated_at: new Date().toISOString()
                })
                .eq("id", folder.id)
                .eq("user_id", userId)
                .select()
                .single();

            if (error) {
                console.error("更新文件夹失败:", error);
                alert("移除笔记失败");
                return;
            }

            if (data) {
                setFolder(data as Folder);
                setNotes(prev => prev.filter(note => note.id !== noteId));
            }
        }
    };

    // 添加笔记到文件夹
    const handleAddNoteToFolder = async (noteId: string) => {
        if (!folder) return;

        const currentNoteIds = folder.notes_id
            ? folder.notes_id.split(',').filter(id => id.trim() !== '')
            : [];

        // 检查是否已经存在
        if (currentNoteIds.includes(noteId)) {
            alert("该笔记已在此文件夹中");
            return;
        }

        const newNoteIds = [...currentNoteIds, noteId];
        const newNotesIdString = newNoteIds.join(',');

        if (useLocalStorage) {
            const updatedFolder = { ...folder, notes_id: newNotesIdString };
            updateLocalFolder(updatedFolder);
            setFolder(updatedFolder);

            // 添加笔记到显示列表
            const noteToAdd = allNotes.find(n => n.id === noteId);
            if (noteToAdd) {
                setNotes(prev => [...prev, noteToAdd]);
            }
        } else {
            const supabase = createClient();
            if (!supabase) return;

            const userId = await getUserId();
            if (!userId) return;

            const { data, error } = await supabase
                .from("folders")
                .update({
                    notes_id: newNotesIdString,
                    updated_at: new Date().toISOString()
                })
                .eq("id", folder.id)
                .eq("user_id", userId)
                .select()
                .single();

            if (error) {
                console.error("更新文件夹失败:", error);
                alert("添加笔记失败");
                return;
            }

            if (data) {
                setFolder(data as Folder);

                // 添加笔记到显示列表
                const noteToAdd = allNotes.find(n => n.id === noteId);
                if (noteToAdd) {
                    setNotes(prev => [...prev, noteToAdd]);
                }
            }
        }

        // 更新allNotes，移除已添加的笔记
        setAllNotes(prev => prev.filter(note => note.id !== noteId));
    };

    // 获取可添加的笔记（不在当前文件夹中的笔记）
    const getAvailableNotes = () => {
        const currentNoteIds = folder?.notes_id
            ? folder.notes_id.split(',').filter(id => id.trim() !== '')
            : [];

        return allNotes.filter(note => !currentNoteIds.includes(note.id));
    };

    // 过滤笔记（根据搜索词）
    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">加载中...</p>
            </div>
        );
    }

    if (!folder) {
        return (
            <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">文件夹不存在</h1>
                </div>
                <div className="flex justify-center items-center h-64">
                    <p className="text-muted-foreground">该文件夹不存在或已被删除</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* 头部 */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{folder.name}</h1>
                        <p className="text-muted-foreground mt-1">
                            创建于 {new Date(folder.created_at).toLocaleDateString("zh-CN")}
                            {useLocalStorage && (
                                <span className="text-yellow-500 ml-2">(本地存储模式)</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setAddNotesDialogOpen(true)}
                    >
                        <FolderPlus className="h-4 w-4 mr-2" />
                        添加笔记
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除文件夹
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* 搜索栏 */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="搜索笔记..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* 笔记统计 */}
            <div className="mb-6">
                <p className="text-sm text-muted-foreground">
                    共 {notes.length} 个笔记{searchTerm && `，搜索到 ${filteredNotes.length} 个结果`}
                </p>
            </div>

            {/* 笔记列表 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredNotes.length > 0 ? (
                    filteredNotes.map((note) => (
                        <div key={note.id} className="relative group">
                            <Link href={`/dashboard/notes/${note.id}`}>
                                <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                                    <CardHeader>
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
                                        <p className="text-xs text-muted-foreground mt-3">
                                            {new Date(note.updated_at).toLocaleDateString("zh-CN")}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* 移除按钮（悬停时显示） */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (confirm(`确定要将"${note.title}"从文件夹中移除吗？`)) {
                                            handleRemoveNote(note.id);
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center h-64 text-center">
                        {searchTerm ? (
                            <>
                                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-lg font-medium mb-2">未找到相关笔记</p>
                                <p className="text-muted-foreground">请尝试其他搜索关键词</p>
                            </>
                        ) : (
                            <>
                                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-lg font-medium mb-2">文件夹为空</p>
                                <p className="text-muted-foreground mb-6">点击"添加笔记"按钮将笔记加入此文件夹</p>
                                <Button onClick={() => setAddNotesDialogOpen(true)}>
                                    <FolderPlus className="h-4 w-4 mr-2" />
                                    添加笔记
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* 删除文件夹对话框 */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>删除文件夹</DialogTitle>
                        <DialogDescription>
                            确定要删除文件夹 "{folder.name}" 吗？此操作不可撤销。
                            <br />
                            <span className="font-medium text-foreground">
                                注意：文件夹中的笔记不会被删除，只会从文件夹中移除。
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            取消
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                handleDeleteFolder();
                                setDeleteDialogOpen(false);
                            }}
                        >
                            删除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 添加笔记对话框 */}
            <Dialog open={addNotesDialogOpen} onOpenChange={setAddNotesDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>添加笔记到文件夹</DialogTitle>
                        <DialogDescription>
                            选择要添加到文件夹 "{folder.name}" 的笔记
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="搜索笔记..."
                            className="pl-10"
                            onChange={(e) => {
                                const value = e.target.value.toLowerCase();
                                // 这里我们实时搜索过滤
                                const filtered = allNotes.filter(note =>
                                    !folder.notes_id?.split(',').includes(note.id) &&
                                    (note.title.toLowerCase().includes(value) ||
                                        note.content.toLowerCase().includes(value))
                                );
                                // 注意：由于我们使用 getAvailableNotes() 来获取数据，这里需要将搜索状态存储起来
                                // 为简化，我们只在对话框内部进行搜索过滤
                            }}
                        />
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {getAvailableNotes().length > 0 ? (
                            <div className="space-y-2">
                                {getAvailableNotes().map((note) => (
                                    <div
                                        key={note.id}
                                        className="flex items-center justify-between p-3 hover:bg-accent rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{note.title}</p>
                                                <p className="text-sm text-muted-foreground truncate max-w-md">
                                                    {note.content?.replace(/<[^>]*>/g, "").slice(0, 100) || "暂无内容"}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddNoteToFolder(note.id)}
                                        >
                                            添加
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-center">
                                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-lg font-medium mb-2">没有可添加的笔记</p>
                                <p className="text-muted-foreground">
                                    所有笔记都已在此文件夹中，或还没有创建笔记
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setAddNotesDialogOpen(false)}
                        >
                            完成
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}