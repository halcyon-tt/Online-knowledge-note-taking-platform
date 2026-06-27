"use client";

import type React from "react";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Sparkles,
  Loader2,
  Square,
  Trash2,
  Bot,
  User,
  AlertCircle,
  Check,
  X,
  Wrench,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { AgentUiRenderer } from "@/components/agent-ui-renderer";
import { agentChatStream } from "@/lib/ai-client";
import type { AgentStreamEvent, UiEvent, FrontendToolName } from "@/types/ai";
import { useNotes } from "@/contexts/NotesContext";
import Link from "next/link";

interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: { id: string; tool: string; args: unknown; result?: unknown; done?: boolean }[];
  requiresConfirmation?: { id: string; action: string; payload: unknown };
  uiEvents?: UiEvent[];
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { notes } = useNotes();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const text = input.trim();
    const userMsg: AgentMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantId = `assistant_${Date.now()}`;
    const assistantMsg: AgentMessage = { id: assistantId, role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await agentChatStream(
        { message: text },
        (event: AgentStreamEvent) => {
          if (abort.signal.aborted) return;
          if (event.type === "ui") {
            const name = event.component as FrontendToolName;
            if (["insertAtCursor","replaceRange","replaceSelection","scrollTo","highlightRange","updateTitle","addTags"].includes(name)) {
              return;
            }
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (!last || last.id !== assistantId) return prev;
              return updated.map((m) =>
                m.id === assistantId
                  ? { ...m, uiEvents: [...(m.uiEvents || []), event] }
                  : m
              );
            });
            return;
          }
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (!last || last.id !== assistantId) return prev;

            switch (event.type) {
              case "text-delta":
                return updated.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.content } : m
                );
              case "tool-call-start":
                return updated.map((m) =>
                  m.id === assistantId
                    ? { ...m, toolCalls: [...(m.toolCalls || []), { id: event.id, tool: event.tool, args: event.args }] }
                    : m
                );
              case "tool-call-end":
                return updated.map((m) =>
                  m.id === assistantId
                    ? { ...m, toolCalls: (m.toolCalls || []).map((tc) => tc.id === event.id ? { ...tc, done: true } : tc) }
                    : m
                );
              case "tool-result":
                return updated.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: (m.toolCalls || []).map((tc) =>
                          tc.id === event.id ? { ...tc, result: event.result } : tc
                        ),
                      }
                    : m
                );
              case "human-in-the-loop":
                return updated.map((m) =>
                  m.id === assistantId
                    ? { ...m, requiresConfirmation: { id: event.id, action: event.action, payload: event.payload } }
                    : m
                );
              case "error":
                return updated.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + `\n[错误] ${event.message}` } : m
                );
              default:
                return prev;
            }
          });
        },
        abort.signal
      );
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: m.content + `\n[错误] ${err instanceof Error ? err.message : "请求失败"}` }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const handleClear = () => {
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border shrink-0 gap-3 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-semibold">AI 智能助手</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Agent 驱动：检索、摘要、整理您的笔记
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="self-end sm:self-auto bg-transparent"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            清空对话
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 md:px-6">
        <div className="max-w-3xl mx-auto py-4 md:py-6 space-y-4 md:space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 md:py-16 text-center">
              <div className="p-3 md:p-4 rounded-full bg-primary/10 mb-3 md:mb-4">
                <Bot className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h2 className="text-base md:text-lg font-medium mb-2">AI 智能助手</h2>
              <p className="text-muted-foreground max-w-md mb-6 md:mb-8 text-sm md:text-base px-4">
                Agent 可以搜索笔记、获取内容、提出修改建议，让 AI 帮您管理和整理笔记
              </p>
              <div className="text-sm text-muted-foreground px-2">
                <p className="mb-3">试试这些问题：</p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 justify-center">
                  {[
                    "帮我总结所有笔记的核心内容",
                    "搜索关于React的笔记",
                    "列出我的所有标签",
                    "分析我的工作笔记主题",
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(suggestion)}
                      className="text-xs w-full sm:w-auto"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                <div
                  className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
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
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content || (isLoading ? " " : "")}</p>
                  </div>
                </div>

                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="flex gap-2 ml-9">
                    <div className="flex-1 space-y-1">
                      {msg.toolCalls.map((tc, i) => (
                        <Card key={i} className="bg-muted/30 border-border/30">
                          <CardContent className="p-2 text-xs">
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Wrench className="h-3 w-3" />
                              <span className="font-mono">{tc.tool}</span>
                            </div>
                            {tc.result != null ? (
                              <p className="text-muted-foreground/70 truncate">
                                {String(typeof tc.result === "string" ? tc.result : JSON.stringify(tc.result)).slice(0, 100)}
                              </p>
                            ) : null}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

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
                          onAction={() => {}}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-tl-sm px-3 md:px-4 py-2 md:py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Agent 思考中...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border px-4 md:px-6 py-3 md:py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 md:gap-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题，Agent 将搜索笔记并回答..."
              className="min-h-[44px] max-h-32 resize-none text-sm"
              rows={1}
              disabled={isLoading}
            />
            {isLoading ? (
              <Button onClick={handleCancel} size="icon" variant="outline" className="h-11 w-11 shrink-0">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            已加载 {notes.length} 篇笔记
          </p>
        </div>
      </div>
    </div>
  );
}
