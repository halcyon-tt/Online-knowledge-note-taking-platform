import type { Editor } from "@tiptap/react";
import { setPreviewRange as storePreviewRange, getPreviewRange } from "@/lib/editor-bridge";

export interface RegisteredEditorTool {
  name: string;
  description: string;
  execute: (args: Record<string, unknown>) => unknown;
}

export function registerDefaultEditorTools(editor: Editor): RegisteredEditorTool[] {
  return [
    {
      name: "insertAtCursor",
      description: "在光标位置插入文本",
      execute: (args) => editor.commands.insertContent(String(args.text ?? "")),
    },
    {
      name: "replaceSelection",
      description: "替换当前选中的文本",
      execute: (args) => editor.chain().focus().insertContent(String(args.text ?? "")).run(),
    },
    {
      name: "replaceRange",
      description: "替换指定范围的文本",
      execute: (args) => {
        const from = Number(args.from ?? 0);
        const to = Number(args.to ?? 0);
        const text = String(args.text ?? "");
        return editor.commands.insertContentAt({ from, to }, text);
      },
    },
    {
      name: "highlightRange",
      description: "高亮指定范围的文本",
      execute: (args) => {
        const from = Number(args.from ?? 0);
        const to = Number(args.to ?? 0);
        return editor.chain().focus().setTextSelection({ from, to }).run();
      },
    },
    {
      name: "scrollTo",
      description: "滚动到指定行",
      execute: (args) => {
        const pos = Number(args.pos ?? 0);
        const tr = editor.state.tr.scrollIntoView();
        editor.view.dispatch(tr);
        const coords = editor.view.coordsAtPos(pos);
        if (coords) window.scrollTo({ top: coords.top - 100, behavior: "smooth" });
        return true;
      },
    },
    {
      name: "insertPreviewText",
      description: "以光影效果插入预览文本（可在编辑器内编辑）",
      execute: (args) => {
        const existing = getPreviewRange();
        if (existing) {
          editor.commands.deleteRange({ from: existing.from, to: existing.to });
          storePreviewRange(null);
        }
        const text = String(args.text ?? "");
        if (!text) return null;
        const from = editor.state.selection.from;
        editor.commands.insertContent(text);
        const to = editor.state.selection.from;
        if (to - from <= 0) return null;
        const markType = editor.state.schema.marks.preview;
        if (markType) {
          const tr = editor.state.tr.addMark(from, to, markType.create());
          editor.view.dispatch(tr);
        }
        storePreviewRange({ from, to });
        return { from, to };
      },
    },
    {
      name: "acceptPreview",
      description: "接受光影预览内容（去除高亮）",
      execute: () => {
        const range = getPreviewRange();
        if (!range) return false;
        storePreviewRange(null);
        const markType = editor.state.schema.marks.preview;
        if (markType) {
          const tr = editor.state.tr.removeMark(0, editor.state.doc.content.size, markType);
          editor.view.dispatch(tr);
        }
        return true;
      },
    },
    {
      name: "discardPreview",
      description: "拒绝光影预览内容（删除内容）",
      execute: () => {
        const range = getPreviewRange();
        if (!range) return false;
        storePreviewRange(null);
        editor.chain().focus().setTextSelection(range.to).deleteRange({ from: range.from, to: range.to }).run();
        return true;
      },
    },
  ];
}
