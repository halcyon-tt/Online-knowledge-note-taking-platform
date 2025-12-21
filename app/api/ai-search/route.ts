import { type NextRequest, NextResponse } from "next/server";

// 豆包 AI API 配置
const DOUBAO_API_URL =
  "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

interface NoteInput {
  id: string;
  title: string;
  content: string;
}

// 优化：智能提取中文和英文关键词
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];

  // 1. 提取英文单词（2个字符以上）
  const englishWords = text.match(/[a-zA-Z]{2,}/g) || [];
  keywords.push(...englishWords.map(w => w.toLowerCase()));

  // 2. 提取中文字符（使用Unicode范围匹配中文）
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const cleanText = chineseChars.join('');

  if (cleanText.length === 0) {
    return [...new Set(keywords)];
  }

  // 3. 提取中文2字词
  for (let i = 0; i < cleanText.length - 1; i++) {
    keywords.push(cleanText.slice(i, i + 2));
  }

  // 4. 提取中文3字词
  for (let i = 0; i < cleanText.length - 2; i++) {
    keywords.push(cleanText.slice(i, i + 3));
  }

  // 5. 提取中文4字词
  for (let i = 0; i < cleanText.length - 3; i++) {
    keywords.push(cleanText.slice(i, i + 4));
  }

  return [...new Set(keywords)]; // 去重
}

// 优化：计算笔记与查询的相关性分数
function calculateRelevanceScore(note: NoteInput, query: string): number {
  const queryLower = query.toLowerCase();
  const titleLower = note.title.toLowerCase();
  const contentLower = note.content.replace(/<[^>]*>/g, "").toLowerCase();

  let score = 0;

  // 1. 标题完全匹配查询 - 最高分
  if (titleLower.includes(queryLower)) {
    score += 100;
  }

  // 2. 标题被查询包含
  if (titleLower.length >= 2 && queryLower.includes(titleLower)) {
    score += 50;
  }

  // 3. 提取关键词进行匹配
  const queryKeywords = extractKeywords(query);
  const titleKeywords = extractKeywords(note.title);
  const contentKeywords = extractKeywords(note.content);

  // 标题关键词匹配（权重高）
  queryKeywords.forEach((keyword) => {
    if (keyword.length < 2) return;

    if (titleLower.includes(keyword)) {
      if (keyword.length >= 4) {
        score += 15;
      } else if (keyword.length === 3) {
        score += 10;
      } else {
        score += 5;
      }
    }

    // 内容关键词匹配（权重低）
    if (contentLower.includes(keyword)) {
      if (keyword.length >= 4) {
        score += 3;
      } else if (keyword.length === 3) {
        score += 2;
      } else {
        score += 1;
      }
    }
  });

  // 4. 反向匹配：笔记标题关键词出现在查询中
  titleKeywords.forEach((keyword) => {
    if (keyword.length >= 2 && queryLower.includes(keyword)) {
      score += keyword.length >= 3 ? 8 : 5;
    }
  });

  return score;
}

// 新函数：提取笔记中最相关的句子
function extractTopRelevantSentences(
  content: string,
  query: string,
  maxSentences = 10
): { sentence: string; relevanceScore: number }[] {
  const cleanContent = content.replace(/<[^>]*>/g, "").trim();

  // 调试日志：记录清理后的内容
  console.log("[句子提取] 内容清理", {
    原始长度: content.length,
    清理后长度: cleanContent.length,
    清理后预览: cleanContent.slice(0, 200),
  });

  // 如果内容为空，返回空数组
  if (!cleanContent) {
    console.log("[句子提取] 警告：清理后内容为空");
    return [];
  }

  // 提取查询关键词
  const queryKeywords = extractKeywords(query).filter(k => k.length >= 2);
  console.log("[句子提取] 查询关键词", {
    关键词: queryKeywords,
    数量: queryKeywords.length,
  });

  // 分割句子
  const sentenceDelimiters = /[。！？.!\?\n]+/;
  const sentences = cleanContent.split(sentenceDelimiters)
    .map(s => s.trim())
    .filter(s => s.length > 0); // 移除空句子

  console.log("[句子提取] 句子分割结果", {
    总句子数: sentences.length,
    前5句预览: sentences.slice(0, 5).map(s => s.slice(0, 50)),
  });

  // 如果没有句子，返回空数组
  if (sentences.length === 0) {
    console.log("[句子提取] 警告：没有找到任何句子");
    return [];
  }

  // 如果句子数量少于等于maxSentences，直接返回所有句子
  if (sentences.length <= maxSentences) {
    console.log("[句子提取] 句子数量较少，返回全部");
    return sentences.map(sentence => ({
      sentence,
      relevanceScore: 1
    }));
  }

  // 计算每个句子的相关性分数
  const scoredSentences = sentences.map(sentence => {
    const sentenceLower = sentence.toLowerCase();
    let relevanceScore = 0;

    // 计算关键词匹配分数
    queryKeywords.forEach(keyword => {
      if (sentenceLower.includes(keyword)) {
        // 根据关键词长度给予权重
        if (keyword.length >= 4) {
          relevanceScore += 3;
        } else if (keyword.length === 3) {
          relevanceScore += 2;
        } else {
          relevanceScore += 1;
        }
      }
    });

    // 计算查询词在句子中的密度
    const sentenceLength = sentenceLower.length;
    const matchedChars = queryKeywords.reduce((total, keyword) => {
      return total + (sentenceLower.match(new RegExp(keyword, 'g')) || []).length * keyword.length;
    }, 0);

    if (sentenceLength > 0) {
      relevanceScore += (matchedChars / sentenceLength) * 10;
    }

    return {
      sentence,
      relevanceScore
    };
  });

  // 按相关性分数排序，取前maxSentences个
  const topSentences = scoredSentences
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxSentences)
    .filter(item => item.relevanceScore > 0); // 只保留有相关性的句子

  console.log("[句子提取] 评分完成", {
    有分数的句子数: scoredSentences.filter(s => s.relevanceScore > 0).length,
    最终返回数: topSentences.length,
    Top3分数: topSentences.slice(0, 3).map(s => ({
      分数: s.relevanceScore.toFixed(2),
      内容预览: s.sentence.slice(0, 50),
    })),
  });

  return topSentences;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { query, notes } = await request.json();

    // 日志：记录请求信息
    console.log("[AI搜索] 收到请求", {
      query,
      notesCount: notes.length,
      timestamp: new Date().toISOString(),
    });

    // 从环境变量获取 API Key
    const apiKey = process.env.DOUBAO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "请在 Vercel 项目设置中配置 DOUBAO_API_KEY 环境变量" },
        { status: 500 }
      );
    }

    // 预筛选最相关的5篇笔记
    const MAX_NOTES = 5;
    const MAX_SENTENCES_PER_NOTE = 10;

    // 提取查询关键词用于日志
    const queryKeywords = extractKeywords(query);
    console.log("[AI搜索] 查询关键词提取", {
      原始查询: query,
      提取的关键词: queryKeywords.slice(0, 20),
      关键词总数: queryKeywords.length,
    });

    // 计算所有笔记的相关性分数并排序
    const rankedNotes = notes
      .map((note: NoteInput) => ({
        ...note,
        relevanceScore: calculateRelevanceScore(note, query),
      }))
      .sort((a: { relevanceScore: number; }, b: { relevanceScore: number; }) => b.relevanceScore - a.relevanceScore)
      .slice(0, MAX_NOTES);

    console.log("[AI搜索] 预筛选完成", {
      原始笔记数: notes.length,
      筛选后笔记数: rankedNotes.length,
      Top5详细相关度: rankedNotes.slice(0, 5).map((n: { title: any; relevanceScore: any; id: string; }) => ({
        title: n.title,
        score: n.relevanceScore,
        id: n.id.slice(0, 8) + "...",
      })),
    });

    // 为每篇笔记提取最相关的句子
    const noteExtracts = rankedNotes.map((note: { content: string; id: any; title: any; }, index: number) => {
      const relevantSentences = extractTopRelevantSentences(
        note.content,
        query,
        MAX_SENTENCES_PER_NOTE
      );

      console.log(`[AI搜索] 笔记"${note.title}"的句子提取结果`, {
        原始句子总数: note.content.split(/[。！？.!\?\n]+/).filter((s: string) => s.trim().length > 0).length,
        提取的相关句子数: relevantSentences.length,
        相关句子详情: relevantSentences.map(s => ({
          句子: s.sentence.length > 50 ? s.sentence.substring(0, 50) + "..." : s.sentence,
          分数: s.relevanceScore
        }))
      });

      return {
        index: index + 1,
        id: note.id,
        title: note.title,
        relevantSentences,
        totalSentences: relevantSentences.length,
      };
    });

    // 构建笔记上下文，包含最相关的句子
    const notesContext = noteExtracts
      .map((note: { relevantSentences: any[]; index: any; id: any; title: any; }) => {
        const sentencesText = note.relevantSentences
          .map((s: { sentence: any; }, i: number) => `${i + 1}. ${s.sentence}`)
          .join("\n");

        return `【笔记${note.index}】ID: ${note.id}\n标题：${note.title}\n最相关段落：\n${sentencesText}`;
      })
      .join("\n\n");

    // 构建系统提示词
    const systemPrompt = `你是一个专业的智能笔记分析助手，擅长从用户的笔记库中提取和整合信息。

核心任务：
1. **深度分析**：仔细阅读提供的所有笔记段落，充分挖掘相关信息
2. **详细回答**：基于笔记内容给出完整、详细的回答，不要过于简短
3. **信息整合**：如果多个笔记包含相关信息，要综合整理后输出
4. **来源标注**：引用笔记时使用【笔记X：标题】格式
5. **ID标记**：回答末尾用[RELATED_NOTES:id1,id2,id3]标注所有相关笔记ID

回答原则：
- 如果笔记中有相关内容，务必详细展开说明，不要只给一句话
- 包含定义、特点、用途、举例等多个方面
- 使用结构化格式（标题、列表、段落）组织内容
- 保持专业性和准确性，不要编造笔记中没有的信息
- 如果笔记内容不足以回答问题，明确说明缺少哪些信息

输出格式：
- 使用Markdown格式
- 用## 作为主标题
- 用- 或数字列表展示要点
- 适当使用**加粗**强调关键词`;

    // 构建用户提示词
    const userPrompt = `## 笔记库内容

以下是${rankedNotes.length}篇与查询最相关的笔记，已提取每篇笔记中最相关的前${MAX_SENTENCES_PER_NOTE}个段落：

${notesContext}

---

## 用户查询
${query}

请基于上述笔记段落，给出详细、完整的回答。如果笔记中有相关内容，请充分展开说明。回答末尾附上所有相关笔记的ID。`;

    console.log("----------============================----------");
    // 日志：Token使用估算
    const estimatedInputTokens = Math.ceil(
      (systemPrompt.length + userPrompt.length) / 2.5
    );
    console.log("[AI搜索] Token估算", {
      系统提示长度: systemPrompt.length,
      用户提示长度: userPrompt.length,
      预估输入tokens: estimatedInputTokens,
      最大输出tokens: 1000,
      预估总tokens: estimatedInputTokens + 1000,
    });

    // 日志：打印完整的AI请求内容（合并为一次输出，避免被截断）
    console.log(
      "[AI搜索1] ===== 完整AI请求 =====\n" +
      "[AI搜索2] System Prompt:\n" +
      systemPrompt +
      "\n\n[AI搜索3] User Prompt:\n" +
      userPrompt +
      "\n[AI搜索4] ===== 请求结束 ====="
    );

    // 调用豆包 AI API
    const apiStartTime = Date.now();
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
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const apiDuration = Date.now() - apiStartTime;
      console.error("[AI搜索] 豆包 API 错误", {
        status: response.status,
        error: errorText,
        duration: `${apiDuration}ms`,
        query,
      });
      return NextResponse.json(
        {
          error: `AI 服务请求失败 (${response.status})：请检查 API Key 是否正确`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const apiDuration = Date.now() - apiStartTime;
    let aiResponse = data.choices?.[0]?.message?.content || "未能获取到回答";

    // 日志：API响应信息
    console.log("[AI搜索] API响应成功", {
      API耗时: `${apiDuration}ms`,
      响应长度: aiResponse.length,
      实际使用tokens: data.usage || "未提供",
    });

    // 提取相关笔记ID
    const relatedNotesMatch = aiResponse.match(/\[RELATED_NOTES:([^\]]+)\]/);
    let relatedNotes: Array<{ id: string; title: string; snippet: string }> = [];

    if (relatedNotesMatch) {
      const noteIds = relatedNotesMatch[1]
        .split(",")
        .map((id: string) => id.trim());

      // 从回答中移除标记
      aiResponse = aiResponse.replace(/\[RELATED_NOTES:[^\]]+\]/, "").trim();

      console.log("[AI搜索] 提取相关笔记ID", {
        提取的ID列表: noteIds,
        数量: noteIds.length,
      });

      // 构建相关笔记列表
      relatedNotes = noteIds
        .map((id: string) => {
          const note = notes.find((n: NoteInput) => n.id === id);
          if (note) {
            // 提取前3个最相关的句子作为摘要
            const topSentences = extractTopRelevantSentences(note.content, query, 3);
            const snippet = topSentences.map(s => s.sentence).join("。");

            return {
              id: note.id,
              title: note.title,
              snippet: snippet.length > 100 ? snippet.substring(0, 100) + "..." : snippet,
            };
          }
          return null;
        })
        .filter(Boolean);
    }

    const totalDuration = Date.now() - startTime;

    // 日志：请求完成
    console.log("[AI搜索] 请求完成", {
      总耗时: `${totalDuration}ms`,
      API耗时占比: `${((apiDuration / totalDuration) * 100).toFixed(1)}%`,
      相关笔记数: relatedNotes.length,
      回答长度: aiResponse.length,
    });

    return NextResponse.json({
      answer: aiResponse,
      relatedNotes: relatedNotes.length > 0 ? relatedNotes : undefined,
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error("[AI搜索] 请求失败", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${totalDuration}ms`,
    });
    return NextResponse.json(
      {
        error: `AI 搜索服务异常：${error instanceof Error ? error.message : "未知错误"}`,
      },
      { status: 500 }
    );
  }
}