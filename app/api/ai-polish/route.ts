import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.DOUBAO_API_URL ||
  "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

const STYLE_PROMPTS: Record<string, string> = {
  fluent:
    "请优化以下文本，使其表达更流畅自然，修正语病和不通顺之处，保持原意不变。直接返回优化后的结果，不要加任何解释。",
  professional:
    "请将以下文本改写为专业严谨的书面语风格，使用正式的表达方式，保持信息完整准确。直接返回改写后的结果，不要加任何解释。",
  concise:
    "请精简以下文本，删除冗余内容，保留核心信息，使表达更简洁有力。直接返回精简后的结果，不要加任何解释。",
  casual:
    "请将以下文本改写为平实自然的口语风格，使其读起来像日常对话一样易懂。直接返回改写后的结果，不要加任何解释。",
};

export async function POST(request: NextRequest) {
  try {
    const { text, style = "fluent" } = await request.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "请提供需要润色的文本" }, { status: 400 });
    }

    const apiKey = process.env.DOUBAO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "请在环境变量中配置 DOUBAO_API_KEY" },
        { status: 500 }
      );
    }

    const systemPrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.fluent;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DOUBAO_MODEL_ID || "doubao-seed-1-6-251015",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.6,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI 润色 API 错误:", errorText);
      return NextResponse.json(
        { error: `AI 服务请求失败 (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const polished = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ polished });
  } catch (error) {
    console.error("AI 润色错误:", error);
    return NextResponse.json(
      {
        error: `AI 润色服务异常：${error instanceof Error ? error.message : "未知错误"}`,
      },
      { status: 500 }
    );
  }
}
