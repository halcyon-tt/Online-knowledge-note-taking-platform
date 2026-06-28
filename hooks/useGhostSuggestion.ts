"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { suggestInline } from "@/lib/ai-client";

interface UseGhostSuggestionOptions {
  editor: Editor | null;
  /** 是否启用建议（开关）。默认关闭。 */
  enabled: boolean;
  /** 停留多久后请求建议（ms）。默认 1500。 */
  debounceMs?: number;
  /** 当前笔记 ID（可选，给后端做更精准建议） */
  noteId?: number;
  /** 光标前的上下文字数（默认 600） */
  contextBeforeChars?: number;
  /** 光标后的上下文字数（默认 300） */
  contextAfterChars?: number;
}

/**
 * Ghost Text 协调 hook：
 * - 监听 editor 的 selectionUpdate 和 update
 * - 用户停留超过 debounceMs 后，提取光标前后上下文
 * - 调 /api/ai/suggest-inline 拿建议
 * - 调 editor.commands.showGhostSuggestion 渲染
 *
 * 自动清理时机由 GhostTextExtension 内部处理（光标移动 / docChanged / Tab / Esc 都会清掉）。
 */
export function useGhostSuggestion({
  editor,
  enabled,
  debounceMs = 1000,
  noteId,
  contextBeforeChars = 600,
  contextAfterChars = 300,
}: UseGhostSuggestionOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastRequestKeyRef = useRef<string>("");

  useEffect(() => {
    if (!editor || !enabled) {
      // 关闭时清掉所有 ghost
      editor?.commands.clearGhostSuggestion();
      return;
    }

    const fetchSuggestion = async () => {
      // 选区不为光标位置（用户在选文字）→ 不出建议
      const { from, to } = editor.state.selection;
      if (from !== to) return;

      // 检查光标是否在代码块内（避免破坏代码）
      const $pos = editor.state.doc.resolve(from);
      for (let depth = $pos.depth; depth > 0; depth--) {
        const nodeType = $pos.node(depth).type.name;
        if (nodeType === "codeBlock" || nodeType === "code") return;
      }

      const docSize = editor.state.doc.content.size;
      const beforeStart = Math.max(0, from - contextBeforeChars);
      const afterEnd = Math.min(docSize, from + contextAfterChars);
      const contextBefore = editor.state.doc.textBetween(beforeStart, from, "\n");
      const contextAfter = editor.state.doc.textBetween(from, afterEnd, "\n");

      // 上下文太短不请求（避免空白文档触发）
      if (contextBefore.trim().length < 8) return;

      // 同位置 + 同 contextBefore 不重复请求
      const requestKey = `${from}:${contextBefore.slice(-100)}`;
      if (requestKey === lastRequestKeyRef.current) return;
      lastRequestKeyRef.current = requestKey;

      // 取消上一个未完成请求
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      // 立即显示"AI 正在想"占位（pending 模式：Tab 不会接受它），让用户停下来就有反馈
      if (editor.isFocused) {
        editor.commands.showGhostSuggestion("AI 正在思考…", { pending: true });
      }

      try {
        const { suggestion } = await suggestInline(
          { contextBefore, contextAfter, noteId },
          abort.signal,
        );
        if (abort.signal.aborted) return;
        // 真实建议回来：替换占位（即使为空也清掉占位）
        if (suggestion && editor.isFocused) {
          const { from: nowFrom, to: nowTo } = editor.state.selection;
          if (nowFrom === nowTo && nowFrom === from) {
            editor.commands.showGhostSuggestion(suggestion);
            return;
          }
        }
        // 空建议或位置变了：清掉占位
        editor.commands.clearGhostSuggestion();
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        editor.commands.clearGhostSuggestion();
      }
    };

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fetchSuggestion, debounceMs);
    };

    editor.on("selectionUpdate", schedule);
    editor.on("update", schedule);

    return () => {
      editor.off("selectionUpdate", schedule);
      editor.off("update", schedule);
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [editor, enabled, debounceMs, noteId, contextBeforeChars, contextAfterChars]);
}
