"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";

export default function Home() {
  const notes = useStore((s) => s.notes);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const loadNotes = useStore((s) => s.loadNotes);
  const createNote = useStore((s) => s.createNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const router = useRouter();

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const handleCreate = async () => {
    const note = await createNote({ title: "新笔记", content: "" });
    if (note) {
      router.push(`/notes/${note.id}`);
    }
  };

  const handleSelect = (id: string) => {
    router.push(`/notes/${id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("确定要删除这条笔记吗？")) {
      await deleteNote(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">在线笔记平台</h1>
          {loading && <span className="text-xs text-slate-400">同步中...</span>}
          {error && (
            <span className="text-xs text-red-400 max-w-xs truncate">
              {error}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleCreate}>
          新建笔记
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h2 className="text-sm text-slate-400 mb-4">
              笔记列表（{notes.length}）
            </h2>
          </div>
          {notes.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 mb-4">还没有笔记</p>
              <Button onClick={handleCreate}>创建第一条笔记</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors cursor-pointer group"
                  onClick={() => handleSelect(note.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-slate-100 truncate flex-1">
                      {note.title || "未命名笔记"}
                    </h3>
                    <button
                      onClick={(e) => handleDelete(note.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity ml-2"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {note.content
                      ? note.content.replace(/<[^>]*>/g, "").substring(0, 100)
                      : "暂无内容"}
                  </p>
                  <p className="text-xs text-slate-600">
                    {new Date(note.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
