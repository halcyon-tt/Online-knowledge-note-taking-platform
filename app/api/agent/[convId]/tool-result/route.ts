import { type NextRequest, NextResponse } from "next/server";

const NEST_API_BASE = process.env.NEST_API_BASE_URL || "http://localhost:3001";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ convId: string }> },
) {
  try {
    const { convId } = await params;
    const body = await request.json();
    const authHeader = request.headers.get("authorization");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authHeader) headers["Authorization"] = authHeader;

    const nestResponse = await fetch(
      `${NEST_API_BASE}/api/agent/${encodeURIComponent(convId)}/tool-result`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      },
    );

    const data = await nestResponse.json().catch(() => null);
    if (!nestResponse.ok) {
      return NextResponse.json(
        data ?? {
          error: { code: "AI_PROVIDER_FAILED", message: "tool-result 回传失败" },
        },
        { status: nestResponse.status },
      );
    }
    return NextResponse.json(data ?? { ok: true });
  } catch (error) {
    console.error("agent tool-result buffer error:", error);
    return NextResponse.json(
      {
        error: {
          code: "AI_PROVIDER_FAILED",
          message: "AI 服务暂时不可用，请稍后重试",
        },
      },
      { status: 502 },
    );
  }
}
