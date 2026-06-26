import { type NextRequest, NextResponse } from "next/server";

const NEST_API_BASE = process.env.NEST_API_BASE_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nestResponse = await fetch(`${NEST_API_BASE}/api/ai/polish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await nestResponse.json();

    if (!nestResponse.ok) {
      return NextResponse.json(data, { status: nestResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("AI polish buffer error:", error);
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
