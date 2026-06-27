# AG-UI + 生成式 UI 完整接入计划

> **给后续执行 Agent 的要求：** 实施本计划时，必须使用 `superpowers:executing-plans`，按任务逐项执行。任务使用 `- [ ]` 复选框跟踪。

**核心价值：** 这不是把 `text` 改成 `text-delta` 的改名工程。AG-UI 的真正价值在于：

1. **Agent 驱动 UI** — agent 发 UI 组件描述，前端自动渲染（对比框、建议卡片、标签面板）
2. **前端工具调用** — agent 可以直接让前端执行编辑器操作（插入、替换、滚动、高亮）
3. **双向上下文** — 前端实时同步用户选区、滚动位置、当前笔记内容给 agent

**目标场景：**

- 选中一段文字 → 右键"扩写" → agent 流式输出扩写内容 → 实时插入到光标位置
- Agent 提出修改建议 → 自动渲染 Diff 对比框 → 用户点"接受" → 编辑器自动替换
- Agent 分析笔记 → 渲染结构化整理面板（标题/标签/大纲/待办）→ 用户逐项点应用

---

## 一、三层架构

```
┌─────────────────────────────────────────────────────┐
│                   前端 (Next.js)                      │
│  ┌─────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ SSE 解析  │  │ UI 组件注册表  │  │ 编辑器桥接层     │  │
│  │ (事件→状态)│  │ (div-view/    │  │ (insertContent/  │  │
│  │          │  │  suggestion/  │  │  replaceRange/   │  │
│  │          │  │  tag-panel)   │  │  scrollTo)       │  │
│  └─────┬────┘  └──────┬───────┘  └───────┬──────────┘  │
│        │              │                  │              │
└────────┼──────────────┼──────────────────┼──────────────┘
         │ SSE          │ 执行 UI 渲染      │ 执行编辑器操作
         ▼              ▼                  ▼
┌─────────────────────────────────────────────────────┐
│                  后端 (NestJS)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ SSE 发射器 │  │ Agent    │  │ Tool Registry    │   │
│  │ (AG-UI   │◄─┤ (LangGraph)│  │ (search/getNote/ │   │
│  │  格式)   │  │          │  │  proposeUpdate)   │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                          │                            │
│                          ▼                            │
│                   ┌──────────────┐                    │
│                   │ Doubao API   │                    │
│                   └──────────────┘                    │
└─────────────────────────────────────────────────────┘
```

---

## 二、核心概念

### 2.1 事件类型（AG-UI 标准 + 扩展）

| 事件                | 方向          | 用途                                 |
| ------------------- | ------------- | ------------------------------------ |
| `run-started`       | server→client | Agent 会话启动                       |
| `text-delta`        | server→client | 流式文本输出                         |
| `tool-call-start`   | server→client | Agent 要调用工具（后端或前端工具）   |
| `tool-result`       | server→client | 后端工具返回结果                     |
| `tool-call-end`     | server→client | 工具调用结束                         |
| `ui`                | server→client | **Agent 要求渲染 UI 组件**           |
| `human-in-the-loop` | server→client | 需要用户确认                         |
| `error`             | server→client | 错误信息                             |
| `run-finished`      | server→client | 执行完成                             |
| `context`           | client→server | **前端同步上下文（选区/滚动/内容）** |
| `tool-result`       | client→server | 前端工具执行结果                     |

### 2.2 UI 组件描述（`{ type: "ui" }` 事件的核心）

```typescript
type UiComponent =
  // Diff 对比框：AI 建议修改内容时的预览
  | {
      component: "diff-view";
      props: { oldText: string; newText: string; title?: string };
    }
  // 建议卡片：AI 生成的笔记建议
  | {
      component: "suggestion-card";
      props: { title: string; summary: string; onApply: string };
    }
  // 标签建议：AI 推荐的标签列表
  | {
      component: "tag-suggestions";
      props: { tags: { name: string; reason: string }[] };
    }
  // 大纲展示：AI 生成的笔记大纲
  | {
      component: "outline-view";
      props: { items: { level: number; text: string }[] };
    }
  // 待办事项：AI 提取的行动项
  | {
      component: "action-items";
      props: { items: { text: string; checked: boolean }[] };
    }
  // 内联提示：直接在编辑器中渲染的提示条
  | {
      component: "inline-hint";
      props: { text: string; position: { from: number; to: number } };
    };
```

### 2.3 前端工具注册表

```typescript
// 前端工具 = agent 可以调用的编辑器操作
const editorTools = {
  // 在光标位置插入文本
  insertAtCursor: { execute: (args: { text: string }) => editor.commands.insertContent(args.text) },
  // 替换指定范围
  replaceRange: { execute: (args: { from: number; to: number; text: string }) => editor.commands.insertContentAt({ from: args.from, to: args.to }, args.text) },
  // 替换当前选中的文本
  replaceSelection: { execute: (args: { text: string }) => editor.chain().focus().insertContent(args.text).run() },
  // 滚动到指定行
  scrollTo: { execute: (args: { line: number }) => editor.commands.scrollToLine(args.line) },
  // 高亮指定范围
  highlightRange: { execute: (args: { from: number; to: number }) => editor.chain().focus().setTextSelection({ from: args.from, to: args.to }).run() },
  // 更新笔记标题
  updateTitle: { execute: (args: { title: string }) => { /* 触发 onTitleChange */ } },
  // 添加标签
  addTags: { execute: (args: { tags: string[] }) => { /* 调用 API 添加标签 */ } },
}

// 后端工具 (保持不变)
const backendTools = {
  search_notes: { execute: (args) => /* 调用 API */ },
  get_note: { execute: (args) => /* 调用 API */ },
  list_tags: { execute: (args) => /* 调用 API */ },
  propose_note_update: { execute: (args) => /* 生成确认 */ },
}
```

### 2.4 完整交互流程示例

```
用户选中一段文字 → 右键"扩写"
     │
     ▼
前端 POST /agent/chat/stream { message: "扩写选中内容: ...", noteContext: {...} }
     │
     ▼
后端 SSE 流 (AG-UI 格式):
  run-started
  tool-call-start { id: "1", tool: "get_note", args: { noteId: 13 } }
  tool-result { id: "1", result: { title: "...", content: "..." } }
  tool-call-end { id: "1" }
  text-delta "以下是扩写后的内容："
  text-delta "React..."
  ui { component: "diff-view", props: { oldText: "...", newText: "..." } }
  human-in-the-loop { id: "confirm_1", action: "apply_expansion", payload: { text: "..." } }
  run-finished
     │
     ▼
前端渲染:
  ┌─ AI 回复 ──────────────────────────┐
  │ "以下是扩写后的内容：React..."       │
  └─────────────────────────────────────┘
  ┌─ Diff 对比 ─────────────────────────┐
  │ ┌─ 原文 ──┐  ┌─ 扩写后 ──────────┐  │
  │ │ React   │  │ React 是目前最流   │  │
  │ │ 是最好的  │  │ 行的前端框架之一。 │  │
  │ └─────────┘  └───────────────────┘  │
  │        [接受]  [拒绝]               │
  └─────────────────────────────────────┘

用户点击"接受"
     │
     ▼
前端执行 editor.commands.insertContent(newText)
前端 POST /agent/{convId}/feedback { action: "confirm", payload: { ... } }
```

---

## 三、阶段计划

### Phase 0：基础设施（2 天）

**目标：** 建立 AG-UI 事件格式 + 前端工具注册框架，不影响现有功能。

#### 后端

- [ ] 重构 `agent-contracts.ts`：定义 AG-UI 标准事件类型

  ```typescript
  // 新增
  export interface UiEvent {
    type: "ui";
    component: string;
    props: Record<string, unknown>;
    id?: string;
  }

  export interface ContextEvent {
    type: "context";
    selection?: { from: number; to: number; text: string };
    scrollPosition?: number;
    visibleRange?: { from: number; to: number };
  }

  // AgentStreamEvent 聚合
  export type AgentStreamEvent =
    | { type: "run-started"; runId: string; timestamp?: string }
    | { type: "text-delta"; content: string }
    | { type: "tool-call-start"; id: string; tool: string; args: unknown }
    | { type: "tool-call-end"; id: string }
    | { type: "tool-result"; id: string; result: unknown }
    | UiEvent
    | {
        type: "human-in-the-loop";
        id: string;
        action: string;
        payload: unknown;
      }
    | { type: "error"; message: string }
    | { type: "run-finished"; runId?: string };
  ```

- [ ] `agent-contracts.ts` 新增 `FrontendToolName` 类型

  ```typescript
  export type FrontendToolName =
    | "insertAtCursor"
    | "replaceRange"
    | "replaceSelection"
    | "scrollTo"
    | "highlightRange"
    | "updateTitle"
    | "addTags";
  ```

- [ ] `agent-engine.ts` 事件名改为 AG-UI（`start`→`run-started`, `text`→`text-delta`, `tool_call`→`tool-call-start`, `tool_result`→`tool-result`, `requires_confirmation`→`human-in-the-loop`, `done`→`run-finished`）

- [ ] `workflow-engine.ts` 同上 + `step` 拆为 `tool-call-start`/`tool-call-end`

#### 前端

- [ ] `types/ai.ts` 更新为 AG-UI 事件类型
- [ ] `lib/ai-client.ts` 更新 SSE 解析（新事件名）
- [ ] 新建 `lib/editor-tools.ts`：前端工具注册表

  ```typescript
  type EditorToolFn = (args: Record<string, unknown>) => unknown;

  interface RegisteredEditorTool {
    name: string;
    description: string;
    execute: EditorToolFn;
    requiresUi?: boolean; // true = 需要渲染 UI 组件而不是直接执行
  }

  // 注册默认编辑器工具
  export function registerDefaultEditorTools(
    editor: Editor
  ): RegisteredEditorTool[] {
    return [
      {
        name: "insertAtCursor",
        description: "在光标位置插入文本",
        execute: (args) => editor.commands.insertContent(String(args.text)),
      },
      {
        name: "replaceSelection",
        description: "替换当前选中的文本",
        execute: (args) =>
          editor.chain().focus().insertContent(String(args.text)).run(),
      },
      {
        name: "highlightRange",
        description: "高亮指定范围的文本",
        execute: (args) =>
          editor
            .chain()
            .focus()
            .setTextSelection({ from: Number(args.from), to: Number(args.to) })
            .run(),
      },
      {
        name: "showDiff",
        description: "显示文本差异对比",
        requiresUi: true, // 由 ui 事件处理，不直接执行
      },
    ];
  }
  ```

- [ ] 新建 `components/agent-ui-renderer.tsx`：UI 组件渲染器

  **职责：** 接收 `{ type: "ui", component, props }` 事件，根据组件名渲染对应 UI 组件。

  ```typescript
  interface AgentUiRendererProps {
    event: UiEvent;
    onAction: (action: string, data: unknown) => void;
  }

  // 组件注册映射
  const UI_COMPONENTS: Record<
    string,
    React.ComponentType<{
      props: unknown;
      onAction: (action: string, data: unknown) => void;
    }>
  > = {
    "diff-view": DiffView,
    "suggestion-card": SuggestionCard,
    "tag-suggestions": TagSuggestions,
    "outline-view": OutlineView,
    "action-items": ActionItems,
    "inline-hint": InlineHint,
  };
  ```

**验收：**

- [ ] `npm run lint && npx tsc --noEmit` 通过
- [ ] `npm run build`（NestJS）通过
- [ ] Agent 对话 SSE 输出新事件名
- [ ] 工作流 SSE 输出新事件名
- [ ] 前端能解析并展示基本事件

---

### Phase 1：编辑器桥接层（2 天）

**目标：** Agent 的 `tool-call-start` 能驱动编辑器操作，实现"指哪打哪"。

#### 后端

- [ ] agent 新增 `EditorTool` 工具定义（在 LangGraph 的 toolsSchema 中）

  ```typescript
  // toolsSchema 新增
  {
    name: "edit_note_text",
    description: "直接修改笔记文本内容。使用 insertAtCursor/replaceSelection/replaceRange 等操作",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["insertAtCursor", "replaceSelection", "replaceRange"] },
        text: { type: "string" },
        from: { type: "number" },
        to: { type: "number" },
      },
      required: ["operation", "text"],
    },
  }
  ```

- [ ] ToolRegistry 新增 `EditorToolHandler`
  - 检测 `edit_note_text` 工具调用
  - 不执行，直接透传为 `tool-call-start` 事件给前端
  - 前端通过 HTTP POST 返回执行结果

#### 前端

- [ ] `agent-chat-panel.tsx` 和 `ai-chat/page.tsx`：拦截 `tool-call-start` 事件

  ```typescript
  if (event.type === "tool-call-start" && FRONTEND_TOOLS.includes(event.tool)) {
    // 执行前端本地工具
    const tool = editorTools.find((t) => t.name === event.tool);
    if (tool) {
      const result = await tool.execute(event.args);
      // 把结果发回后端（可选，用于 agent 继续推理）
      if (result !== undefined) {
        await fetch(`/api/agent/${conversationId}/tool-result`, {
          method: "POST",
          body: JSON.stringify({ toolCallId: event.id, result }),
        });
      }
    }
  }
  ```

- [ ] `app/api/agent/[convId]/tool-result/route.ts`：新建前端工具结果回传端点

- [ ] 编辑器选区同步 Hook
  ```typescript
  // hooks/useEditorSync.ts
  // 实时同步编辑器的选区、内容变更给 agent
  // 通过 context 事件在 SSE 连接建立时发送初始状态
  export function useEditorSync(
    editor: Editor | null,
    conversationId: string | null
  ) {
    useEffect(() => {
      if (!editor || !conversationId) return;
      // 监听 selectionChange 和 update 事件
      const onUpdate = () => {
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, " ");
        // 发送 context 事件
        fetch(`/api/agent/${conversationId}/context`, {
          method: "POST",
          body: JSON.stringify({
            selection: { from, to, text },
            contentLength: editor.state.doc.content.size,
          }),
        });
      };
      editor.on("selectionUpdate", onUpdate);
      editor.on("update", onUpdate);
      return () => {
        editor.off("selectionUpdate", onUpdate);
        editor.off("update", onUpdate);
      };
    }, [editor, conversationId]);
  }
  ```

**交互示例：用户对 Agent 说"把第二段改成强调语气"**

```
Agent (LangGraph):
  tool-call-start { tool: "edit_note_text", args: { operation: "replaceRange", from: 50, to: 120, text: "**React** 是**目前最流行**的前端框架之一" } }

前端:
  ✅ 编辑器自动执行: editor.commands.insertContentAt({ from: 50, to: 120 }, "**React** 是**目前最流行**的前端框架之一")
  ✅ 用户看到文字实时改变

Agent (LangGraph):
  text-delta "已经帮你改好了，看一下效果如何？"

前端:
  ✅ 正常渲染 AI 回复文本
```

**验收：**

- [ ] Agent 能调用 `edit_note_text` 工具
- [ ] 前端拦截并执行编辑器操作（不经过后端）
- [ ] 编辑器内容实时更新
- [ ] 选区信息同步给 agent（可选）

---

### Phase 2：生成式 UI 组件（3 天）

**目标：** Agent 能通过 `{ type: "ui" }` 事件驱动前端渲染复杂 UI。

#### 前端组件清单

- [ ] `components/ai-ui/diff-view.tsx`：Diff 对比框

  ```typescript
  // 使用 diff-match-patch 或 react-diff-viewer-continued
  // 接收 oldText / newText
  // 支持"接受"、"拒绝"、"复制新文本"
  ```

- [ ] `components/ai-ui/suggestion-card.tsx`：建议卡片

  ```typescript
  // 展示 AI 建议标题、摘要、标签
  // 支持"应用标题"、"应用标签"、"插入摘要"
  ```

- [ ] `components/ai-ui/tag-suggestions.tsx`：标签建议列表

  ```typescript
  // 展示 AI 建议的标签 + 理由
  // 点击"添加"按钮批量应用
  ```

- [ ] `components/ai-ui/outline-view.tsx`：大纲展示

  ```typescript
  // 树形展示笔记大纲
  // 点击章节跳转到对应位置
  ```

- [ ] `components/ai-ui/action-items.tsx`：待办事项
  ```typescript
  // 展示 AI 提取的行动项
  // 支持勾选完成
  ```

#### 后端

- [ ] `propose_note_update` 工具增强：改为生成 `{ type: "ui", component: "diff-view" }` 事件

  ```typescript
  // 原有的 proposes_note_update 改为：
  yield {
    type: "ui",
    component: "diff-view",
    props: {
      oldText: currentContent,
      newText: suggestedContent,
      title: "AI 建议的修改",
    },
  };
  ```

- [ ] `organize-note` 工作流增强：改为生成 `{ type: "ui" }` 事件链
  ```typescript
  yield { type: "ui", component: "suggestion-card", props: { title: "...", summary: "..." } };
  yield { type: "ui", component: "tag-suggestions", props: { tags: [...] } };
  yield { type: "ui", component: "outline-view", props: { items: [...] } };
  yield { type: "ui", component: "action-items", props: { items: [...] } };
  ```

#### 前端

- [ ] `agent-ui-renderer.tsx` 改为根据 `component` 名动态渲染

- [ ] `ai-chat/page.tsx` 在 AI 回复下方渲染 UI 组件

- [ ] `agent-chat-panel.tsx` 集成 UI 组件渲染

- [ ] `ai-workflow-panel.tsx` 结果展示改为使用 UI 组件

**验收：**

- [ ] 润色结果展示为 Diff 对比框
- [ ] 整理建议展示为结构化面板（标题/标签/大纲/待办）
- [ ] AI 搜索草稿展示为建议卡片
- [ ] 每个组件支持独立的应用/拒绝操作

---

### Phase 3：右键菜单 + 选区感知（2 天）

**目标：** 选中文字 → 右键"扩写/精简/改写风格" → Agent 流式输出并直接替换选区。

#### 前端

- [ ] `components/editor/ai-context-menu.tsx`：编辑器右键菜单

  ```typescript
  // 选项：
  // - 扩写 (expand)
  // - 精简 (condense)
  // - 改写风格 → 子菜单 (fluent/professional/concise/casual/academic)
  // - 语法检查
  // - 自定义指令
  ```

- [ ] 选区感知的 Agent 调用

  ```typescript
  const handleAiAction = async (action: string) => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    // 构建消息，包含选区上下文
    const message =
      action === "expand"
        ? `扩写以下内容（保持风格一致）：\n\n${selectedText}`
        : action === "condense"
          ? `精简以下内容（保留核心信息）：\n\n${selectedText}`
          : `改写以下内容为 ${style} 风格：\n\n${selectedText}`;
    // 调 agent/chat/stream
    startAgentChat(message, { from, to, selectedText });
  };
  ```

- [ ] `note-editor.tsx` 集成右键菜单

**验收：**

- [ ] 选中文本后右键弹出 AI 菜单
- [ ] 扩写/精简/改写能正常调用 Agent
- [ ] Agent 返回的内容直接替换选区
- [ ] 支持快捷键操作

---

### Phase 4：实时上下文同步（1 天）

**目标：** Agent 感知用户当前编辑状态，提供上下文相关的建议。

#### 后端

- [ ] Agent 新增 `context` 事件处理端点

  ```typescript
  // POST /agent/{convId}/context
  // Body: { selection?: { from, to, text }, contentLength?: number, scrollPosition?: number }
  // 更新会话中的 noteContext
  ```

- [ ] Agent system prompt 增强：告知 agent 可以获取用户当前选区和编辑状态

#### 前端

- [ ] `hooks/useEditorSync.ts` 正式集成
- [ ] 选区变化时通过 POST 通知后端
- [ ] 内容变化 debounce 后通知后端

**验收：**

- [ ] Agent 能知道用户当前在编辑什么
- [ ] Agent 能针对当前选区提供建议

---

## 四、文件清单

### 后端改动

| 文件                                   | 改动                                                  |
| -------------------------------------- | ----------------------------------------------------- |
| `src/ais/contracts/agent-contracts.ts` | 新增 `UiEvent`, `FrontendToolName` 类型，事件名 AG-UI |
| `src/ais/agent/agent-engine.ts`        | SSE 事件名改为 AG-UI，透传前端工具调用                |
| `src/ais/agent/workflow-engine.ts`     | 事件名改为 AG-UI，步骤事件拆为 start/end              |
| `src/ais/langgraph/agent.graph.ts`     | toolsSchema 新增 `edit_note_text`                     |
| `src/ais/langgraph/workflow.graph.ts`  | 无变化（步骤名不变）                                  |
| `src/ais/agent/tool-registry.ts`       | 新增 `EditorToolHandler`                              |
| `src/ais/ais.controller.ts`            | 新增 `POST /agent/{id}/tool-result` 端点              |
| `src/ais/ais.controller.ts`            | 新增 `POST /agent/{id}/context` 端点                  |

### 前端新增

| 文件                                          | 用途             |
| --------------------------------------------- | ---------------- |
| `lib/editor-tools.ts`                         | 前端工具注册表   |
| `components/agent-ui-renderer.tsx`            | UI 组件渲染器    |
| `components/ai-ui/diff-view.tsx`              | Diff 对比框      |
| `components/ai-ui/suggestion-card.tsx`        | 建议卡片         |
| `components/ai-ui/tag-suggestions.tsx`        | 标签建议         |
| `components/ai-ui/outline-view.tsx`           | 大纲展示         |
| `components/ai-ui/action-items.tsx`           | 待办事项         |
| `components/editor/ai-context-menu.tsx`       | 右键 AI 菜单     |
| `hooks/useEditorSync.ts`                      | 编辑器同步 Hook  |
| `app/api/agent/[convId]/tool-result/route.ts` | 前端工具结果回传 |
| `app/api/agent/[convId]/context/route.ts`     | 上下文同步端点   |

### 前端修改

| 文件                                | 改动                           |
| ----------------------------------- | ------------------------------ |
| `types/ai.ts`                       | 事件类型 AG-UI                 |
| `lib/ai-client.ts`                  | SSE 解析新事件                 |
| `components/agent-chat-panel.tsx`   | 集成前端工具 + UI 组件         |
| `components/ai-workflow-panel.tsx`  | 集成 UI 组件                   |
| `app/dashboard/ai-chat/page.tsx`    | 集成前端工具 + UI 组件         |
| `components/note-editor.tsx`        | 集成右键菜单                   |
| `app/dashboard/notes/[id]/page.tsx` | 透传 editor 引用给 agent panel |

---

## 五、不动的代码

- `ais.service.ts` 全部业务方法（polish、search、organizeNote、grammarCheck）
- `doubao.provider.ts` LLM Provider
- `notes`/`folders`/`tags` CRUD
- 认证和授权
- `ai-note-organize-panel.tsx`（AI 整理面板保持独立，作为对比组）
- `ai-polish-dialog.tsx`（润色弹窗保持独立）

---

## 六、最终验收标准

- [ ] SSE 事件输出 AG-UI 标准格式
- [ ] Agent 能调前端工具操作编辑器（插入/替换/高亮）
- [ ] Agent 能驱动 UI 组件渲染（Diff 框/建议卡片/标签面板）
- [ ] 右键菜单"扩写/精简/改写"正常工作
- [ ] 选区上下文同步给 Agent
- [ ] 写操作仍需要用户确认
- [ ] 工作流和 Agent 对话互不干扰
- [ ] `npm run lint && npx tsc --noEmit` 通过
- [ ] NestJS `npm run build` 通过
