import type { SearchNotesResponse } from "@/types/ai";

export const aiSearch = async (
  query: string,
): Promise<{ answer: string; relatedNotes: number[] }> => {
  const response = await fetch("/api/ai/search-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, notes: [] }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message || "AI 搜索请求失败");
  }

  const data: SearchNotesResponse = await response.json();
  return {
    answer: data.answer,
    relatedNotes: data.relatedNotes.map((n) => n.id),
  };
};
