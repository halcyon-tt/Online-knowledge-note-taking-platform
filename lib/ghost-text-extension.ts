import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * AG-UI Phase B：Ghost Text 灵感建议
 *
 * 在光标位置渲染一个灰色斜体的建议文本（widget decoration），
 * 用户按 Tab 接受 → 真实插入到文档；按 Esc 或继续打字 → 清除。
 *
 * 这是个**纯渲染** Extension，不发请求；建议文字由外部（useGhostSuggestion hook）控制：
 *   editor.commands.showGhostSuggestion("建议内容")
 *   editor.commands.acceptGhostSuggestion()  // Tab
 *   editor.commands.clearGhostSuggestion()   // Esc / 用户打字
 */

const ghostKey = new PluginKey<{
  suggestion: string;
  pos: number;
  pending: boolean; // true = 占位状态（"AI 正在思考"），Tab 不应该接受
} | null>("ai-ghost-text");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    ghostText: {
      showGhostSuggestion: (suggestion: string, opts?: { pending?: boolean }) => ReturnType;
      clearGhostSuggestion: () => ReturnType;
      acceptGhostSuggestion: () => ReturnType;
    };
  }
}

export interface GhostTextOptions {
  /** 自定义"提示符"，默认 "↳ "  */
  prefix?: string;
}

export const GhostTextExtension = Extension.create<GhostTextOptions>({
  name: "ghostText",

  addOptions() {
    return { prefix: "↳ " };
  },

  addProseMirrorPlugins() {
    const prefix = this.options.prefix ?? "↳ ";

    return [
      new Plugin<{ suggestion: string; pos: number; pending: boolean } | null>({
        key: ghostKey,
        state: {
          init: () => null,
          apply(tr, old) {
            const meta = tr.getMeta(ghostKey) as
              | { type: "show"; suggestion: string; pending: boolean }
              | { type: "clear" }
              | undefined;
            if (meta?.type === "show") {
              return {
                suggestion: meta.suggestion,
                pos: tr.selection.from,
                pending: meta.pending,
              };
            }
            if (meta?.type === "clear") {
              return null;
            }
            // 任何文档变化都会清除 ghost（避免位置漂移 + 用户开始打字应该消失）
            if (tr.docChanged) {
              return null;
            }
            // 选区变化（光标移动）也清除
            if (old && tr.selectionSet && tr.selection.from !== old.pos) {
              return null;
            }
            return old;
          },
        },
        props: {
          decorations(state) {
            const data = this.getState(state);
            if (!data || !data.suggestion) return DecorationSet.empty;
            const span = document.createElement("span");
            span.className = data.pending
              ? "ai-ghost-text ai-ghost-text-pending"
              : "ai-ghost-text";
            span.textContent = `${prefix}${data.suggestion}`;
            span.setAttribute("data-ai-ghost", "");
            return DecorationSet.create(state.doc, [
              Decoration.widget(data.pos, span, { side: 1 }),
            ]);
          },
          // Tab 接受 / Esc 清除；pending 占位不响应 Tab（只能 Esc 取消）
          handleKeyDown(view, event) {
            const data = ghostKey.getState(view.state);
            if (!data || !data.suggestion) return false;
            if (event.key === "Tab" && !data.pending) {
              event.preventDefault();
              view.dispatch(
                view.state.tr
                  .insertText(data.suggestion, data.pos)
                  .setMeta(ghostKey, { type: "clear" }),
              );
              return true;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              view.dispatch(view.state.tr.setMeta(ghostKey, { type: "clear" }));
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      showGhostSuggestion:
        (suggestion: string, opts?: { pending?: boolean }) =>
        ({ view }) => {
          if (!suggestion || !suggestion.trim()) return false;
          view.dispatch(
            view.state.tr.setMeta(ghostKey, {
              type: "show",
              suggestion: suggestion.trim(),
              pending: opts?.pending ?? false,
            }),
          );
          return true;
        },
      clearGhostSuggestion:
        () =>
        ({ view }) => {
          view.dispatch(view.state.tr.setMeta(ghostKey, { type: "clear" }));
          return true;
        },
      acceptGhostSuggestion:
        () =>
        ({ view }) => {
          const data = ghostKey.getState(view.state);
          if (!data || !data.suggestion || data.pending) return false;
          view.dispatch(
            view.state.tr
              .insertText(data.suggestion, data.pos)
              .setMeta(ghostKey, { type: "clear" }),
          );
          return true;
        },
    };
  },
});
