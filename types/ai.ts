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
