type EditorToolExecutor = (args: Record<string, unknown>) => unknown;

const tools = new Map<string, EditorToolExecutor>();
let editorRef: { current: unknown } | null = null;
type EditorListener = (editor: unknown) => void;
const editorListeners = new Set<EditorListener>();

export function registerEditorTool(name: string, executor: EditorToolExecutor) {
  tools.set(name, executor);
}

export function unregisterEditorTool(name: string) {
  tools.delete(name);
}

export function clearEditorTools() {
  tools.clear();
  editorRef = null;
  editorListeners.forEach((l) => l(null));
}

export function executeEditorTool(name: string, args: Record<string, unknown>): unknown {
  const executor = tools.get(name);
  if (!executor) {
    console.warn(`Editor tool "${name}" not registered`);
    return null;
  }
  return executor(args);
}

export function hasEditorTool(name: string): boolean {
  return tools.has(name);
}

export function storeEditorRef(ref: { current: unknown }) {
  editorRef = ref;
  editorListeners.forEach((l) => l(ref.current));
}

export function getCurrentEditor<T = unknown>(): T | null {
  return (editorRef?.current as T | undefined) ?? null;
}

/**
 * 订阅 editor 实例变更。订阅时立刻用当前 editor 回调一次（可能为 null）。
 * 返回取消订阅函数。
 */
export function subscribeToEditor(listener: EditorListener): () => void {
  editorListeners.add(listener);
  listener(editorRef?.current ?? null);
  return () => {
    editorListeners.delete(listener);
  };
}

let previewRange: { from: number; to: number } | null = null;

export function setPreviewRange(range: { from: number; to: number } | null) {
  previewRange = range;
}

export function getPreviewRange(): { from: number; to: number } | null {
  return previewRange;
}

// "锁定选区"：用户在编辑器选中的文字，即使编辑器失焦（点对话框输入），仍然保留。
// 由 useEditorSync 在 selectionUpdate 且选区长度 >= 1 时写入；
// 由 useAgentStream/AgentChatPanel 在发消息时读取。
type LockedSelection = { from: number; to: number; text: string } | null;
let lockedSelection: LockedSelection = null;
const lockedSelectionListeners = new Set<(s: LockedSelection) => void>();

export function setLockedSelection(s: LockedSelection): void {
  lockedSelection = s;
  lockedSelectionListeners.forEach((l) => l(s));
}

export function getLockedSelection(): LockedSelection {
  return lockedSelection;
}

export function subscribeToLockedSelection(
  listener: (s: LockedSelection) => void,
): () => void {
  lockedSelectionListeners.add(listener);
  listener(lockedSelection);
  return () => {
    lockedSelectionListeners.delete(listener);
  };
}

// 流式编辑状态：被 editor-tools 的 stream_edit_note_text 维护，
// 记录当前正在被 AI 流式生成的范围（startPos + 当前长度）+ 原文（用于撤销）
type StreamingState = {
  id: string;
  startPos: number;
  length: number;
  oldText: string;
  operation: string;
} | null;
let streamingState: StreamingState = null;

export function setStreamingState(s: StreamingState): void {
  streamingState = s;
}

export function getStreamingState(): StreamingState {
  return streamingState;
}

export interface EditorContext {
  selection?: { from: number; to: number; text: string };
  scrollPosition?: number;
}

export function getEditorContext(): EditorContext {
  const editor = editorRef?.current as { state: { selection: { from: number; to: number }; doc: { textBetween: (from: number, to: number, separator: string) => string } }; view: { coordsAtPos: (pos: number) => { top: number } | null } } | undefined;
  if (!editor) return {};
  const { from, to } = editor.state.selection;
  if (from === to) return {};
  const text = editor.state.doc.textBetween(from, to, " ");
  return { selection: { from, to, text } };
}
