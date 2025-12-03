"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TurndownService from "turndown";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";

const turndownService = new TurndownService();

export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;
  const notes = useStore((s) => s.notes);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const [title, setTitle] = useState("");
  const [markdownContent, setMarkdownContent] = useState("");
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [ydocReady, setYdocReady] = useState(false);

  const note = notes.find((n) => n.id === noteId);

  // 初始化 Yjs 文档和 Hocuspocus Provider
  useEffect(() => {
    if (!noteId) return;

    const doc = new Y.Doc();
    ydocRef.current = doc;

    // 创建 Hocuspocus Provider
    const hocuspocusProvider = new HocuspocusProvider({
      url: "ws://localhost:1234",
      name: `note-${noteId}`,
      document: doc,
      onConnect: () => {
        console.log("Connected to Hocuspocus");
        setIsConnected(true);
        setYdocReady(true);
      },
      onDisconnect: () => {
        console.log("Disconnected from Hocuspocus");
        setIsConnected(false);
      },
    });

    providerRef.current = hocuspocusProvider;

    setYdocReady(true);

    return () => {
      hocuspocusProvider.destroy();
      doc.destroy();
      setYdocReady(false);
    };
  }, [noteId]);

  // 初始化编辑器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "开始输入你的笔记内容...",
      }),
      Collaboration.configure({
        document: ydocRef.current || new Y.Doc(),
        field: "prosemirror",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-slate max-w-none focus:outline-none min-h-[500px] px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
      setMarkdownContent(markdown);
    },
    onCreate: ({ editor }) => {
      setIsEditorReady(true);
      if (note?.content) {
        editor.commands.setContent(note.content);
        const html = editor.getHTML();
        const markdown = turndownService.turndown(html);
        setMarkdownContent(markdown);
      }
    },
    immediatelyRender: false,
  });

  // 更新预览
  useEffect(() => {
    if (!editor || !isEditorReady) return;

    const updatePreview = () => {
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
      setMarkdownContent(markdown);
    };

    editor.on("update", updatePreview);

    return () => {
      editor.off("update", updatePreview);
    };
  }, [editor, isEditorReady]);

  // 加载笔记数据
  useEffect(() => {
    if (note) {
      setTitle(note.title);
    } else {
      // 如果笔记不存在，返回列表页
      router.push("/");
    }
  }, [note, router]);

  // 保存笔记
  const handleSave = useCallback(async () => {
    if (!noteId || !editor) return;

    const content = editor.getHTML();
    await updateNote(noteId, {
      title: title || "未命名笔记",
      content: content,
    });
  }, [noteId, title, editor, updateNote]);

  // 删除笔记
  const handleDelete = useCallback(async () => {
    if (!noteId) return;
    if (confirm("确定要删除这条笔记吗？")) {
      await deleteNote(noteId);
      router.push("/");
    }
  }, [noteId, deleteNote, router]);

  // 自动保存
  useEffect(() => {
    if (!editor || !noteId || !isEditorReady) return;

    const timeoutId = setTimeout(() => {
      void handleSave();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [title, markdownContent, editor, noteId, handleSave, isEditorReady]);

  if (!note) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-slate-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* 头部 */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/")}
        >
          ← 返回
        </Button>
        <div className="flex items-center gap-3">
          <input
            className="bg-transparent border border-slate-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[300px]"
            placeholder="笔记标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="text-xs text-green-400">● 已连接</span>
            ) : (
              <span className="text-xs text-slate-500">○ 未连接</span>
            )}
          </div>
          <Button size="sm" onClick={handleSave}>
            保存
          </Button>
          <Button size="sm" variant="outline" onClick={handleDelete}>
            删除
          </Button>
        </div>
      </header>

      {/* 编辑和预览区域 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 编辑器区域 */}
        <div className="flex-1 flex flex-col border-r border-slate-800">
          <div className="border-b border-slate-800 px-4 py-2 text-xs text-slate-400 flex items-center justify-between">
            <span>编辑区</span>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-900">
            {editor && <EditorContent editor={editor} />}
          </div>
        </div>

        {/* 预览区域 */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
            预览区
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-900 px-4 py-3">
            <div className="prose prose-invert prose-slate max-w-none">
              {markdownContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {markdownContent}
                </ReactMarkdown>
              ) : (
                <p className="text-slate-500">暂无内容</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

