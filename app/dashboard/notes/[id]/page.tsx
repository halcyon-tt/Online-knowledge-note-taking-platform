"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X as XIcon } from "lucide-react";
import { fetchNote, updateNote as apiUpdateNote } from "@/lib/api/notes";
import NoteEditor from "@/components/note-editor";
import { NoteTagManager } from "@/components/note-tag-manager";
import { AINoteOrganizePanel } from "@/components/ai-note-organize-panel";
import { AgentChatPanel } from "@/components/agent-chat-panel";
import { AIWorkflowPanel } from "@/components/ai-workflow-panel";
import type { Note } from "@/types/note";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function NotePage({ params }: PageProps) {
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const { id } = use(params);
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOrganize, setShowOrganize] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);

  // Phase E：AI 面板宽度持久化 + 可拖拽
  const [agentWidth, setAgentWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 420;
    const saved = window.localStorage.getItem("ai-panel-width");
    return saved ? Math.max(320, Math.min(680, Number(saved))) : 420;
  });
  const draggingRef = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startWidth = agentWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = startX - ev.clientX; // 向左拖加宽
      const next = Math.max(320, Math.min(680, startWidth + delta));
      setAgentWidth(next);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.localStorage.setItem(
        "ai-panel-width",
        String(
          Math.max(
            320,
            Math.min(680, startWidth + (startX - (window.event as MouseEvent)?.clientX || 0)),
          ),
        ),
      );
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [agentWidth]);

  // 拖完持久化（更可靠）
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ai-panel-width", String(agentWidth));
    }
  }, [agentWidth]);

  useEffect(() => {
    async function loadNote() {
      try {
        const data = await fetchNote(Number(id));
        setNote(data);
      } catch (error) {
        console.error("加载笔记失败:", error);
        router.push("/dashboard");
        return;
      }
      setLoading(false);
    }
    loadNote();
  }, [id, router]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallRef = useRef<number>(0);

  const handleContentChange = useCallback(
    async (content: string) => {
      const now = Date.now();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 如果距离上次执行超过60秒，立即执行
      if (now - lastCallRef.current >= 1000 * 60) {
        lastCallRef.current = now;
        await saveNote(content);
      } else {
        // 否则，设置一个定时器，5秒后执行
        timeoutRef.current = setTimeout(
          () => {
            lastCallRef.current = Date.now();
            saveNote(content);
          },
          5000 - (now - lastCallRef.current)
        );
      }
    },
    [note, id]
  );

  const saveNote = async (content: string) => {
    setSaving(true);
    if (!note) {
      setSaving(false);
      return;
    }

    try {
      await apiUpdateNote(Number(id), { content });
      setNote({
        ...note,
        content,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("更新失败:", error);
    } finally {
      setSaving(false);
    }
  };

  // 清理定时器（在组件卸载时）
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleTagsChange = (tags: string[]) => {
    if (!note) return;
    setNote({ ...note, tags });
  };

  const handleApplyTitle = useCallback(async (newTitle: string) => {
    setSaving(true);
    try {
      await apiUpdateNote(Number(id), { title: newTitle });
      setNote((prev) => prev ? { ...prev, title: newTitle } : prev);
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [id]);

  const handleApplyTags = useCallback(async (tags: string[]) => {
    setNote((prev) => prev ? { ...prev, tags } : prev);
  }, []);

  const handleInsertSummary = useCallback(async (summary: string) => {
    const newContent = note?.content
      ? `${note.content}\n\n---\n**摘要**\n${summary}`
      : `**摘要**\n${summary}`;
    setSaving(true);
    try {
      await apiUpdateNote(Number(id), { content: newContent });
      setNote((prev) => prev ? { ...prev, content: newContent } : prev);
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [id, note]);

  const handleTitleBlur = useCallback(async () => {
    if (!note) return;
    setSaving(true);
    try {
      await apiUpdateNote(Number(id), { title: note.title || "" });
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [id, note]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载笔记内容中...</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">笔记不存在或已被删除</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0">
        <div className="border-b bg-background px-3 md:px-4 py-3 space-y-2">
          <input
            type="text"
            value={note.title || ""}
            onChange={(e) => setNote({ ...note, title: e.target.value })}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
            placeholder="笔记标题"
            className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
          />
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <span className="text-sm text-muted-foreground shrink-0">标签:</span>
            <NoteTagManager
              noteId={id}
              noteTags={note.tags || []}
              onTagsChange={handleTagsChange}
              setSaving={setSaving}
              saving={saving}
              updateNote={saveNote}
            />
            <div className="ml-auto shrink-0 flex items-center gap-1">
              <button
                onClick={() => { setShowAgent(false); setShowWorkflow(false); setShowOrganize((v) => !v); }}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-accent transition-colors"
                title="AI 整理"
              >
                {showOrganize ? <XIcon className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-primary" />}
                <span>{showOrganize ? "关闭" : "AI 整理"}</span>
              </button>
              <button
                onClick={() => { setShowOrganize(false); setShowWorkflow(false); setShowAgent((v) => !v); }}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-accent transition-colors"
                title="AI Agent 对话"
              >
                {showAgent ? <XIcon className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-primary" />}
                <span>{showAgent ? "关闭" : "Agent"}</span>
              </button>
              <button
                onClick={() => { setShowOrganize(false); setShowAgent(false); setShowWorkflow((v) => !v); }}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-accent transition-colors"
                title="AI 工作流"
              >
                {showWorkflow ? <XIcon className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-primary" />}
                <span>{showWorkflow ? "关闭" : "工作流"}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto hide-scrollbar">
          <NoteEditor
            noteId={id}
            initialContent={note.content}
            onChange={handleContentChange}
          />
        </div>
      </div>
      {showOrganize && (
        <div className="w-72 border-l bg-background flex flex-col shrink-0">
          <AINoteOrganizePanel
            title={note.title || ""}
            content={stripHtml(note.content || "")}
            existingTags={note.tags || []}
            onApplyTitle={handleApplyTitle}
            onApplyTags={handleApplyTags}
            onInsertSummary={handleInsertSummary}
          />
        </div>
      )}
      {showAgent && (
        <div
          className="relative border-l bg-background flex flex-col shrink-0"
          style={{ width: `${agentWidth}px` }}
        >
          <div
            className="ai-panel-resize-handle"
            onMouseDown={startResize}
            title="拖动调整 AI 面板宽度"
          />
          <AgentChatPanel
            noteContext={{
              noteId: Number(id),
              title: note.title || "",
              content: stripHtml(note.content || ""),
            }}
          />
        </div>
      )}
      {showWorkflow && (
        <div className="w-[420px] border-l bg-background flex flex-col shrink-0">
          <AIWorkflowPanel
            noteId={Number(id)}
            title={note.title || ""}
            content={stripHtml(note.content || "")}
            existingTags={note.tags || []}
          />
        </div>
      )}
    </div>
  );
}
