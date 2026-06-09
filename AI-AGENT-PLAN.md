
# AI Agent 接入方案

## 架构总览

```
┌─────────────────────────────────────────────────┐
│                  编辑器 (TipTap)                  │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ / 命令菜单│  │ 选中文本  │  │  AI 聊天面板  │  │
│  │  Suggestion│  │ 浮动菜单  │  │   侧边栏     │  │
│  └────┬────┘  └────┬─────┘  └──────┬────────┘  │
│       │            │               │            │
│       ▼            ▼               ▼            │
│  ┌─────────────────────────────────────────┐    │
│  │         Agent Harness (SDK)             │    │
│  │  useAgent() hook — 统一调用入口         │    │
│  │  · 管理请求状态 (loading/error/stream)  │    │
│  │  · 解析 SSE 流，逐块推回 UI             │    │
│  │  · 支持取消/重试                        │    │
│  └────────────────┬────────────────────────┘    │
└───────────────────┼─────────────────────────────┘
                    │ POST /api/agent (SSE)
                    ▼
┌─────────────────────────────────────────────────┐
│              API Layer                           │
│                                                  │
│  POST /api/agent                                  │
│  ├─ 接收: { messages, context, tools? }          │
│  ├─ 响应: text/event-stream (SSE)                │
│  └─ 认证检查 → 路由到 Harness                     │
│                                                  │
│  POST /api/agent/tools/search-notes               │
│  POST /api/agent/tools/get-note                   │
│  POST /api/agent/tools/update-note                │
│  POST /api/agent/tools/create-note                │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│           Agent Harness (Server)                 │
│                                                  │
│  orchestrator.ts                                  │
│  ├─ 解析用户意图 (分类器/LLM)                     │
│  ├─ 路由到对应 Agent                              │
│  └─ 管理 Agent 调用链                             │
│                                                  │
│  Tool Registry                                    │
│  ├─ 注册工具 (名称, 描述, 参数 schema)             │
│  ├─ Function Calling 循环                         │
│  │   1. LLM 返回 tool_call                        │
│  │   2. 执行工具函数                              │
│  │   3. 把结果喂回 LLM                            │
│  │   4. LLM 返回最终回答                          │
│  └─ 边执行边通过 SSE 推流                         │
│                                                  │
│  Agents:                                          │
│  ├─ AgentChat      — 自由对话, 自主选工具         │
│  ├─ AgentPolish    — 润色/改写, 只读+写          │
│  ├─ AgentSummary   — 摘要笔记库                  │
│  ├─ AgentReview    — 审核批注                    │
│  └─ AgentWorkflow  — 多步编排 (检索→改写→审核)   │
└─────────────────────────────────────────────────┘
```

---

## 1. Agent Harness (SDK)

### 前端 Hook

`hooks/useAgent.ts`

```typescript
interface AgentHookReturn {
  send: (input: { text: string; context?: AgentContext }) => void
  cancel: () => void
  stream: string        // 累积的流式文本
  chunks: string[]      // 逐块, 可逐字渲染
  isLoading: boolean
  error: string | null
  toolCalls: ToolCall[] // 工具调用记录, 可展示给用户
}

function useAgent(options?: {
  onChunk?: (chunk: string) => void
  onToolCall?: (tool: ToolCall) => void
  onError?: (err: Error) => void
}): AgentHookReturn
```

### 关键设计

- **SSE 协议**：每条消息的格式为 `data: { type: "text" | "tool_call" | "tool_result" | "done", content: ... }\n\n`
- **取消机制**：用 `AbortController` 终止 fetch
- **重试**：自动重试 3 次（指数退避）

---

## 2. 命令菜单 (Slash Command)

`components/editor/slash-menu.tsx`

```typescript
// 用 TipTap Extension 实现
// 监听 "/" 字符输入 → 弹出建议列表

const COMMANDS = [
  { id: "polish",     label: "润色",      icon: Sparkles,  action: openPolishDialog },
  { id: "summarize",  label: "总结",      icon: Book,      action: summarizeSelection },
  { id: "translate",  label: "翻译",      icon: Languages, action: translateSelection },
  { id: "continue",   label: "续写",      icon: PenLine,   action: continueWriting },
  { id: "review",     label: "审核批注",  icon: Search,    action: reviewSelection },
]
```

**实现方式**: 用 `@tiptap/extension-suggestion` 或自己手动监听 input 事件 + 浮层组件（用现有的 Popover/Dialog 组件）。

---

## 3. 服务端 Harness

### 核心流程

`app/api/agent/harness.ts`

```
POST /api/agent 接收:
  { messages, context: { noteId?, noteContent?, allNotes? }, tools?: string[] }

Step 1:  意图识别 (可选, 用于路由到特定 Agent)
         用分类 prompt 判断: 润色 / 搜索 / 总结 / 自由对话

Step 2:  构建 Messages (含 system prompt + 工具定义)
         system prompt 里注入:
           - 用户笔记上下文
           - 可用工具列表 (JSON schema)
           - 角色指令

Step 3:  LLM 调用循环 (Function Calling)
         while (true) {
           response = await llm.chat(messages, { tools, stream: true })
           if (response.choices[0].finish_reason === "stop") break
           if (response.choices[0].finish_reason === "tool_calls") {
             for (tool_call of response.choices[0].message.tool_calls) {
               result = toolRegistry.execute(tool_call)
               messages.push({ role: "tool", tool_call_id, content: result })
               yield `data: { type: "tool_result", ... }\n\n`
             }
           }
         }

Step 4:  SSE 流式返回
         yield `data: { type: "text", content: "..." }\n\n`
         yield `data: { type: "done" }\n\n`
```

### Tool Registry

`app/api/agent/tools/registry.ts`

```typescript
interface ToolDefinition {
  name: string
  description: string
  parameters: JSONSchema
  execute: (args: any, context: AgentContext) => Promise<string>
}

const toolRegistry = new Map<string, ToolDefinition>()

register(new SearchNotesTool())   // 搜索笔记
register(new GetNoteTool())       // 获取单篇笔记
register(new UpdateNoteTool())    // 修改笔记
register(new CreateNoteTool())    // 新建笔记
register(new ListTagsTool())      // 获取标签
register(new DeleteNoteTool())    // 删除笔记
register(new WebSearchTool())     // 联网搜索 (可选)
```

每个工具持有一个 `execute()` 方法，内部调用 Supabase/localStorage，返回 JSON 字符串。

---

## 4. 流式输出 (SSE)

### 服务端

```typescript
// app/api/agent/route.ts
export async function POST(req: NextRequest) {
  const { messages, context, tools } = await req.json()
  const harness = new AgentHarness({ context })

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (data: any) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      send({ type: "start" })

      for await (const event of harness.run(messages, tools)) {
        send(event)
      }

      send({ type: "done" })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
```

### 前端订阅

```typescript
// hooks/useAgent.ts 内部
const response = await fetch("/api/agent", { ... })
const reader = response.body!.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const lines = decoder.decode(value).split("\n")
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue
    const data = JSON.parse(line.slice(6))
    // 根据 data.type 分别处理: text / tool_call / tool_result / done
  }
}
```

---

## 5. 多 Agent 编排

### 编排器

`app/api/agent/orchestrator.ts`

```typescript
type AgentName = "chat" | "polish" | "summary" | "review" | "workflow"

class AgentHarness {
  private tools: ToolRegistry
  private context: AgentContext

  async *run(messages: Message[], tools?: string[]): AsyncGenerator<SSEEvent> {
    // 1. 意图分类 (可选, 快速通道)
    const intent = await this.classifyIntent(messages)
    if (intent === "polish") {
      yield* this.runAgent("polish", messages)
      return
    }

    // 2. Function Calling 循环
    yield* this.runWithTools(messages, tools || this.tools.getAll())
  }

  // 运行特定 Agent (简化版, 不需要 FC)
  async *runAgent(name: AgentName, messages: Message[]) { ... }

  // 通用 FC 循环
  async *runWithTools(messages: Message[], tools: ToolDef[]) { ... }

  // 意图分类 (只需一次小模型调用)
  private async classifyIntent(msgs: Message[]): Promise<AgentName | null> { ... }
}
```

### Workflow Agent (多步编排)

当用户说 "帮我润色这段，然后检查语法错误，最后总结要点"：

```
Step 1: 意图分解
        LLM 将用户请求拆为 [polish, review, summary]
Step 2: 顺序执行
        polish_text = AgentPolish.run(text)
        yield polish_text
        review_result = AgentReview.run(polish_text)
        yield review_result
        summary = AgentSummary.run(polish_text)
        yield summary
Step 3: 组装最终结果返回
```

---

## 6. 目录结构总览

```
app/api/agent/
├── route.ts                    # SSE 入口, 认证, 路由到 harness
├── harness.ts                  # AgentHarness 核心类 (FC 循环 + 流)
├── orchestrator.ts             # 意图识别 + 多步编排
├── tools/                      # Tool implementations
│   ├── registry.ts             # 工具注册表
│   ├── search-notes.ts         # 搜索笔记
│   ├── get-note.ts             # 获取单篇笔记
│   ├── update-note.ts          # 更新笔记内容
│   ├── create-note.ts          # 新建笔记
│   └── web-search.ts           # 联网搜索 (可选)
├── agents/
│   ├── polish.ts               # 润色 agent (无需 FC)
│   ├── summary.ts              # 摘要 agent
│   ├── review.ts               # 审核 agent
│   └── workflow.ts             # 多步编排 agent

components/editor/
├── slash-menu.tsx              # / 命令菜单组件
├── floating-menu.tsx           # 选中文本浮动工具栏
├── agent-chat-panel.tsx        # 侧边栏 AI 聊天面板

hooks/
├── useAgent.ts                 # Agent SDK (前端)
├── useSlashCommands.ts         # 命令菜单状态管理
└── useStreamReader.ts          # SSE 流读取 (通用)

types/
└── agent.ts                    # Agent 相关类型定义
```

---

## 7. 类型定义

`types/agent.ts`

```typescript
// SSE 事件
export type SSEEvent =
  | { type: "text";   content: string }
  | { type: "tool_call";  tool: string; args: any; id: string }
  | { type: "tool_result"; id: string; result: string }
  | { type: "error";  message: string }
  | { type: "done" }

// 工具定义
export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, any> // JSON Schema
  execute(args: any, ctx: AgentContext): Promise<string>
}

// Agent 上下文
export interface AgentContext {
  userId?: string
  noteId?: string
  noteContent?: string
  allNotes?: { id: string; title: string; snippet: string }[]
}

// 前端消息
export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "tool"
  content: string
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  id: string
  tool: string
  args: any
  result?: string
}
```

---

## 8. 实施顺序

| 阶段 | 内容 | 预计文件数 |
|------|------|-----------|
| **Phase 1** | SSE 流式输出 + `useAgent` hook | 3 |
| **Phase 2** | Tool Registry + Function Calling | 6 |
| **Phase 3** | 多 Agent + Orchestrator | 4 |
| **Phase 4** | / 命令菜单 + 浮动菜单 | 2 |
| **Phase 5** | 侧边栏 Agent 聊天面板 | 2 |

每个阶段都是可独立交付的，不需要全部做完才能用。
