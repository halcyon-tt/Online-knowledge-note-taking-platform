import { Mark } from "@tiptap/core";

export interface PreviewMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    previewMark: {
      setPreview: () => ReturnType;
      unsetPreview: () => ReturnType;
    };
  }
}

export const PreviewMark = Mark.create<PreviewMarkOptions>({
  name: "preview",

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {};
  },

  parseHTML() {
    return [{ tag: "span[data-preview-ghost]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", { "data-preview-ghost": "", class: "preview-ghost", ...HTMLAttributes }, 0];
  },

  addCommands() {
    return {
      setPreview:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      unsetPreview:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name, { extendEmptyMarkRange: true }),
    };
  },
});
