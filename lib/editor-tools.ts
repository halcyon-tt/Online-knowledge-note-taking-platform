import type { Editor } from "@tiptap/react";
import {
  setPreviewRange as storePreviewRange,
  getPreviewRange,
  getLockedSelection,
  setLockedSelection,
  setStreamingState,
  getStreamingState,
} from "@/lib/editor-bridge";

// 给指定范围加 AiEdit 高亮 mark，2.8 秒后移除。CSS 动画负责淡出。
function flashAiEdit(editor: Editor, from: number, to: number) {
  if (to <= from) return;
  const markType = editor.state.schema.marks.aiEdit;
  if (!markType) return;
  editor.view.dispatch(
    editor.state.tr.addMark(from, to, markType.create()),
  );
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

// 编辑发生后，把光标定位到新文本末尾 + scrollIntoView 让用户看到 AI 改了哪。
// AG-UI Phase D：多步骤可视化的核心——让用户"看见"AI 在编辑器内的操作位置。
function focusAndScrollTo(editor: Editor, pos: number) {
  try {
    const docSize = editor.state.doc.content.size;
    const safePos = Math.max(0, Math.min(pos, docSize));
    editor.view.dispatch(
      editor.state.tr.setSelection(
        // @ts-expect-error TextSelection 类型在 tiptap 中通过 dispatch 间接构造
        editor.state.selection.constructor.near(
          editor.state.doc.resolve(safePos),
        ),
      ),
    );
    editor.commands.scrollIntoView();
  } catch {
    // 静默
  }
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
          focusAndScrollTo(editor, locked.from + text.length);
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
              focusAndScrollTo(editor, locked.from + text.length);
              return { applied: true, operation, insertedAt: locked.from, usedLocked: true, newText: text };
            }
            const insertPos = editor.state.selection.from;
            editor.commands.insertContent(text);
            flashAiEdit(editor, insertPos, insertPos + text.length);
            focusAndScrollTo(editor, insertPos + text.length);
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
              focusAndScrollTo(editor, range.from + text.length);
              if (locked) setLockedSelection(null);
              return { applied: true, operation, from: range.from, to: range.to, usedLocked: !!locked, oldText, newText: text };
            }
            const insertPos = editor.state.selection.from;
            editor.commands.insertContent(text);
            flashAiEdit(editor, insertPos, insertPos + text.length);
            focusAndScrollTo(editor, insertPos + text.length);
            return { applied: true, operation, note: "no selection, inserted at cursor", insertedAt: insertPos, newText: text };
          }
          case "replaceRange": {
            const from = Number(args.from ?? 0);
            const to = Number(args.to ?? from);
            const oldText = editor.state.doc.textBetween(from, to, " ");
            editor.commands.insertContentAt({ from, to }, text);
            flashAiEdit(editor, from, from + text.length);
            focusAndScrollTo(editor, from + text.length);
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
    // ---- AG-UI Phase A：流式打字机插入 ----
    // 由 useAgentStream 拦截 tool-call-start(stream_edit_note_text) 调用
    // 准备插入位置 + 删除旧文（若 replaceRange/replaceSelection）+ 在 editor-bridge 写入 streamingState
    {
      name: "stream_edit_note_text_start",
      description: "[内部] 流式编辑开始：定位插入点，删除旧文，初始化 streamingState",
      execute: (args) => {
        const id = String(args.id ?? "stream-default");
        const operation = String(args.operation ?? "replaceSelection");
        const locked = getLockedSelection();

        let startPos: number;
        let oldText = "";

        if (operation === "replaceRange" && typeof args.from === "number") {
          const from = Number(args.from);
          const to = Number(args.to ?? from);
          oldText = editor.state.doc.textBetween(from, to, " ");
          editor.commands.insertContentAt({ from, to }, "");
          startPos = from;
        } else if (operation === "replaceSelection") {
          const range = locked ?? (() => {
            const { from, to } = editor.state.selection;
            return from !== to ? { from, to, text: "" } : null;
          })();
          if (range) {
            oldText = editor.state.doc.textBetween(range.from, range.to, " ");
            editor.commands.insertContentAt({ from: range.from, to: range.to }, "");
            startPos = range.from;
            if (locked) setLockedSelection(null);
          } else {
            startPos = editor.state.selection.from;
          }
        } else {
          // insertAtCursor
          startPos = locked ? locked.from : editor.state.selection.from;
          if (locked) setLockedSelection(null);
        }

        setStreamingState({ id, startPos, length: 0, oldText, operation });
        return { started: true, id, startPos, oldText, operation };
      },
    },
    {
      name: "stream_edit_note_text_delta",
      description: "[内部] 流式编辑追加 delta：在 streamingState 末尾追加 + 加 aiStreaming mark",
      execute: (args) => {
        const id = String(args.id ?? "");
        const delta = String(args.delta ?? "");
        const state = getStreamingState();
        if (!state || state.id !== id) {
          return { applied: false, reason: "no matching streaming state" };
        }
        const insertAt = state.startPos + state.length;
        const markType = editor.state.schema.marks.aiStreaming;
        editor.commands.insertContentAt(insertAt, delta);
        if (markType) {
          const tr = editor.state.tr.addMark(
            insertAt,
            insertAt + delta.length,
            markType.create(),
          );
          editor.view.dispatch(tr);
        }
        const newLength = state.length + delta.length;
        setStreamingState({ ...state, length: newLength });
        // 移动打字机光标到新末尾 + 滚动可见
        editor.commands.setStreamingCursor(state.startPos + newLength);
        editor.commands.scrollIntoView();
        return { applied: true, id, appendedLength: delta.length };
      },
    },
    {
      name: "stream_edit_note_text_finish",
      description:
        "[内部] 流式编辑结束：移除 aiStreaming mark，换成 aiEdit 绿色淡出",
      execute: (args) => {
        const id = String(args.id ?? "");
        const state = getStreamingState();
        if (!state || state.id !== id) {
          return { finished: false, reason: "no matching streaming state" };
        }
        const from = state.startPos;
        const to = state.startPos + state.length;
        // 清掉打字机光标
        editor.commands.clearStreamingCursor();
        const streamingMark = editor.state.schema.marks.aiStreaming;
        if (streamingMark) {
          editor.view.dispatch(
            editor.state.tr.removeMark(from, to, streamingMark),
          );
        }
        flashAiEdit(editor, from, to);
        const newText = editor.state.doc.textBetween(from, to, " ");
        setStreamingState(null);
        return {
          finished: true,
          id,
          from,
          to,
          oldText: state.oldText,
          newText,
          operation: state.operation,
        };
      },
    },
  ];
}
