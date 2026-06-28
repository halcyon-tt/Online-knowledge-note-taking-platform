import { Mark } from "@tiptap/core";

export interface AiStreamingMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    aiStreamingMark: {
      setAiStreaming: () => ReturnType;
      unsetAiStreaming: () => ReturnType;
    };
  }
}

/**
 * 标记正在被 AI 流式生成的文本范围。
 * 配合 globals.css 里的 .ai-streaming 样式做蓝色脉动 + 末尾打字机光标动效。
 *
 * 与 AiEditMark 的关系：
 * - AiStreamingMark：实时生成中（蓝色脉动）
 * - AiEditMark：刚生成完成的反馈（绿色淡出）
 * - tool-stream-delta 期间：加 AiStreamingMark
 * - tool-call-end 时：移除 AiStreamingMark，给整段加 AiEditMark
 */
export const AiStreamingMark = Mark.create<AiStreamingMarkOptions>({
  name: "aiStreaming",

  addOptions() {
    return { HTMLAttributes: {} };
  },

  parseHTML() {
    return [{ tag: "span[data-ai-streaming]" }];
  },

  renderHTML({ HTMLAttributes }) {
    // 同时给 class（受 globals.css 控制）和 inline style（兜底，防 CSS 没加载）
    return [
      "span",
      {
        "data-ai-streaming": "",
        class: "ai-streaming",
        style:
          "background-color: rgba(59, 130, 246, 0.4); box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.7); border-radius: 3px; padding: 1px 2px; animation: aiStreamingPulse 1.2s ease-in-out infinite;",
        ...HTMLAttributes,
      },
      0,
    ];
  },

  addCommands() {
    return {
      setAiStreaming:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      unsetAiStreaming:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name, { extendEmptyMarkRange: true }),
    };
  },
});
