import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const streamingCursorKey = new PluginKey("ai-streaming-cursor");

/**
 * 在指定位置渲染一个打字机光标 widget。
 * 不依赖 CSS :last-of-type（在 TipTap 中文字可能被拆为多个 span，那个选择器不可靠）。
 *
 * 由 editor-tools 的 stream_edit_note_text_delta 在每次 append 后调用
 * `editor.commands.setStreamingCursor(pos)`；finish 时调用 `clearStreamingCursor()`。
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    aiStreamingCursor: {
      setStreamingCursor: (pos: number) => ReturnType;
      clearStreamingCursor: () => ReturnType;
    };
  }
}

export const AiStreamingCursor = Extension.create({
  name: "aiStreamingCursor",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: streamingCursorKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(streamingCursorKey) as
              | { type: "set"; pos: number }
              | { type: "clear" }
              | undefined;
            if (meta?.type === "set") {
              const cursor = document.createElement("span");
              cursor.className = "ai-streaming-cursor";
              cursor.setAttribute("data-ai-streaming-cursor", "");
              // side: 1 让 widget 排在 pos 处的文字之后
              return DecorationSet.create(tr.doc, [
                Decoration.widget(meta.pos, cursor, { side: 1 }),
              ]);
            }
            if (meta?.type === "clear") {
              return DecorationSet.empty;
            }
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setStreamingCursor:
        (pos: number) =>
        ({ view }) => {
          view.dispatch(
            view.state.tr.setMeta(streamingCursorKey, { type: "set", pos }),
          );
          return true;
        },
      clearStreamingCursor:
        () =>
        ({ view }) => {
          view.dispatch(
            view.state.tr.setMeta(streamingCursorKey, { type: "clear" }),
          );
          return true;
        },
    };
  },
});
