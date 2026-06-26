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

export type AgentStreamEvent =
  | { type: "start"; id: string }
  | { type: "text"; content: string }
  | { type: "tool_call"; id: string; tool: string; args: unknown }
  | { type: "tool_result"; id: string; result: unknown }
  | { type: "requires_confirmation"; id: string; action: string; payload: unknown }
  | { type: "error"; message: string }
  | { type: "done" };

export interface AgentChatRequest {
  message: string;
  conversationId?: string;
  noteContext?: {
    noteId?: number;
    title?: string;
    content?: string;
  };
}

export type WorkflowName = "search-summarize" | "organize-suggest" | "polish-check" | "search-draft";

export type WorkflowStreamEvent = AgentStreamEvent | { type: "step"; step: string; status: "running" | "done" | "error" };

export interface WorkflowRequest {
  workflow: WorkflowName;
  payload: Record<string, unknown>;
}
