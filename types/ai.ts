export type PolishStyle = "fluent" | "professional" | "concise" | "casual" | "academic";

export interface PolishRequest {
  text: string;
  style: PolishStyle;
  locale?: "zh-CN" | "en-US";
  noteId?: string;
}

export interface PolishResponse {
  polishedText: string;
  style: PolishStyle;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface OrganizeNoteRequest {
  noteId?: string;
  title: string;
  content: string;
  existingTags?: string[];
}

export interface OrganizeNoteResponse {
  title: string;
  summary: string;
  tags: string[];
  outline: { level: number; text: string }[];
  actionItems: { text: string; checked: boolean }[];
}

export interface SearchNotesRequest {
  query: string;
  notes: { id: number; title: string; content: string }[];
  maxNotes?: number;
}

export interface SearchNotesResponse {
  answer: string;
  relatedNotes: { id: number; title: string; relevance: string }[];
  draftNote?: { title: string; content: string };
}

export type AiErrorCode =
  | "VALIDATION_FAILED"
  | "AI_PROVIDER_FAILED"
  | "AI_INVALID_JSON"
  | "UNAUTHORIZED"
  | "RATE_LIMITED";

export interface AiErrorResponse {
  error: {
    code: AiErrorCode;
    message: string;
  };
}

export type ToolName = "search_notes" | "get_note" | "list_tags" | "propose_note_update";

export type FrontendToolName =
  | "insertAtCursor" | "replaceRange" | "replaceSelection"
  | "scrollTo" | "highlightRange" | "updateTitle" | "addTags";

export interface UiEvent {
  type: "ui";
  component: string;
  props: Record<string, unknown>;
  id?: string;
}

export type AgentStreamEvent =
  | { type: "run-started"; runId: string; timestamp?: string }
  | { type: "text-delta"; content: string }
  | { type: "tool-call-start"; id: string; tool: string; args: unknown }
  | { type: "tool-call-end"; id: string }
  | { type: "tool-result"; id: string; result: unknown }
  | { type: "tool-stream-delta"; id: string; delta: string }
  | UiEvent
  | { type: "human-in-the-loop"; id: string; action: string; payload: unknown }
  | { type: "error"; message: string }
  | { type: "run-finished"; runId?: string };

export interface AgentChatRequest {
  message: string;
  conversationId?: string;
  noteContext?: {
    noteId?: number;
    title?: string;
    content?: string;
    selection?: { from: number; to: number; text: string };
    scrollPosition?: number;
    visibleRange?: { from: number; to: number };
  };
}

export type WorkflowName = "search-summarize" | "organize-suggest" | "polish-check" | "search-draft";

export type WorkflowStreamEvent = AgentStreamEvent;

export interface WorkflowRequest {
  workflow: WorkflowName;
  payload: Record<string, unknown>;
}
