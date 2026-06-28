"use client";

import { useState, useRef, useCallback } from "react";
import { agentChatStream } from "@/lib/ai-client";
import type { AgentStreamEvent, UiEvent, FrontendToolName } from "@/types/ai";
import { executeEditorTool, hasEditorTool } from "@/lib/editor-bridge";

// AG-UI Phase 1：后端通过 tool-call-start 透传过来的前端工具名称。
// 与后端 src/ais/langgraph/agent.graph.ts 中 FRONTEND_TOOL_NAMES 保持一致。
const FRONTEND_TOOL_NAMES = new Set<string>([
  "edit_note_text",
  "stream_edit_note_text",
]);
const STREAMING_TOOL_NAMES = new Set<string>(["stream_edit_note_text"]);

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: { id: string; tool: string; args: unknown; result?: unknown; done?: boolean }[];
  requiresConfirmation?: { id: string; action: string; payload: unknown };
  uiEvents?: UiEvent[];
}

async function postToolResult(
  conversationId: string,
  toolCallId: string,
  result: unknown,
): Promise<void> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    await fetch(`/api/agent/${encodeURIComponent(conversationId)}/tool-result`, {
      method: "POST",
      headers,
      body: JSON.stringify({ toolCallId, result }),
    });
  } catch (err) {
    // tool-result 回传失败不影响主流程，记录即可
    console.warn("[useAgentStream] tool-result POST failed:", err);
  }
}

export function useAgentStream() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  // 调用者可在挂载时初始化 conversationId，让 useEditorSync 在第一次 sendMessage 前就能推送 context。
  const ensureConversationId = useCallback(() => {
    if (!conversationIdRef.current) {
      const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      conversationIdRef.current = id;
      setConversationId(id);
    }
    return conversationIdRef.current;
  }, []);

  const handleUiEvent = useCallback((event: UiEvent, assistantId?: string) => {
    const name = event.component as FrontendToolName;
    if (hasEditorTool(name)) {
      executeEditorTool(name, event.props);
      return;
    }
    if (assistantId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, uiEvents: [...(m.uiEvents || []), event] }
            : m
        )
      );
    }
  }, []);

  const sendMessage = useCallback(
    async (
      text: string,
      noteContext?: { noteId?: number; title?: string; content?: string },
      options?: { displayText?: string },
    ) => {
      if (!text.trim() || isLoading) return;
      setError(null);

      // displayText 是给用户看的"干净版"（不含 [当前选中: ...] 之类的技术注释）
      // text 是发给 agent 的完整版（包含选区上下文）
      const userMsg: AgentMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: options?.displayText ?? text,
      };
      setMessages((prev) => [...prev, userMsg]);

    const assistantId = `assistant_${Date.now()}`;
    const assistantMsg: AgentMessage = { id: assistantId, role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    // 同一会话内复用 conversationId，方便后端 tool-result 关联。
    const conversationId = ensureConversationId();

    setIsLoading(true);
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await agentChatStream(
        { message: text, noteContext, conversationId },
        (event: AgentStreamEvent) => {
          if (abort.signal.aborted) return;

          if (event.type === "ui") {
            handleUiEvent(event, assistantId);
            return;
          }

          // AG-UI Phase 1：拦截 edit_note_text 等前端工具调用，立即在编辑器执行
          if (event.type === "tool-call-start" && FRONTEND_TOOL_NAMES.has(event.tool)) {
            // Phase A 流式工具：tool-call-start 时只做"开始"动作（定位插入点 + 删旧 + 初始化 streaming 状态）
            if (STREAMING_TOOL_NAMES.has(event.tool)) {
              const args = (event.args as Record<string, unknown>) ?? {};
              executeEditorTool("stream_edit_note_text_start", {
                id: event.id,
                operation: args.operation,
                from: args.from,
                to: args.to,
              });
              // 在 UI 上记录"AI 正在流式生成"
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: [
                          ...(m.toolCalls || []),
                          {
                            id: event.id,
                            tool: event.tool,
                            args: event.args,
                            done: false,
                          },
                        ],
                      }
                    : m,
                ),
              );
              return;
            }

            let result: unknown = { applied: false, reason: "tool not registered" };
            try {
              result = executeEditorTool(
                event.tool,
                event.args as Record<string, unknown>,
              );
            } catch (err) {
              result = {
                applied: false,
                error: err instanceof Error ? err.message : String(err),
              };
            }
            // 异步回传结果（不阻塞 SSE 处理）
            void postToolResult(conversationId, event.id, result);
            // 仍然在 UI 上记录这条工具调用，让用户看到 agent 做了什么
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolCalls: [
                        ...(m.toolCalls || []),
                        {
                          id: event.id,
                          tool: event.tool,
                          args: event.args,
                          result,
                          done: true,
                        },
                      ],
                    }
                  : m,
              ),
            );
            return;
          }

          // Phase A 流式 delta：逐字追加到编辑器（不进 React state）
          if (event.type === "tool-stream-delta") {
            executeEditorTool("stream_edit_note_text_delta", {
              id: event.id,
              delta: event.delta,
            });
            return;
          }

          // Phase A 流式结束：移除 streaming mark + flashAiEdit + 写回 result
          if (event.type === "tool-call-end") {
            const finishResult = executeEditorTool(
              "stream_edit_note_text_finish",
              { id: event.id },
            ) as {
              finished?: boolean;
              from?: number;
              to?: number;
              oldText?: string;
              newText?: string;
              operation?: string;
            } | null;
            if (finishResult?.finished) {
              void postToolResult(conversationId, event.id, finishResult);
              // 把 result 写回对应 toolCall，让 diff 卡片能渲染
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: (m.toolCalls || []).map((tc) =>
                          tc.id === event.id
                            ? {
                                ...tc,
                                done: true,
                                result: {
                                  applied: true,
                                  ...finishResult,
                                },
                              }
                            : tc,
                        ),
                      }
                    : m,
                ),
              );
              return;
            }
            // 不是流式工具的 end：走原通用逻辑（标记 toolCall done）
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
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [isLoading, handleUiEvent, ensureConversationId]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    conversationIdRef.current = null;
    setConversationId(null);
  }, []);

  const removeUiEvent = useCallback((msgId: string, eventIndex: number) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, uiEvents: (m.uiEvents || []).filter((_, i) => i !== eventIndex) }
          : m
      )
    );
  }, []);

  const filterUiEvents = useCallback((msgId: string, predicate: (e: UiEvent) => boolean) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, uiEvents: (m.uiEvents || []).filter((e) => !predicate(e)) }
          : m
      )
    );
  }, []);

  const addUiEvent = useCallback((event: UiEvent, msgId?: string) => {
    setMessages((prev) => {
      const targetId = msgId ?? prev[prev.length - 1]?.id;
      return prev.map((m) =>
        m.id === targetId
          ? { ...m, uiEvents: [...(m.uiEvents || []), event] }
          : m
      );
    });
  }, []);

  return { messages, isLoading, error, conversationId, ensureConversationId, sendMessage, cancel, clearMessages, handleUiEvent, removeUiEvent, filterUiEvents, addUiEvent };
}
