"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { Send, Loader2, Bot, User, Square, AlertCircle, Check, X, Wrench, Pin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { AgentUiRenderer } from "@/components/agent-ui-renderer";
import {
  executeEditorTool,
  subscribeToEditor,
  subscribeToLockedSelection,
  setLockedSelection,
  getLockedSelection,
} from "@/lib/editor-bridge";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useEditorSync } from "@/hooks/useEditorSync";
import { ThinkingSteps } from "@/components/ai-ui/thinking-steps";
import { useAiFeatureStore } from "@/lib/store/ai-features";

// 给工具调用结果生成人类可读的简短描述，避免直接显示 ack JSON
function formatToolResult(tool: string, result: unknown): string {
  if (tool === "edit_note_text" || tool === "stream_edit_note_text") {
    const r = result as {
      applied?: boolean;
      finished?: boolean;
      operation?: string;
      from?: number;
      to?: number;
      insertedAt?: number;
      reason?: string;
      note?: string;
      newText?: string;
    };
    // stream 工具的 result.finished === true 表示流式完成
    const ok = r.applied || r.finished;
    if (!ok) {
      return `✗ 未应用${r.reason ? `（${r.reason}）` : ""}${r.operation ? ` operation=${r.operation}` : ""}`;
    }
    const charCount = r.newText ? r.newText.length : null;
    const sizeLabel = charCount != null ? `，${charCount} 字` : "";
    if (tool === "stream_edit_note_text") {
      return r.from != null
        ? `✓ 流式生成完成 (pos ${r.from}..${r.to}${sizeLabel})`
        : `✓ 流式生成完成${sizeLabel}`;
    }
    if (r.operation === "replaceRange" || r.operation === "replaceSelection" || r.operation === "replaceRange-fallback") {
      return r.from != null ? `✓ 已替换文本 (pos ${r.from}..${r.to}${sizeLabel})` : `✓ 已替换文本`;
    }
    if (r.operation === "insertAtCursor") {
      return r.insertedAt != null ? `✓ 已插入文本 (pos ${r.insertedAt}${sizeLabel})` : `✓ 已插入文本`;
    }
    return `✓ 已应用 ${r.operation ?? ""}${sizeLabel}`;
  }
  if (tool === "search_notes") {
    if (Array.isArray(result)) return `找到 ${result.length} 篇相关笔记`;
  }
  if (tool === "get_note") {
    const r = result as { title?: string; content?: string };
    if (r?.title) return `已读取笔记《${r.title}》`;
  }
  if (tool === "list_tags") {
    if (Array.isArray(result)) return `读取 ${result.length} 个标签`;
  }
  const str = typeof result === "string" ? result : JSON.stringify(result);
  return str.length > 80 ? str.slice(0, 80) + "..." : str;
}

// AI 修改撤销：把当前 from..(from+newText.length) 的内容替换回 oldText
function undoAiEdit(from: number, newText: string, oldText: string) {
  const to = from + newText.length;
  const result = executeEditorTool("edit_note_text", {
    operation: "replaceRange",
    from,
    to,
    text: oldText,
  }) as { applied?: boolean } | null;
  return result?.applied ?? false;
}

interface AgentChatPanelProps {
  noteContext?: {
    noteId?: number;
    title?: string;
    content?: string;
    selection?: { from: number; to: number; text: string };
  };
}

export function AgentChatPanel({ noteContext }: AgentChatPanelProps) {
  const [input, setInput] = useState("");
  const {
    messages,
    isLoading,
    error,
    conversationId,
    ensureConversationId,
    sendMessage,
    cancel,
    clearMessages,
    removeUiEvent,
    filterUiEvents,
    addUiEvent,
  } = useAgentStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [locked, setLocked] = useState<{ from: number; to: number; text: string } | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Phase 4：挂载时立刻初始化 conversationId 并订阅 editor，
  // useEditorSync 即可在用户发第一条消息前就把选区推到后端。
  useEffect(() => {
    ensureConversationId();
    const unsubscribe = subscribeToEditor((e) => setEditor(e as Editor | null));
    return unsubscribe;
  }, [ensureConversationId]);

  // 订阅锁定选区，让 chip 实时反映"AI 会作用于哪段文字"
  useEffect(() => {
    const unsubscribe = subscribeToLockedSelection((s) => setLocked(s));
    return unsubscribe;
  }, []);

  // 切笔记时清掉上一篇的锁定选区，避免误带过去
  useEffect(() => {
    return () => setLockedSelection(null);
  }, [noteContext?.noteId]);

  useEditorSync({
    editor,
    conversationId,
    noteRef:
      noteContext?.noteId || noteContext?.title
        ? { noteId: noteContext.noteId, title: noteContext.title }
        : undefined,
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    // 优先使用锁定选区（用户在编辑器选过的，即使点了输入框失焦也保留）
    const lockedSel = getLockedSelection();
    const enrichedNoteContext = lockedSel
      ? { ...noteContext, selection: lockedSel }
      : noteContext;
    const enrichedText = lockedSel
      ? `${text}\n\n[当前选中 pos ${lockedSel.from}..${lockedSel.to}: "${lockedSel.text.slice(0, 200)}"]`
      : text;
    // displayText：用户气泡只显示原始输入，不暴露技术注释
    await sendMessage(enrichedText, enrichedNoteContext, { displayText: text });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Phase E：Esc 中断流式生成
    if (e.key === "Escape" && isLoading) {
      e.preventDefault();
      cancel();
    }
  };

  // Phase E：全局 Esc 也能中断 agent（用户失焦输入框时按 Esc）
  useEffect(() => {
    if (!isLoading) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const active = document.activeElement;
        // 编辑器内按 Esc 让 ProseMirror 处理（清 ghost / 取消选区），不要全局中断
        const isInEditor = active?.closest?.(".ProseMirror");
        if (isInEditor) return;
        cancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isLoading, cancel]);

  // Phase B Ghost Text 开关
  const ghostEnabled = useAiFeatureStore((s) => s.ghostTextEnabled);
  const toggleGhost = useAiFeatureStore((s) => s.toggleGhostText);

  // Phase D：批量操作进度统计。在最近活跃的 assistant message 里数 edit 类工具调用。
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
  const editCount = lastAssistantMsg?.toolCalls?.filter(
    (tc) =>
      (tc.tool === "edit_note_text" || tc.tool === "stream_edit_note_text") &&
      tc.done,
  ).length ?? 0;
  const pendingEdit = lastAssistantMsg?.toolCalls?.some(
    (tc) =>
      (tc.tool === "edit_note_text" || tc.tool === "stream_edit_note_text") &&
      !tc.done,
  );
  const showBatchBanner = isLoading && (editCount >= 2 || (editCount >= 1 && pendingEdit));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Agent</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={ghostEnabled ? "default" : "ghost"}
            size="sm"
            onClick={toggleGhost}
            className="h-7 text-xs"
            title="智能续写建议：停顿 1.5 秒后浮出灰色建议，Tab 接受，Esc 忽略"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {ghostEnabled ? "智能建议开" : "智能建议"}
          </Button>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearMessages} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" />
              清空
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showBatchBanner && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs border-b border-blue-500/20">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Agent 正在批量修改笔记 · 已完成 {editCount} 处{pendingEdit ? "（进行中…）" : ""}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[11px] text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
            onClick={cancel}
            title="中断批量操作"
          >
            <Square className="h-3 w-3 mr-1" />
            中断
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-1">AI Agent 助手</p>
              <p className="text-xs text-muted-foreground/60">
                发送消息开始对话，Agent 可以搜索笔记、获取内容、提出修改建议
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="space-y-2 ai-message-enter">
              <div
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>

              {/* Tool calls：渲染为思维链步骤流（带图标 + 状态 + 入场动画 + diff/撤销） */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="ml-9">
                  <ThinkingSteps steps={msg.toolCalls} />
                </div>
              )}

              {/* requires_confirmation */}
              {msg.requiresConfirmation && (
                <div className="flex gap-2 ml-9">
                  <Card className="flex-1 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                        <AlertCircle className="h-4 w-4" />
                        需要确认
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {msg.requiresConfirmation.action === "update_note"
                          ? "Agent 建议修改笔记内容"
                          : "Agent 请求执行以下操作"}
                      </p>
                      {msg.requiresConfirmation.payload ? (
                        <pre className="text-xs bg-background/50 p-2 rounded mb-3 overflow-x-auto max-h-24">
                          {JSON.stringify(msg.requiresConfirmation.payload, null, 2) ?? ""}
                        </pre>
                      ) : null}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          确认
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive">
                          <X className="h-3 w-3 mr-1" />
                          拒绝
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {msg.uiEvents && msg.uiEvents.length > 0 && (
                <div className="flex gap-2 ml-9">
                  <div className="flex-1 space-y-2">
                    {msg.uiEvents.map((uiEvent, i) => (
                      <AgentUiRenderer
                        key={i}
                        event={uiEvent}
                        onAction={(action, data) => {
                          if (action === "accept") {
                            if (uiEvent.component === "preview-controls") {
                              executeEditorTool("acceptPreview", {});
                            } else {
                              const d = data as { newText?: string };
                              if (d.newText) {
                                executeEditorTool("replaceSelection", { text: d.newText });
                              }
                            }
                            removeUiEvent(msg.id, i);
                          } else if (action === "discard") {
                            executeEditorTool("discardPreview", {});
                            removeUiEvent(msg.id, i);
                          } else if (action === "preview-outline" || action === "preview-items") {
                            const d = data as { summary?: string; outline?: { level?: number; text?: string }[]; actionItems?: { text?: string; checked?: boolean }[] };
                            const summary = d.summary ?? "";
                            const outline = d.outline ?? [];
                            const actionItems = d.actionItems ?? [];
                            const outlineMd = outline.map((o) => "  ".repeat(Math.max((o.level ?? 2) - 1, 0)) + "- " + (o.text ?? "")).join("\n");
                            const itemsMd = actionItems.map((a) => "- [ ] " + (a.text ?? "")).join("\n");
                            const blocks = [summary, outlineMd ? `## 大纲\n${outlineMd}` : "", itemsMd ? `## 待办事项\n${itemsMd}` : ""].filter(Boolean);
                            executeEditorTool("insertPreviewText", { text: blocks.join("\n\n") + "\n" });
                            filterUiEvents(msg.id, (e) => e.component === "outline-view" || e.component === "action-items");
                            addUiEvent({ type: "ui", component: "preview-controls", props: { type: action === "preview-outline" ? "outline" : "items" } }, msg.id);
                          } else if (action === "apply-tags") {
                            const d = data as { tags?: string[] };
                            if (d.tags) {
                              executeEditorTool("addTags", { tags: d.tags });
                            }
                            removeUiEvent(msg.id, i);
                          } else {
                            removeUiEvent(msg.id, i);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Agent 思考中...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t px-4 py-3 shrink-0">
        {locked && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-2 py-1.5">
            <Pin className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-300 flex-1 truncate" title={locked.text}>
              已锁定选中：&ldquo;{locked.text.slice(0, 60)}{locked.text.length > 60 ? "..." : ""}&rdquo;
            </span>
            <button
              type="button"
              onClick={() => setLockedSelection(null)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 shrink-0"
              title="清除锁定"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，如：帮我查找关于项目的笔记..."
            className="min-h-[40px] max-h-24 resize-none text-sm"
            rows={1}
            disabled={isLoading}
          />
          {isLoading ? (
            <Button onClick={cancel} size="icon" variant="outline" className="h-10 w-10 shrink-0">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
