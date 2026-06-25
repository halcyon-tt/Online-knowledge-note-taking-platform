import { apiRequest } from "./client";

export const aiSearch = (query: string) =>
  apiRequest<{ answer: string; relatedNotes: number[] }>("/ai/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
