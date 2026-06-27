"use client";

import { useState, useRef, useCallback } from "react";
import { workflowStream } from "@/lib/ai-client";
import type { WorkflowName, WorkflowStreamEvent, UiEvent, FrontendToolName } from "@/types/ai";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { AgentUiRenderer } from "@/components/agent-ui-renderer";
import { executeEditorTool, hasEditorTool } from "@/lib/editor-bridge";
import {
  Loader2, Check, X, Square, Sparkles, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useNotes } from "@/contexts/NotesContext";

const STEP_DISPLAY_MAP: Record<string, string> = {
  "search-notes": "搜索笔记",
  summarizing: "生成总结",
  organizing: "分析笔记",
  "generating-suggestions": "生成整理建议",
  polishing: "润色选区",
  "grammar-check": "语法检查",
  "generating-draft": "生成草稿",
};

interface WorkflowStep {
  name: string;
  status: "pending" | "running" | "done" | "error";
}

interface WorkflowMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  uiEvents?: UiEvent[];
}

const WORKFLOW_OPTIONS: { value: WorkflowName; label: string; desc: string }[] = [
  { value: "search-summarize", label: "搜索总结", desc: "搜索笔记 → 生成总结" },
  { value: "organize-suggest", label: "整理建议", desc: "整理笔记 → 生成插入建议" },
  { value: "polish-check", label: "润色检查", desc: "润色选区 → 语法检查 → 替换建议" },
  { value: "search-draft", label: "搜索草稿", desc: "搜索笔记 → 生成草稿 → 确认创建" },
];

interface NoteContextProps {
  noteId?: number;
  title?: string;
  content?: string;
  existingTags?: string[];
}

export function AIWorkflowPanel({ noteId, title, content, existingTags }: NoteContextProps = {}) {
  const [workflow, setWorkflow] = useState<WorkflowName | null>(null);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [messages, setMessages] = useState<WorkflowMessage[]>([]);
  const [query, setQuery] = useState("");
  const queryRef = useRef(query);
  queryRef.current = query;
  const [confirmation, setConfirmation] = useState<{
    id: string;
    action: string;
    payload: unknown;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hadErrorRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleStart = useCallback(async (wf: WorkflowName) => {
    const activePayload: Record<string, unknown> = {};
    const q = queryRef.current.trim();
    if ((wf === "search-summarize" || wf === "search-draft") && !q) {
      toast.error("请先输入搜索查询内容");
      return;
    }
    if ((wf === "search-summarize" || wf === "search-draft") && q) {
      activePayload.query = q;
    }
    if (wf === "organize-suggest") {
      activePayload.title = title ?? "";
      activePayload.content = content ?? "";
      activePayload.existingTags = existingTags ?? [];
    }
    if (wf === "polish-check") {
      activePayload.text = content ?? "";
      activePayload.style = "fluent";
    }
    setWorkflow(wf);
    setRunning(true);
    setSteps([]);
    setMessages([]);
    setErrorMsg(null);
    hadErrorRef.current = false;

    const stepNames = wf === "search-summarize"
      ? ["search-notes", "summarizing"]
      : wf === "organize-suggest"
      ? ["organizing", "generating-suggestions"]
      : wf === "polish-check"
      ? ["polishing", "grammar-check"]
      : ["search-notes", "generating-draft"];

    const initialSteps: WorkflowStep[] = stepNames.map((s) => ({
      name: STEP_DISPLAY_MAP[s] ?? s,
      status: "pending" as const,
    }));
    setSteps(initialSteps);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await workflowStream(
        { workflow: wf, payload: activePayload },
        (event: WorkflowStreamEvent) => {
          if (abort.signal.aborted) return;

          if (event.type === "tool-call-start") {
            const displayName = STEP_DISPLAY_MAP[event.tool] ?? event.tool;
            setSteps((prev) =>
              prev.map((s) =>
                s.name === displayName ? { ...s, status: "running" } : s
              )
            );
          } else if (event.type === "tool-call-end") {
            const displayName = STEP_DISPLAY_MAP[event.id] ?? event.id;
            setSteps((prev) =>
              prev.map((s) =>
                s.name === displayName ? { ...s, status: "done" } : s
              )
            );
          } else if (event.type === "text-delta") {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: m.content + event.content } : m
                );
              }
              return [...prev, { id: Date.now().toString(), role: "assistant" as const, content: event.content }];
            });
          } else if (event.type === "human-in-the-loop") {
            setConfirmation({ id: event.id, action: event.action, payload: event.payload });
          } else if (event.type === "tool-result") {
            if (event.id === "polish") {
              const r = event.result as { polishedText?: string } | undefined;
              if (r?.polishedText) {
                setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant" as const, content: r.polishedText ?? "" }]);
              }
            }
          } else if (event.type === "ui") {
            const name = event.component as FrontendToolName;
            if (hasEditorTool(name)) {
              executeEditorTool(name, event.props);
              return;
            }
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1
                    ? { ...m, uiEvents: [...(m.uiEvents || []), event] }
                    : m
                );
              }
              return [...prev, { id: Date.now().toString(), role: "assistant" as const, content: "", uiEvents: [event] }];
            });
          } else if (event.type === "run-finished") {
            if (!hadErrorRef.current) {
              toast.success("工作流执行完成");
            }
          } else if (event.type === "error") {
            hadErrorRef.current = true;
            setErrorMsg(event.message);
            setSteps((prev) =>
              prev.map((s) => (s.status === "running" ? { ...s, status: "error" as const } : s))
            );
          }
        },
        abort.signal
      );
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "工作流执行异常";
      setErrorMsg(msg);
      hadErrorRef.current = true;
      toast.error(msg);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [title, content, existingTags]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
    setErrorMsg(null);
  }, []);

  const handleReset = useCallback(() => {
    setWorkflow(null);
    setSteps([]);
    setMessages([]);
    setRunning(false);
    setConfirmation(null);
    setErrorMsg(null);
  }, []);

  const { createNote, updateNote } = useNotes();

  const handleConfirm = useCallback(async () => {
    if (!confirmation) return;
    if (confirmation.action === "create_note_from_draft") {
      const p = confirmation.payload as Record<string, unknown>;
      const title = String(p.suggestedTitle ?? "AI 草稿笔记");
      const c = String(p.suggestedContent ?? "");
      try {
        await createNote({ title, content: c });
        toast.success("笔记已创建");
      } catch {
        toast.error("创建笔记失败");
      }
    } else if (confirmation.action === "apply_note_organization") {
      const p = confirmation.payload as Record<string, unknown>;
      try {
        const updates: { title?: string; content?: string } = {};
        if (typeof p.title === "string" && p.title) {
          updates.title = p.title;
        }
        const parts: string[] = [];
        if (typeof p.summary === "string" && p.summary) {
          parts.push(p.summary);
        }
        if (Array.isArray(p.outline) && p.outline.length > 0) {
          parts.push("## 大纲\n" + p.outline.map((o: { level?: number; text?: string }) => "  ".repeat(Math.max((o.level ?? 2) - 1, 0)) + "- " + (o.text ?? "")).join("\n"));
        }
        if (Array.isArray(p.actionItems) && p.actionItems.length > 0) {
          parts.push("## 待办事项\n" + p.actionItems.map((a: { text?: string; checked?: boolean }) => "- [" + (a.checked ? "x" : " ") + "] " + (a.text ?? "")).join("\n"));
        }
        const original = content ?? "";
        updates.content = parts.length > 0 ? parts.join("\n\n") + "\n\n" + original : original;
        await updateNote(Number(noteId), updates);
        toast.success("整理建议已应用");
      } catch {
        toast.error("应用整理建议失败");
      }
    } else {
      toast.success("已确认");
    }
    setConfirmation(null);
  }, [confirmation, createNote, updateNote, noteId, content]);

  const handleReject = useCallback(() => {
    setConfirmation(null);
    toast.info("已拒绝");
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          AI 工作流
        </div>
      </div>

      {!workflow && !running && (
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-3">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入搜索查询（搜索总结/搜索草稿需要）..."
              className="w-full min-h-[60px] text-sm p-2 rounded border border-border bg-transparent resize-none placeholder:text-muted-foreground/40 outline-none focus:border-primary"
              rows={2}
            />
            <div className="space-y-2">
              {WORKFLOW_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 px-4 bg-transparent"
                  onClick={() => handleStart(opt.value)}
                >
                  <div className="text-left">
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}

      {(workflow || running) && (
        <div className="flex-1 flex flex-col">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {WORKFLOW_OPTIONS.find((o) => o.value === workflow)?.label}
              </span>
              <div className="flex gap-1">
                {running ? (
                  <Button variant="outline" size="sm" onClick={handleCancel} className="h-7 text-xs bg-transparent">
                    <Square className="h-3 w-3 mr-1" />停止
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleReset} className="h-7 text-xs bg-transparent">
                    <X className="h-3 w-3 mr-1" />关闭
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {step.status === "running" ? (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  ) : step.status === "done" ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : step.status === "error" ? (
                    <X className="h-3 w-3 text-destructive" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                  )}
                  <span className={step.status === "running" ? "text-primary" : "text-muted-foreground"}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 p-3">
            {messages.length === 0 && running && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            {messages.map((msg) => (
              <Card key={msg.id} className="mb-2">
                <CardContent className="p-3 space-y-2">
                  {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                  {msg.uiEvents && msg.uiEvents.length > 0 && (
                    <div className="space-y-2">
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
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === msg.id
                                    ? { ...m, uiEvents: (m.uiEvents || []).filter((_, j) => j !== i) }
                                    : m
                                )
                              );
                            } else if (action === "discard") {
                              executeEditorTool("discardPreview", {});
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === msg.id
                                    ? { ...m, uiEvents: (m.uiEvents || []).filter((_, j) => j !== i) }
                                    : m
                                )
                              );
                            } else if (action === "preview-outline" || action === "preview-items") {
                              const d = data as { summary?: string; outline?: { level?: number; text?: string }[]; actionItems?: { text?: string; checked?: boolean }[] };
                              const summary = d.summary ?? "";
                              const outline = d.outline ?? [];
                              const actionItems = d.actionItems ?? [];
                              const outlineMd = outline.map((o) => "  ".repeat(Math.max((o.level ?? 2) - 1, 0)) + "- " + (o.text ?? "")).join("\n");
                              const itemsMd = actionItems.map((a) => "- [ ] " + (a.text ?? "")).join("\n");
                              const blocks = [summary, outlineMd ? `## 大纲\n${outlineMd}` : "", itemsMd ? `## 待办事项\n${itemsMd}` : ""].filter(Boolean);
                              executeEditorTool("insertPreviewText", { text: blocks.join("\n\n") + "\n" });
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === msg.id
                                    ? { ...m, uiEvents: [...(m.uiEvents || []).filter((e) => e.component !== "outline-view" && e.component !== "action-items"), { type: "ui" as const, component: "preview-controls" as const, props: { type: action === "preview-outline" ? "outline" : "items" } }] }
                                    : m
                                )
                              );
                            } else if (action === "apply-tags") {
                              const d = data as { tags?: string[] };
                              if (d.tags) {
                                executeEditorTool("addTags", { tags: d.tags });
                              }
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === msg.id
                                    ? { ...m, uiEvents: (m.uiEvents || []).filter((_, j) => j !== i) }
                                    : m
                                )
                              );
                            } else {
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === msg.id
                                    ? { ...m, uiEvents: (m.uiEvents || []).filter((_, j) => j !== i) }
                                    : m
                                )
                              );
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {errorMsg && !running && !confirmation && (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-xs text-destructive text-center">{errorMsg}</p>
                <Button variant="outline" size="sm" onClick={handleReset} className="h-7 text-xs bg-transparent">
                  返回选择工作流
                </Button>
              </div>
            )}
            {!running && messages.length === 0 && !confirmation && !errorMsg && (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-xs text-muted-foreground">工作流已停止，未生成结果</p>
                <Button variant="outline" size="sm" onClick={handleReset} className="h-7 text-xs bg-transparent">
                  返回选择工作流
                </Button>
              </div>
            )}

            {confirmation && !running && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    需要确认
                  </div>
                  {(() => {
                    if (!confirmation.payload) return null;
                    const p = confirmation.payload as Record<string, unknown>;
                    if (confirmation.action === "create_note_from_draft" && p.suggestedTitle) {
                      return (
                        <div className="space-y-2 mb-3">
                          <p className="text-sm font-medium">{String(p.suggestedTitle)}</p>
                          <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                            {String(p.suggestedContent ?? "")}
                          </p>
                        </div>
                      );
                    }
                    if (confirmation.action === "apply_note_organization" && p.outline) {
                      const outline = p.outline as { level?: number; text?: string }[];
                      const actionItems = p.actionItems as { text?: string; checked?: boolean }[] | undefined;
                      const outlineMd = outline.map((o) => "  ".repeat(Math.max((o.level ?? 2) - 1, 0)) + "- " + (o.text ?? "")).join("\n");
                      const itemsMd = actionItems?.map((a) => "- [" + (a.checked ? "x" : " ") + "] " + (a.text ?? "")).join("\n") ?? "";
                      const newSections = [outlineMd, itemsMd].filter(Boolean).join("\n\n");
                      const after = newSections ? `## 大纲\n${newSections}\n\n${content ?? ""}` : (content ?? "");
                      return (
                        <div className="space-y-3 mb-3">
                          <p className="text-xs font-medium text-muted-foreground">预览修改效果</p>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs max-h-28 overflow-y-auto">
                              <p className="font-medium text-red-600 dark:text-red-400 mb-1">原文</p>
                              <p className="whitespace-pre-wrap text-muted-foreground">{(content ?? "").slice(0, 300)}</p>
                            </div>
                            <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs max-h-28 overflow-y-auto">
                              <p className="font-medium text-green-600 dark:text-green-400 mb-1">修改后</p>
                              <p className="whitespace-pre-wrap text-muted-foreground">{after.slice(0, 300)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <pre className="text-xs bg-background/50 p-2 rounded mb-3 overflow-x-auto max-h-24">
                        {JSON.stringify(p, null, 2)}
                      </pre>
                    );
                  })()}
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={handleConfirm}>
                      <Check className="h-3 w-3 mr-1" />
                      确认
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent" onClick={handleReject}>
                      <X className="h-3 w-3 mr-1" />
                      拒绝
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          </ScrollArea>
        </div>
      )}
    </div>
  );
}
