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

async function postJson<TResponse>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<TResponse> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

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
  const response = await fetch("/api/ai/expand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!response.ok) throw new Error(`Expand failed with status ${response.status}`);
  return response.json();
}

export async function condenseText(text: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch("/api/ai/condense", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!response.ok) throw new Error(`Condense failed with status ${response.status}`);
  return response.json();
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

export async function agentChatStream(
  request: AgentChatRequest,
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch("/api/agent/chat/stream", {
    method: "POST",
    headers,
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Agent request failed with status ${response.status}`);
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
        const event = JSON.parse(trimmed.slice(6)) as AgentStreamEvent;
        onEvent(event);
        if (event.type === "run-finished") return;
      } catch {
        // skip malformed lines
      }
    }
  }
}

export async function workflowStream(
  request: WorkflowRequest,
  onEvent: (event: WorkflowStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch("/api/agent/workflow/stream", {
    method: "POST",
    headers,
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Workflow request failed with status ${response.status}`);
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
        const event = JSON.parse(trimmed.slice(6)) as WorkflowStreamEvent;
        onEvent(event);
        if (event.type === "run-finished") return;
      } catch {
        // skip malformed lines
      }
    }
  }
}
