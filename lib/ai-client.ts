import type {
  AiErrorResponse,
  PolishRequest,
  PolishResponse,
  OrganizeNoteRequest,
  OrganizeNoteResponse,
  SearchNotesRequest,
  SearchNotesResponse,
} from "@/types/ai";

async function postJson<TResponse>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<TResponse> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
