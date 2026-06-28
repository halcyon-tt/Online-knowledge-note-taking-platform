"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import {
  setLockedSelection,
  getLockedSelection,
} from "@/lib/editor-bridge";

interface UseEditorSyncOptions {
  editor: Editor | null;
  conversationId: string | null;
  noteRef?: { noteId?: number; title?: string };
  /** debounce 毫秒数，默认 600ms。停留 1.5s 以上才被视为"真的关心这里"。*/
  debounceMs?: number;
  /** 选区长度小于这个值时不更新锁定（避免每次按方向键都触发）。默认 1。*/
  minSelectionLength?: number;
}

interface ContextPayload {
  selection?: { from: number; to: number; text: string };
  contentLength?: number;
  noteRef?: { noteId?: number; title?: string };
}

/**
 * 把编辑器实时状态推送到后端 /agent/{convId}/context。
 * Agent 在下一次 chat 时会读取最新 context 注入 system prompt。
 *
 * 关键设计：
 * - 选中文字（长度 >= minSelectionLength）时，把选区**锁定**到 editor-bridge。
 *   即使用户点 AI 对话框失焦，锁定的选区仍然保留，后端 context 也持续推送这个锁定值。
 * - 光标移动（from===to）不会清除锁定。要清除得用 `setLockedSelection(null)`。
 * - debounce 600ms：避免每按方向键就发请求。
 * - 重复 payload 不推送（lastPayloadRef 去重）。
 * - 失败静默：context 同步不影响主流程，仅 console.warn。
 */
export function useEditorSync({
  editor,
  conversationId,
  noteRef,
  debounceMs = 600,
  minSelectionLength = 1,
}: UseEditorSyncOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPayloadRef = useRef<string>("");

  useEffect(() => {
    if (!editor || !conversationId) return;

    const pushContext = async (payload: ContextPayload) => {
      const serialized = JSON.stringify(payload);
      if (serialized === lastPayloadRef.current) return;
      lastPayloadRef.current = serialized;
      try {
        const token = typeof window !== "undefined"
          ? localStorage.getItem("access_token")
          : null;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        await fetch(
          `/api/agent/${encodeURIComponent(conversationId)}/context`,
          {
            method: "POST",
            headers,
            body: serialized,
          },
        );
      } catch (err) {
        console.warn("[useEditorSync] context push failed:", err);
      }
    };

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const { from, to } = editor.state.selection;
        const contentLength = editor.state.doc.content.size;

        // 1) 选区长度 >= 阈值 → 更新锁定选区
        if (to - from >= minSelectionLength) {
          const text = editor.state.doc.textBetween(from, to, " ");
          setLockedSelection({ from, to, text });
        }

        // 2) 推送 payload：优先用锁定选区（编辑器失焦也保留），没锁定时才看当前选区
        const locked = getLockedSelection();
        const payload: ContextPayload = {
          contentLength,
          noteRef,
        };
        if (locked) {
          payload.selection = locked;
        } else if (to - from >= minSelectionLength) {
          const text = editor.state.doc.textBetween(from, to, " ");
          payload.selection = { from, to, text };
        }
        void pushContext(payload);
      }, debounceMs);
    };

    editor.on("selectionUpdate", schedule);
    editor.on("update", schedule);
    // 挂载时立刻推一次，让 agent 在第一次对话前就有文档大小可用
    schedule();

    return () => {
      editor.off("selectionUpdate", schedule);
      editor.off("update", schedule);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [editor, conversationId, noteRef, debounceMs, minSelectionLength]);
}
