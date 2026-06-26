import { describe, expect, it, vi, afterEach } from "vitest";
import { polishText, organizeNote, searchNotes } from "./ai-client";

describe("polishText", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts polish requests and returns normalized polishedText", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ polishedText: "更流畅的文本", style: "fluent" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await polishText({ text: "原始文本", style: "fluent" });

    expect(fetchMock).toHaveBeenCalledWith("/api/ai/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "原始文本", style: "fluent" }),
      signal: undefined,
    });
    expect(result).toEqual({ polishedText: "更流畅的文本", style: "fluent" });
  });

  it("throws the server error message when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({
          error: { code: "AI_PROVIDER_FAILED", message: "AI 服务暂时不可用" },
        }),
      }),
    );

    await expect(
      polishText({ text: "原始文本", style: "fluent" }),
    ).rejects.toThrow("AI 服务暂时不可用");
  });
});

describe("organizeNote", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts organize request to buffer route", async () => {
    const mockResponse = {
      title: "建议标题",
      summary: "摘要",
      tags: ["标签1"],
      outline: [{ level: 2, text: "概述" }],
      actionItems: [{ text: "待办", checked: false }],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await organizeNote({
      title: "当前标题",
      content: "内容",
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/ai/organize-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "当前标题", content: "内容" }),
      signal: undefined,
    });
    expect(result).toEqual(mockResponse);
  });
});

describe("searchNotes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts search request to buffer route", async () => {
    const mockResponse = {
      answer: "回答内容",
      relatedNotes: [{ id: 1, title: "笔记1", relevance: "mentioned" }],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchNotes({
      query: "测试",
      notes: [],
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/ai/search-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "测试", notes: [] }),
      signal: undefined,
    });
    expect(result).toEqual(mockResponse);
  });
});
