"use client";

import { useState, useRef, useCallback } from "react";
import { agentChatStream } from "@/lib/ai-client";
import type { AgentStreamEvent, AgentChatRequest } from "@/types/ai";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{ tool: string; args: unknown; result?: unknown }>;
  requiresConfirmation?: {
    id: string;
    action: string;
    payload: unknown;
  };
}

export function useAgentStream() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const currentTextRef = useRef("");
  const currentToolCallsRef = useRef<Array<{ tool: string; args: unknown; result?: unknown }>>([]);
  const currentConfirmationRef = useRef<{ id: string; action: string; payload: unknown } | null>(null);

  const sendMessage = useCallback(async (message: string, context?: AgentChatRequest["noteContext"]) => {
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    const userMsg: AgentMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    currentTextRef.current = "";
    currentToolCallsRef.current = [];
    currentConfirmationRef.current = null;

    try {
      await agentChatStream(
        { message, noteContext: context },
        (event: AgentStreamEvent) => {
          switch (event.type) {
            case "text":
              currentTextRef.current += event.content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.id.startsWith("stream_")) {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...last, content: currentTextRef.current };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: `stream_${Date.now()}`,
                    role: "assistant",
                    content: currentTextRef.current,
                  },
                ];
              });
              break;

            case "tool_call":
              currentToolCallsRef.current.push({
                tool: event.tool,
                args: event.args,
              });
              break;

            case "tool_result":
              const toolIdx = currentToolCallsRef.current.findIndex(
                (tc) => tc.tool === event.id || !tc.result,
              );
              if (toolIdx >= 0) {
                currentToolCallsRef.current[toolIdx] = {
                  ...currentToolCallsRef.current[toolIdx],
                  result: event.result,
                };
              }
              break;

            case "requires_confirmation":
              currentConfirmationRef.current = {
                id: event.id,
                action: event.action,
                payload: event.payload,
              };
              break;

            case "error":
              setError(event.message);
              break;

            case "done":
              break;
          }
        },
        abortController.signal,
      );

      // Finalize the current assistant message
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...last,
            content: currentTextRef.current || last.content,
            toolCalls: currentToolCallsRef.current.length > 0 ? [...currentToolCallsRef.current] : undefined,
            requiresConfirmation: currentConfirmationRef.current ?? undefined,
          };
          return updated;
        }
        return prev;
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Agent 请求失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    currentTextRef.current = "";
    currentToolCallsRef.current = [];
    currentConfirmationRef.current = null;
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    cancel,
    clearMessages,
  };
}
