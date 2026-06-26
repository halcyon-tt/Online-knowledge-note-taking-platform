import { describe, expect, it, vi, afterEach } from "vitest";
import { polishText } from "./ai-client";

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

    expect(fetchMock).toHaveBeenCalledWith("/api/ai-polish", {
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
        json: async () => ({ error: "AI 服务暂时不可用" }),
      })
    );

    await expect(polishText({ text: "原始文本", style: "fluent" })).rejects.toThrow(
      "AI 服务暂时不可用"
    );
  });
});
