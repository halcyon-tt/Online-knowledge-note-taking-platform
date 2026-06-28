import { Mark } from "@tiptap/core";

export interface AiEditMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    aiEditMark: {
      setAiEdit: () => ReturnType;
      unsetAiEdit: () => ReturnType;
    };
  }
}

/**
 * 用于标记 AI 刚刚改动的文本范围。
 * 配合 globals.css 里的 .ai-edit-highlight 样式做 2.5 秒淡出高亮。
 *
 * 与 PreviewMark 的区别：
 * - PreviewMark：用户预览生成内容，可以接受/丢弃
 * - AiEditMark：AI 改动已发生（已落到内容），仅做视觉反馈，自动消失
 */
export const AiEditMark = Mark.create<AiEditMarkOptions>({
  name: "aiEdit",

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {};
  },

  parseHTML() {
    return [{ tag: "span[data-ai-edit]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      {
        "data-ai-edit": "",
        class: "ai-edit-highlight",
        ...HTMLAttributes,
      },
      0,
    ];
  },

  addCommands() {
    return {
      setAiEdit:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      unsetAiEdit:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name, { extendEmptyMarkRange: true }),
    };
  },
});
