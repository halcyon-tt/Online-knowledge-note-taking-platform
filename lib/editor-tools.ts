import type { Editor } from "@tiptap/react";
import {
  setPreviewRange as storePreviewRange,
  getPreviewRange,
  getLockedSelection,
  setLockedSelection,
} from "@/lib/editor-bridge";

// 给指定范围加 AiEdit 高亮 mark，2.8 秒后移除。CSS 动画负责淡出。
function flashAiEdit(editor: Editor, from: number, to: number) {
  if (to <= from) return;
  const markType = editor.state.schema.marks.aiEdit;
  if (!markType) return;
  editor.view.dispatch(
    editor.state.tr.addMark(from, to, markType.create()),
  );
  // 用一个时间稍长的 timeout 等 CSS 动画跑完再移除 mark，避免突变
  window.setTimeout(() => {
    try {
      const docSize = editor.state.doc.content.size;
      const safeTo = Math.min(to, docSize);
      if (safeTo <= from) return;
      editor.view.dispatch(
        editor.state.tr.removeMark(from, safeTo, markType),
      );
    } catch {
      // editor 可能已 unmount
    }
  }, 2800);
}

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
    {
      name: "edit_note_text",
      description:
        "AG-UI 编辑器修改分发器：根据 args.operation 调度到 insertAtCursor / replaceSelection / replaceRange。" +
        "存在锁定选区时优先用锁定范围，避免编辑器失焦导致 selection 丢失。",
      execute: (args) => {
        const operation = String(args.operation ?? "");
        const text = String(args.text ?? "");
        const locked = getLockedSelection();

        // 如果 operation 缺失或不识别，且确实有 text + 锁定选区，自动 fallback 为 replaceRange(locked)
        const isUnknownOp =
          operation !== "insertAtCursor" &&
          operation !== "replaceSelection" &&
          operation !== "replaceRange";

        if (isUnknownOp && text && locked) {
          const oldText = editor.state.doc.textBetween(locked.from, locked.to, " ");
          editor.commands.insertContentAt(
            { from: locked.from, to: locked.to },
            text,
          );
          flashAiEdit(editor, locked.from, locked.from + text.length);
          setLockedSelection(null);
          return {
            applied: true,
            operation: "replaceRange-fallback",
            from: locked.from,
            to: locked.to,
            oldText,
            newText: text,
            originalOperation: operation || "(empty)",
          };
        }

        switch (operation) {
          case "insertAtCursor": {
            if (locked) {
              editor.commands.insertContentAt(locked.from, text);
              flashAiEdit(editor, locked.from, locked.from + text.length);
              return { applied: true, operation, insertedAt: locked.from, usedLocked: true, newText: text };
            }
            const insertPos = editor.state.selection.from;
            editor.commands.insertContent(text);
            flashAiEdit(editor, insertPos, insertPos + text.length);
            return { applied: true, operation, insertedAt: insertPos, newText: text };
          }
          case "replaceSelection": {
            const { from: curFrom, to: curTo } = editor.state.selection;
            const range =
              locked ?? (curFrom !== curTo ? { from: curFrom, to: curTo } : null);
            if (range) {
              const oldText = editor.state.doc.textBetween(range.from, range.to, " ");
              editor.commands.insertContentAt({ from: range.from, to: range.to }, text);
              flashAiEdit(editor, range.from, range.from + text.length);
              if (locked) setLockedSelection(null);
              return { applied: true, operation, from: range.from, to: range.to, usedLocked: !!locked, oldText, newText: text };
            }
            const insertPos = editor.state.selection.from;
            editor.commands.insertContent(text);
            flashAiEdit(editor, insertPos, insertPos + text.length);
            return { applied: true, operation, note: "no selection, inserted at cursor", insertedAt: insertPos, newText: text };
          }
          case "replaceRange": {
            const from = Number(args.from ?? 0);
            const to = Number(args.to ?? from);
            const oldText = editor.state.doc.textBetween(from, to, " ");
            editor.commands.insertContentAt({ from, to }, text);
            flashAiEdit(editor, from, from + text.length);
            if (locked && locked.from === from && locked.to === to) {
              setLockedSelection(null);
            }
            return { applied: true, operation, from, to, oldText, newText: text };
          }
          default:
            return {
              applied: false,
              operation: operation || "(empty)",
              reason: `unknown operation, received args keys: ${Object.keys(args).join(",")}`,
            };
        }
      },
    },
  ];
}
