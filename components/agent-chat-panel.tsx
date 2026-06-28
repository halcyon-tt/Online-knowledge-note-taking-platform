"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { Send, Loader2, Bot, User, Square, AlertCircle, Check, X, Wrench, Pin } from "lucide-react";
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

// 给工具调用结果生成人类可读的简短描述，避免直接显示 ack JSON
function formatToolResult(tool: string, result: unknown): string {
  if (tool === "edit_note_text") {
    const r = result as {
      applied?: boolean;
      operation?: string;
      from?: number;
      to?: number;
      insertedAt?: number;
      reason?: string;
      note?: string;
    };
    if (!r.applied) {
      // 显示完整 reason，方便定位 agent 行为
      return `✗ 未应用${r.reason ? `（${r.reason}）` : ""}${r.operation ? ` operation=${r.operation}` : ""}`;
    }
    if (r.operation === "replaceRange" || r.operation === "replaceSelection" || r.operation === "replaceRange-fallback") {
      return r.from != null ? `✓ 已替换文本 (pos ${r.from}..${r.to})` : `✓ 已替换文本`;
    }
    if (r.operation === "insertAtCursor") {
      return r.insertedAt != null ? `✓ 已插入文本 (pos ${r.insertedAt})` : `✓ 已插入文本`;
    }
    return `✓ 已应用 ${r.operation ?? ""}`;
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
    await sendMessage(enrichedText, enrichedNoteContext);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Agent</span>
        </div>
        <div className="flex gap-1">
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
            <div key={msg.id} className="space-y-2">
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

              {/* Tool calls */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="flex gap-2 ml-9">
                  <div className="flex-1 space-y-1">
                    {msg.toolCalls.map((tc, i) => (
                      <Card key={i} className="bg-muted/30 border-border/30">
                        <CardContent className="p-2 text-xs space-y-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Wrench className="h-3 w-3" />
                            <span className="font-mono">{tc.tool}</span>
                          </div>
                          {tc.result != null && tc.id !== "organize" ? (
                            <p className="text-muted-foreground/80 text-[11px] leading-relaxed break-words">
                              {formatToolResult(tc.tool, tc.result)}
                            </p>
                          ) : null}
                          {/* AI 编辑工具：展示原文 vs 新文对比 + 撤销按钮 */}
                          {tc.tool === "edit_note_text" && (() => {
                            const r = tc.result as {
                              applied?: boolean;
                              oldText?: string;
                              newText?: string;
                              from?: number;
                              insertedAt?: number;
                            } | undefined;
                            if (!r?.applied || !r?.newText) return null;
                            const fromPos = r.from ?? r.insertedAt ?? 0;
                            return (
                              <div className="grid grid-cols-1 gap-1 mt-1">
                                {r.oldText && (
                                  <div className="p-1.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60">
                                    <p className="font-medium text-[10px] text-red-600 dark:text-red-400 mb-0.5">原文</p>
                                    <p className="whitespace-pre-wrap text-muted-foreground line-through text-[11px] leading-relaxed">{r.oldText}</p>
                                  </div>
                                )}
                                <div className="p-1.5 rounded bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/60">
                                  <p className="font-medium text-[10px] text-green-600 dark:text-green-400 mb-0.5">{r.oldText ? "替换为" : "插入"}</p>
                                  <p className="whitespace-pre-wrap text-muted-foreground text-[11px] leading-relaxed">{r.newText}</p>
                                </div>
                                {r.oldText && (
                                  <div className="flex justify-end pt-0.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[11px] bg-transparent"
                                      onClick={() => {
                                        const ok = undoAiEdit(fromPos, r.newText!, r.oldText!);
                                        if (!ok) {
                                          alert("撤销失败：内容可能已变化，无法定位。");
                                        }
                                      }}
                                      title="撤销这次 AI 修改，恢复原文"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      撤销
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
