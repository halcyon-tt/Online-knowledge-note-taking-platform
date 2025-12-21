import { type NextRequest, NextResponse } from "next/server";

// 豆包 AI API 配置
const DOUBAO_API_URL =
  "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

interface NoteInput {
  id: string;
  title: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, notes } = await request.json();

    // 从环境变量获取 API Key
    const apiKey = process.env.DOUBAO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "请在 Vercel 项目设置中配置 DOUBAO_API_KEY 环境变量" },
        { status: 500 }
      );
    }

    // 构建笔记内容作为上下文（增加内容长度以支持更好的摘要）
    const notesContext = notes
      .map((note: NoteInput, index: number) => {
        const cleanContent = note.content
          .replace(/<[^>]*>/g, "")
          .slice(0, 1000);
        return `【笔记${index + 1}】
ID: ${note.id}
标题：${note.title}
内容：${cleanContent}`;
      })
      .join("\n\n---\n\n");

    const systemPrompt = `你是一个强大的智能笔记助手，具备以下能力：

## 核心能力
1. **智能检索**：根据用户查询找出语义相关的笔记
2. **内容摘要**：对单个或多个笔记进行精炼摘要
3. **信息聚合**：将多个笔记的相关信息整合成结构化的知识

## 智能识别用户意图
- 当用户提问"总结/摘要/概括..."时 → 执行摘要任务
- 当用户提问"整理/聚合/汇总/归纳..."时 → 执行聚合任务
- 当用户提问"查找/搜索/有哪些..."时 → 执行检索任务
- 当用户提问开放性问题时 → 综合分析所有笔记后回答

## 回答格式要求
1. 使用中文，简洁明了
2. 结构化输出，使用标题和列表
3. 引用笔记时使用【笔记标题】标注来源
4. 给出相关笔记的ID名称（JSON格式），格式：[RELATED_NOTES:name1，name2]

## 摘要输出格式
当进行摘要时，请按以下结构输出：
- **核心要点**：列出3-5个关键点
- **详细内容**：展开说明
- **相关联系**：与其他笔记的关联（如有）

## 聚合输出格式
当进行聚合时，请按以下结构输出：
- **主题概览**：整体情况说明
- **分类整理**：按类别组织信息
- **关键洞察**：提炼出的重要发现
- **行动建议**：可执行的下一步（如适用）`;

    const userPrompt = `## 用户笔记库（共${notes.length}篇）

${notesContext}

---

## 用户请求
${query}

请根据用户的请求，智能识别意图（检索/摘要/聚合），并给出结构化的回答。
记得在回答末尾附上相关笔记名称：[RELATED_NOTES:name1，name2]`;

    // 调用豆包 AI API
    const response = await fetch(DOUBAO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DOUBAO_MODEL_ID || "doubao-seed-1-6-251015",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000, // 增加 token 限制以支持更长的摘要
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("豆包 API 错误:", errorText);
      return NextResponse.json(
        {
          error: `AI 服务请求失败 (${response.status})：请检查 API Key 是否正确`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    let aiResponse = data.choices?.[0]?.message?.content || "未能获取到回答";

    const relatedNotesMatch = aiResponse.match(/\[RELATED_NOTES:([^\]]+)\]/);
    let relatedNotes: Array<{ id: string; title: string; snippet: string }> =
      [];

    if (relatedNotesMatch) {
      const noteIds = relatedNotesMatch[1]
        .split(",")
        .map((id: string) => id.trim());
      // 从回答中移除标记
      aiResponse = aiResponse.replace(/\[RELATED_NOTES:[^\]]+\]/, "").trim();

      // 构建相关笔记列表
      relatedNotes = noteIds
        .map((id: string) => {
          const note = notes.find((n: NoteInput) => n.id === id);
          if (note) {
            return {
              id: note.id,
              title: note.title,
              snippet:
                note.content.replace(/<[^>]*>/g, "").slice(0, 100) + "...",
            };
          }
          return null;
        })
        .filter(Boolean);
    }

    return NextResponse.json({
      answer: aiResponse,
      relatedNotes: relatedNotes.length > 0 ? relatedNotes : undefined,
    });
  } catch (error) {
    console.error("AI 搜索错误:", error);
    return NextResponse.json(
      {
        error: `AI 搜索服务异常：${error instanceof Error ? error.message : "未知错误"}`,
      },
      { status: 500 }
    );
  }
}
