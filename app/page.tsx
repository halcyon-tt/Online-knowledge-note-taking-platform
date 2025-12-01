"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";

export default function Home() {
  const notes = useStore((s) => s.notes);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const loadNotes = useStore((s) => s.loadNotes);
  const createNote = useStore((s) => s.createNote);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const selectNote = useStore((s) => s.selectNote);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  const handleCreate = () => {
    if (!draftTitle.trim() && !draftContent.trim()) return;
    void createNote({ title: draftTitle.trim(), content: draftContent });
    setDraftTitle("");
    setDraftContent("");
  };

  const handleUpdate = () => {
    if (!selectedNote) return;
    void updateNote(selectedNote.id, {
      title: draftTitle || selectedNote.title,
      content: draftContent,
    });
  };

  const handleSelect = (id: string) => {
    selectNote(id);
    const note = notes.find((n) => n.id === id);
    if (note) {
      setDraftTitle(note.title);
      setDraftContent(note.content);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这条笔记吗？")) {
      void deleteNote(id);
      if (selectedNoteId === id) {
        setDraftTitle("");
        setDraftContent("");
      }
    }
  };

  const handleStartNew = () => {
    selectNote(null);
    setDraftTitle("");
    setDraftContent("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">在线笔记平台（基础版）</h1>
          {loading && <span className="text-xs text-slate-400">同步中...</span>}
          {error && (
            <span className="text-xs text-red-400 max-w-xs truncate">
              {error}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleStartNew}>
          新建笔记
        </Button>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* 列表区域 */}
        <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 max-h-60 md:max-h-none overflow-y-auto">
          <div className="p-3 flex items-center justify-between">
            <span className="text-sm text-slate-300">
              笔记列表（{notes.length}）
            </span>
          </div>
          <ul className="space-y-1 px-2 pb-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className={`flex items-center justify-between rounded-md px-2 py-2 text-sm cursor-pointer ${
                  selectedNoteId === note.id
                    ? "bg-slate-800 text-white"
                    : "hover:bg-slate-900"
                }`}
              >
                <button
                  className="flex-1 text-left truncate"
                  onClick={() => handleSelect(note.id)}
                >
                  <div className="font-medium truncate">{note.title}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {new Date(note.updatedAt).toLocaleString()}
                  </div>
                </button>
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-2 h-7 w-7 text-xs"
                  onClick={() => handleDelete(note.id)}
                >
                  ×
                </Button>
              </li>
            ))}
            {notes.length === 0 && (
              <li className="text-xs text-slate-400 px-2 py-2">
                还没有笔记，点击右上角「新建笔记」开始吧。
              </li>
            )}
          </ul>
        </aside>

        {/* 编辑 / 查看区域 */}
        <section className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 gap-2">
            <input
              className="flex-1 bg-transparent border border-slate-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="请输入标题..."
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate}>
                保存为新笔记
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUpdate}
                disabled={!selectedNote}
              >
                覆盖当前笔记
              </Button>
            </div>
          </div>

          <div className="flex-1 grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 gap-px bg-slate-900/60">
            {/* 编辑 */}
            <div className="flex flex-col bg-slate-950">
              <div className="border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
                内容编辑（支持 Markdown 语法）
              </div>
              <textarea
                className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none resize-none"
                placeholder="在这里输入你的笔记内容..."
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
              />
            </div>

            {/* 简单查看区（纯文本显示） */}
            <div className="flex flex-col bg-slate-950">
              <div className="border-b border-slate-800 px-3 py-2 text-xs text-slate-400 flex items-center justify-between">
                <span>预览（纯文本，仅用于查看）</span>
                {selectedNote && (
                  <span className="text-[10px] text-slate-500">
                    最后更新：
                    {new Date(selectedNote.updatedAt).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex-1 px-3 py-2 text-sm whitespace-pre-wrap overflow-y-auto text-slate-200">
                {draftContent || (
                  <span className="text-slate-500">
                    暂无内容，请在左侧编辑区输入。
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
