import type { AiErrorResponse, PolishRequest, PolishResponse } from "@/types/ai";

async function postJson<TResponse>(
  path: string,
  body: unknown,
  signal?: AbortSignal
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
  signal?: AbortSignal
): Promise<PolishResponse> {
  return postJson<PolishResponse>("/api/ai-polish", request, signal);
}
