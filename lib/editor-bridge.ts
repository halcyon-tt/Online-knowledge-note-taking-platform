type EditorToolExecutor = (args: Record<string, unknown>) => unknown;

const tools = new Map<string, EditorToolExecutor>();
let editorRef: { current: unknown } | null = null;

export function registerEditorTool(name: string, executor: EditorToolExecutor) {
  tools.set(name, executor);
}

export function unregisterEditorTool(name: string) {
  tools.delete(name);
}

export function clearEditorTools() {
  tools.clear();
  editorRef = null;
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
}

let previewRange: { from: number; to: number } | null = null;

export function setPreviewRange(range: { from: number; to: number } | null) {
  previewRange = range;
}

export function getPreviewRange(): { from: number; to: number } | null {
  return previewRange;
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
