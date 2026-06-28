import { type NextRequest } from "next/server";

const NEST_API_BASE = process.env.NEST_API_BASE_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get("authorization");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const nestResponse = await fetch(
      `${NEST_API_BASE}/api/agent/workflow/stream`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      },
    );

    if (!nestResponse.ok) {
      const errorData = await nestResponse.json().catch(() => null);
      return new Response(JSON.stringify(errorData ?? { error: { code: "AI_PROVIDER_FAILED", message: "转发请求失败" } }), {
        status: nestResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const headersOut = new Headers();
    headersOut.set("Content-Type", "text/event-stream");
    headersOut.set("Cache-Control", "no-cache");
    headersOut.set("Connection", "keep-alive");

    return new Response(nestResponse.body, {
      status: 200,
      headers: headersOut,
    });
  } catch (error) {
    console.error("Workflow stream buffer error:", error);
    return new Response(
      JSON.stringify({ error: { code: "AI_PROVIDER_FAILED", message: "AI 服务暂时不可用" } }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
