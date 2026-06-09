# AI 笔记能力前后端拆分实施计划

> **给后续执行 Agent 的要求：** 实施本计划时，必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐项执行。任务使用 `- [ ]` 复选框跟踪。

**目标：** 将 AI 笔记能力拆成清晰的后端交付计划和前端接入计划，避免一边改前端一边改后端造成接口反复。

**总体架构：** 当前 Next.js 仓库只做前端体验和轻量 Buffer/BFF 层；NestJS 仓库负责 AI 能力、LangGraph Agent 编排、状态机、工具权限、审计、限流和持久化写入。所有阶段都先冻结接口契约，再实现后端，后端验收通过后再接前端。

**技术栈：** Next.js 16、React 19、TypeScript、TipTap、Supabase/localStorage 双模式、NestJS、LangGraph.js、SSE、豆包/OpenAI 兼容 Chat Completions。

---

## 一、执行原则

1. **契约先行。**
   每个能力先定义请求、响应、错误码和验收样例。契约冻结前不写前端 UI。

2. **后端先交付，前端后接入。**
   每个能力按“接口契约 -> NestJS 实现 -> 后端验收 -> Next.js Buffer -> 前端 UI”的顺序推进。

3. **当前 Next.js 项目不承载 Agent 编排。**
   Next.js API Routes 只允许做轻量 Buffer：鉴权透传、参数规范化、请求转发、错误格式统一。LangGraph、Tool Registry、Workflow 状态机必须放 NestJS。

4. **写操作必须用户确认。**
   AI 可以生成建议，不能自动覆盖、删除或创建正式笔记。前端负责展示确认，NestJS 负责校验确认动作是否合法。

5. **简单 AI 能力不用 LangGraph。**
   润色、单篇整理这类确定性能力先用普通 NestJS Service；跨笔记、多工具、多步状态机再用 LangGraph。

---

## 二、阶段门禁

| 阶段 | 先做 | 等待门禁 | 后做 |
|---|---|---|---|
| 0 | 接口契约冻结 | 契约文档评审通过 | 后端 Phase 1 |
| 1 | NestJS `/ai/polish` | curl/e2e 验收通过 | Next.js 润色 UI 接入 |
| 2 | NestJS `/ai/organize-note` | 结构化 JSON 验收通过 | Next.js 当前笔记整理面板 |
| 3 | NestJS `/ai/search-notes` | 跨笔记返回相关笔记和草稿 | Next.js 搜索/草稿确认 UI |
| 4 | NestJS `/agent/chat/stream` | SSE + 工具权限验收通过 | Next.js Agent 流式面板 |
| 5 | NestJS Workflow Agent | 多步状态机验收通过 | Next.js 工作流确认 UI |

**硬性规则：** 如果某阶段后端没有通过验收，前端只允许写 mock UI，不允许接真实接口，也不允许修改业务保存逻辑。

---

## 三、仓库职责

### 当前 Next.js 仓库

只负责：

- TipTap 编辑器交互。
- 选区读取和选区范围保存。
- AI 弹窗、面板、结果预览。
- 用户确认：替换、插入、复制、创建草稿。
- Next.js API Routes 作为 Buffer/BFF 层转发到 NestJS。
- localStorage/Supabase 前端状态同步。

不负责：

- LangGraph 编排。
- Tool Registry。
- 多步 Agent 状态机。
- LLM Provider 封装。
- 复杂权限判断。
- 审计和限流。

### NestJS 后端仓库

负责：

- `/ai/*` 普通 AI 接口。
- `/agent/*` LangGraph Agent 接口。
- LLM Provider 封装。
- Prompt 编排。
- Tool Registry。
- 用户权限校验。
- 写操作确认校验。
- 审计日志和限流。
- 后续数据库读写。

---

## 四、统一接口约定

### 1. Next.js Buffer 路由约定

当前仓库中的 Next.js API Routes 命名保持面向前端：

```text
POST /api/ai/polish
POST /api/ai/organize-note
POST /api/ai/search-notes
POST /api/agent/chat/stream
POST /api/agent/workflow/stream
```

它们转发到 NestJS：

```text
POST {NEST_API_BASE_URL}/ai/polish
POST {NEST_API_BASE_URL}/ai/organize-note
POST {NEST_API_BASE_URL}/ai/search-notes
POST {NEST_API_BASE_URL}/agent/chat/stream
POST {NEST_API_BASE_URL}/agent/workflow/stream
```

环境变量：

```text
NEST_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_AI_FEATURES=polish,organize,search,agent-stream
```

### 2. 错误响应约定

所有接口失败时返回：

```json
{
  "error": {
    "code": "AI_PROVIDER_FAILED",
    "message": "AI 服务暂时不可用，请稍后重试"
  }
}
```

前端只展示 `message`，日志可记录 `code`。

### 3. 写操作约定

AI 接口默认只返回建议：

```json
{
  "proposalId": "p_123",
  "suggestedChange": {}
}
```

真正写入必须走确认接口或前端已有保存逻辑。Phase 1-3 优先由前端应用变更，NestJS 不直接写库。

---

## 五、后端计划：NestJS 仓库

> 这部分在 NestJS 项目中执行，不在当前仓库直接实现。

### Backend Phase 0：契约落地

**目标：** 在 NestJS 仓库建立 AI 契约、错误格式、测试样例。

**文件建议：**

- 新建：`src/ai/contracts/ai-contracts.ts`
- 新建：`src/ai/contracts/ai-errors.ts`
- 新建：`src/ai/fixtures/*.json`

- [ ] 定义 `AiErrorCode`

```typescript
export type AiErrorCode =
  | "VALIDATION_FAILED"
  | "AI_PROVIDER_FAILED"
  | "AI_INVALID_JSON"
  | "UNAUTHORIZED"
  | "RATE_LIMITED";
```

- [ ] 定义通用错误响应

```typescript
export interface AiErrorResponse {
  error: {
    code: AiErrorCode;
    message: string;
  };
}
```

- [ ] 为 `/ai/polish`、`/ai/organize-note`、`/ai/search-notes` 准备请求/响应 fixture。

**验收：**

```bash
npm run test
npm run build
```

### Backend Phase 1：普通润色接口

**目标：** 交付 `POST /ai/polish`，不使用 LangGraph。

请求：

```json
{
  "text": "需要润色的文本",
  "style": "fluent",
  "locale": "zh-CN",
  "noteId": "optional-note-id"
}
```

响应：

```json
{
  "polishedText": "润色后的文本",
  "style": "fluent",
  "usage": {
    "inputTokens": 120,
    "outputTokens": 80
  }
}
```

**文件建议：**

- 新建：`src/ai/ai.module.ts`
- 新建：`src/ai/ai.controller.ts`
- 新建：`src/ai/ai.service.ts`
- 新建：`src/ai/dto/polish-note.dto.ts`
- 新建：`src/ai/providers/llm-provider.ts`
- 新建：`src/ai/providers/doubao.provider.ts`

**验收：**

- [ ] 空文本返回 `400`。
- [ ] 非法 style 返回 `400`。
- [ ] Provider 失败返回 `502` 和统一错误格式。
- [ ] 成功返回 `polishedText`。
- [ ] 不写数据库。

### Backend Phase 2：当前笔记整理接口

**目标：** 交付 `POST /ai/organize-note`，不使用 LangGraph。

请求：

```json
{
  "noteId": "optional-note-id",
  "title": "当前标题",
  "content": "当前笔记内容",
  "existingTags": ["React", "性能"]
}
```

响应：

```json
{
  "title": "建议标题",
  "summary": "摘要",
  "tags": ["React", "性能优化"],
  "outline": [
    { "level": 2, "text": "问题背景" }
  ],
  "actionItems": [
    { "text": "补充案例", "checked": false }
  ]
}
```

**验收：**

- [ ] 返回严格 JSON。
- [ ] 非法 JSON 转换为 `502 AI_INVALID_JSON`。
- [ ] 超长内容返回 `400`。
- [ ] 不写数据库。

### Backend Phase 3：跨笔记搜索和草稿

**目标：** 交付 `POST /ai/search-notes`，先不用 LangGraph。

响应必须包含：

- `answer`
- `relatedNotes`
- 可选 `draftNote`

**验收：**

- [ ] 能返回相关笔记。
- [ ] 草稿不落库。
- [ ] 请求体中的笔记数量和内容长度有上限。
- [ ] Provider 失败有统一错误。

### Backend Phase 4：LangGraph Agent Chat

**目标：** 交付 `POST /agent/chat/stream`，使用 LangGraph.js。

Agent 能力：

- `search_notes`
- `get_note`
- `list_tags`
- `propose_note_update`

Phase 4 禁止：

- `apply_note_update`
- `delete_note`
- 自动创建正式笔记

SSE 事件：

```typescript
export type AgentStreamEvent =
  | { type: "start"; id: string }
  | { type: "text"; content: string }
  | { type: "tool_call"; id: string; tool: string; args: unknown }
  | { type: "tool_result"; id: string; result: unknown }
  | { type: "requires_confirmation"; id: string; action: string; payload: unknown }
  | { type: "error"; message: string }
  | { type: "done" };
```

**验收：**

- [ ] SSE 可以持续输出。
- [ ] 工具调用可见。
- [ ] 只读工具自动执行。
- [ ] 写工具只生成 `requires_confirmation`。
- [ ] 用户取消请求后后端停止执行。

### Backend Phase 5：Workflow Agent

**目标：** 用 LangGraph 实现多步状态机。

允许工作流：

1. 搜索笔记 -> 总结 -> 返回答案。
2. 获取当前笔记 -> 整理 -> 生成插入建议。
3. 润色选区 -> 检查语法 -> 生成替换建议。
4. 搜索笔记 -> 生成草稿 -> 请求用户确认创建。

禁止：

- 自动删除。
- 未预览直接覆盖。
- 默认联网搜索。
- 后台定时 Agent。

---

## 六、前端计划：当前 Next.js 仓库

> 这部分只在对应后端阶段验收后执行。

### Frontend Phase 0：清理和 Buffer 基础

**目标：** 当前仓库只留下必要 AI 前端基础，不混入锁文件和无关格式化。

**保留：**

- `components/ai-polish-dialog.tsx`
- `app/api/ai-polish/route.ts`，后续迁移为 Buffer
- `components/note-editor.tsx` 中 AI 润色入口
- `hooks/useEditorShortcuts.ts` 中 `Ctrl+Shift+P`

**不保留：**

- `package-lock.json` 的 registry/lockfileVersion 大改
- `hooks/useEditorOperations.ts` 的无关注释/格式改动

### Frontend Phase 1：接入润色

**等待门禁：** Backend Phase 1 已通过 curl/e2e 验收。

**文件：**

- 新建：`types/ai.ts`
- 新建：`lib/ai-client.ts`
- 修改：`app/api/ai-polish/route.ts` 或迁移到 `app/api/ai/polish/route.ts`
- 修改：`components/ai-polish-dialog.tsx`
- 修改：`components/note-editor.tsx`

**任务：**

- [ ] 新增 `PolishRequest`、`PolishResponse` 类型。
- [ ] 新增 `polishText()` client。
- [ ] Next.js API Route 转发到 `NEST_API_BASE_URL /ai/polish`。
- [ ] 打开弹窗时保存选区 `{ from, to }`，确认时使用保存的范围。
- [ ] 弹窗补齐 `复制`、`插入下方`、`重新生成`、`确认替换`。
- [ ] 关闭弹窗时取消请求。

**验收：**

```bash
npm run lint
npx tsc --noEmit
npm run test -- --run
npm run build
```

### Frontend Phase 2：当前笔记整理

**等待门禁：** Backend Phase 2 已验收。

**文件：**

- 新建：`components/ai-note-organize-panel.tsx`
- 修改：`types/ai.ts`
- 修改：`lib/ai-client.ts`
- 修改：`components/note-editor.tsx`
- 新建：`app/api/ai/organize-note/route.ts`

**任务：**

- [ ] 新增 `OrganizeNoteRequest`、`OrganizeNoteResponse`。
- [ ] 新增 `organizeNote()` client。
- [ ] 新增 Next.js Buffer 路由。
- [ ] 新增整理面板，展示标题、摘要、标签、大纲、待办。
- [ ] 每类建议单独应用。

### Frontend Phase 3：跨笔记整理

**等待门禁：** Backend Phase 3 已验收。

**文件：**

- 修改：`components/ai-search-dialog.tsx`
- 修改：`app/dashboard/ai-chat/page.tsx`
- 修改：`types/ai.ts`
- 修改：`lib/ai-client.ts`
- 新建：`app/api/ai/search-notes/route.ts`

**任务：**

- [ ] AI 搜索改为通过 Buffer 调 NestJS。
- [ ] 展示 `relatedNotes`。
- [ ] 展示 `draftNote` 预览。
- [ ] 用户确认后才调用当前前端已有创建笔记逻辑。

### Frontend Phase 4：Agent 流式面板

**等待门禁：** Backend Phase 4 已验收。

**文件：**

- 新建：`hooks/useAgentStream.ts`
- 新建：`components/agent-chat-panel.tsx`
- 新建：`app/api/agent/chat/stream/route.ts`

**任务：**

- [ ] Next.js Buffer 转发 SSE。
- [ ] 前端解析 `AgentStreamEvent`。
- [ ] 展示文本流、工具调用、工具结果。
- [ ] `requires_confirmation` 显示确认 UI，但不自动执行。

### Frontend Phase 5：Workflow UI

**等待门禁：** Backend Phase 5 已验收。

**任务：**

- [ ] 展示工作流步骤。
- [ ] 每一步可取消。
- [ ] 最终变更必须预览。
- [ ] 写操作必须二次确认。

---

## 七、当前仓库的即时处理建议

### 应保留

- `components/ai-polish-dialog.tsx`
  - 属于 Frontend Phase 1 基础。

- `app/api/ai-polish/route.ts`
  - 暂时可作为兼容入口，后续改成 Buffer。

- `components/note-editor.tsx` 的 AI 润色入口
  - 方向正确，但必须修复选区保存问题。

- `hooks/useEditorShortcuts.ts` 的 `Ctrl+Shift+P`
  - 对润色入口有帮助。

### 应撤销

- `package-lock.json`
  - 当前变化会把 lockfile 从 v3 降为 v1，并引入大量 registry 变更。
  - 与 AI 演进无关。

- `hooks/useEditorOperations.ts`
  - 当前变化只是注释和格式调整。
  - 与 AI 演进无关。

### 暂缓

- `README.md`
  - 可以保留为草稿，但不建议和 Phase 1 一起提交。
  - 等功能验收后再更新，避免文档提前声明未完成能力。

- `AI-AGENT-PLAN.md`
  - 可作为旧蓝图参考。
  - 后续实施以本文档为准，因为本文档明确了 NestJS 与 Next.js 边界。

---

## 八、最终验收标准

- [ ] 后端接口契约先于前端开发冻结。
- [ ] 每个后端阶段都有独立 e2e/curl 验收。
- [ ] 前端只在对应后端阶段验收后接入真实接口。
- [ ] Next.js 只做 UI 和 Buffer，不做 Agent 编排。
- [ ] NestJS 承担 LangGraph、工具、状态机、权限、限流、审计。
- [ ] 所有写操作都需要用户确认。
- [ ] 当前仓库不包含无关 lockfile 或格式化改动。

