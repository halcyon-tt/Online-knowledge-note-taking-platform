"use client";

import { useState, useRef, useCallback } from "react";
import { agentChatStream } from "@/lib/ai-client";
import type { AgentStreamEvent, UiEvent, FrontendToolName } from "@/types/ai";
import { executeEditorTool, hasEditorTool } from "@/lib/editor-bridge";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: { id: string; tool: string; args: unknown; result?: unknown; done?: boolean }[];
  requiresConfirmation?: { id: string; action: string; payload: unknown };
  uiEvents?: UiEvent[];
}

export function useAgentStream() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  const sendMessage = useCallback(async (text: string, noteContext?: { noteId?: number; title?: string; content?: string }) => {
    if (!text.trim() || isLoading) return;
    setError(null);

    const userMsg: AgentMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = `assistant_${Date.now()}`;
    const assistantMsg: AgentMessage = { id: assistantId, role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    setIsLoading(true);
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await agentChatStream(
        { message: text, noteContext },
        (event: AgentStreamEvent) => {
          if (abort.signal.aborted) return;

          if (event.type === "ui") {
            handleUiEvent(event, assistantId);
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
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [isLoading, handleUiEvent]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
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

  return { messages, isLoading, error, sendMessage, cancel, clearMessages, handleUiEvent, removeUiEvent, filterUiEvents, addUiEvent };
}
