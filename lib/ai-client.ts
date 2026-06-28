import type {
  AiErrorResponse,
  PolishRequest,
  PolishResponse,
  OrganizeNoteRequest,
  OrganizeNoteResponse,
  SearchNotesRequest,
  SearchNotesResponse,
  AgentStreamEvent,
  AgentChatRequest,
  WorkflowRequest,
  WorkflowStreamEvent,
} from "@/types/ai";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export class AiUnauthorizedError extends Error {
  constructor(message = "未登录或登录已过期") {
    super(message);
    this.name = "AiUnauthorizedError";
  }
}

function handleUnauthorized() {
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    const redirect = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?redirect=${redirect}`;
  }
}

async function postJson<TResponse>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<TResponse> {
  const response = await fetch(path, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
    signal,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new AiUnauthorizedError();
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (data as AiErrorResponse | null)?.error;
    const message =
      typeof error === "string"
        ? error
        : error?.message || `AI request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as TResponse;
}

export async function expandText(text: string, signal?: AbortSignal): Promise<string> {
  return postJson<string>("/api/ai/expand", { text }, signal);
}

export async function condenseText(text: string, signal?: AbortSignal): Promise<string> {
  return postJson<string>("/api/ai/condense", { text }, signal);
}

export async function polishText(
  request: PolishRequest,
  signal?: AbortSignal,
): Promise<PolishResponse> {
  return postJson<PolishResponse>("/api/ai/polish", request, signal);
}

export async function organizeNote(
  request: OrganizeNoteRequest,
  signal?: AbortSignal,
): Promise<OrganizeNoteResponse> {
  return postJson<OrganizeNoteResponse>(
    "/api/ai/organize-note",
    request,
    signal,
  );
}

export async function searchNotes(
  request: SearchNotesRequest,
  signal?: AbortSignal,
): Promise<SearchNotesResponse> {
  return postJson<SearchNotesResponse>("/api/ai/search-notes", request, signal);
}

export interface SuggestInlineRequest {
  contextBefore: string;
  contextAfter?: string;
  noteId?: number;
}

export interface SuggestInlineResponse {
  suggestion: string;
}

export async function suggestInline(
  request: SuggestInlineRequest,
  signal?: AbortSignal,
): Promise<SuggestInlineResponse> {
  return postJson<SuggestInlineResponse>(
    "/api/ai/suggest-inline",
    request,
    signal,
  );
}

async function streamSse<TEvent>(
  path: string,
  body: unknown,
  onEvent: (event: TEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(path, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
    signal,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new AiUnauthorizedError();
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response body is not readable");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(trimmed.slice(6)) as TEvent;
        onEvent(event);
        if ((event as { type?: string }).type === "run-finished") return;
      } catch {
        // skip malformed lines
      }
    }
  }
}

export async function agentChatStream(
  request: AgentChatRequest,
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamSse<AgentStreamEvent>(
    "/api/agent/chat/stream",
    request,
    onEvent,
    signal,
  );
}

export async function workflowStream(
  request: WorkflowRequest,
  onEvent: (event: WorkflowStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamSse<WorkflowStreamEvent>(
    "/api/agent/workflow/stream",
    request,
    onEvent,
    signal,
  );
}
