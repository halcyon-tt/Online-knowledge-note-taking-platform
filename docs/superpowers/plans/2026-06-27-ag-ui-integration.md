# AG-UI + 生成式 UI 完整接入计划

> **给后续执行 Agent 的要求：** 实施本计划时，必须使用 `superpowers:executing-plans`，按任务逐项执行。任务使用 `- [ ]` 复选框跟踪。

---

## 实施状态（2026-06-28 同步）

| Phase                       | 完成度 | 说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 基础设施            | ≈ 90%  | 后端 `agent-contracts.ts` 已全部定义 AG-UI 事件；前端 `lib/editor-tools.ts`、`components/agent-ui-renderer.tsx` 已存在                                                                                                                                                                                                                                                                                                                                                                       |
| Phase 1 编辑器桥接层        | ≈ 90%  | ✅ 后端 `agent.graph.ts` 注册 `edit_note_text` + `FRONTEND_TOOL_NAMES` / `isFrontendTool`；✅ `agent-engine.ts` executeTool 回调对前端工具返回合成 ack；✅ `AgentsController` 新增 `POST /agent/:conversationId/tool-result` + `AgentSessionStore`；✅ 前端 `lib/editor-tools.ts` 新增 `edit_note_text` 分发器；✅ `hooks/useAgentStream.ts` 拦截前端工具调用并 POST 结果；✅ `app/api/agent/[convId]/tool-result/route.ts` Buffer。剩 ⚠ 编辑器选区同步 hook（归 Phase 4）                  |
| Phase 2 生成式 UI 组件      | ≈ 95%  | ✅ 7 个 UI 组件拆到 `components/ai-ui/`（diff-view / suggestion-card / tag-suggestions / outline-view / action-items / polish-progress / preview-controls）；✅ `agent-ui-renderer.tsx` 仅保留组件注册表和事件分发；✅ `propose_note_update` 工具升级：注入 NotesService 取原文，返回 `{ ui: { component: 'diff-view', props }, type: 'requires_confirmation', payload }`；✅ `agent-engine.ts` 识别 `result.ui` 字段并 yield `ui` 事件；✅ `components/agent-ui-renderer.test.tsx` 5/5 通过 |
| Phase 3 右键菜单 + 选区感知 | ≈ 90%  | ✅ `components/ai-context-menu.tsx`：扩写 / 精简 / 改写风格 5 子项；✅ 右键 contextMenu 事件冻结 from/to（防止 AI 处理期间用户点其他位置导致选区漂移）；✅ `handleContextMenuResult` 改走 `executeEditorTool('edit_note_text')` → 享受绿色高亮 + AI 面板显示；✅ Sonner toast 提供 5 秒撤销按钮；剩 ⚠ 语法检查（后端 `/ai/grammar` 端点未暴露）                                                                                                                                             |
| Phase 4 实时上下文同步      | ≈ 95%  | ✅ 后端 `AgentContextDto` + `POST /agent/:conversationId/context`；✅ `AgentSessionStore.setContext` 持久化；✅ `AgentEngine.chat` 接收 editorContext 并注入 system prompt `formatEditorContext`；✅ 前端 `hooks/useEditorSync.ts`（debounce 600ms + 选区长度阈值 + **锁定选区机制**）；✅ `app/api/agent/[convId]/context/route.ts` Buffer；✅ `AgentChatPanel` 集成（subscribeToEditor + useEditorSync + Pin chip 显示锁定状态）；剩 ⚠ scrollPosition 推送（次要）                        |
| Phase 5 体验闭环（新增）    | ≈ 35%  | ✅ 5.1 编辑器内 diff 高亮（`AiEditMark` + `flashAiEdit` + 2.8s 淡出 CSS 动画）；✅ AI 面板 diff 卡片显示红绿对比 + 撤销按钮；✅ 5.6 拆 ai-ui 组件（在 Phase 2 收尾完成）；⚠ 5.2 流式直接插入 / 5.3 内联提示气泡 / 5.4 渐进式建议面板 / 5.5 上下文感知主动建议 未做                                                                                                                                                                                                                          |

**依赖前置：✅ 已满足。** `2026-06-09-ai-note-agent-evolution.md` 的 **Phase 6 收尾加固**已完成主要工作（路径契约统一、鉴权补齐、输入边界、Service 单测），AG-UI Phase 1 可以基于干净契约启动。剩余的 Phase 6.4 e2e/CI 与 AG-UI 推进并行补齐。

---

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

- [x] 重构 `agent-contracts.ts`：定义 AG-UI 标准事件类型

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

- [x] `agent-contracts.ts` 新增 `FrontendToolName` 类型

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

- [x] `agent-engine.ts` 事件名改为 AG-UI（`start`→`run-started`, `text`→`text-delta`, `tool_call`→`tool-call-start`, `tool_result`→`tool-result`, `requires_confirmation`→`human-in-the-loop`, `done`→`run-finished`）

- [x] `workflow-engine.ts` 同上 + `step` 拆为 `tool-call-start`/`tool-call-end`

#### 前端

- [x] `types/ai.ts` 更新为 AG-UI 事件类型
- [x] `lib/ai-client.ts` 更新 SSE 解析（新事件名）
- [x] 新建 `lib/editor-tools.ts`：前端工具注册表

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

- [x] 新建 `components/agent-ui-renderer.tsx`：UI 组件渲染器

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

- [x] `npm run lint && npx tsc --noEmit` 通过
- [x] `npm run build`（NestJS）通过
- [x] Agent 对话 SSE 输出新事件名
- [x] 工作流 SSE 输出新事件名
- [x] 前端能解析并展示基本事件

---

### Phase 1：编辑器桥接层（2 天）

**目标：** Agent 的 `tool-call-start` 能驱动编辑器操作，实现"指哪打哪"。

#### 后端

- [x] agent 新增 `EditorTool` 工具定义（在 LangGraph 的 toolsSchema 中）：`edit_note_text` 支持 `insertAtCursor` / `replaceSelection` / `replaceRange` 三种 operation。
- [x] 在 `agent.graph.ts` 导出 `FRONTEND_TOOL_NAMES` 和 `isFrontendTool`。
- [x] `agent-engine.ts` executeTool 回调判断 `isFrontendTool(name)`：是则跳过 ToolRegistry，返回 `{ acknowledged: true, executedByFrontend: true, operation }`，让图继续推进。
- [x] system prompt 增加 `edit_note_text` 使用说明，引导 agent 优先使用。

  > **设计变更**：未新增 `EditorToolHandler`，改为在 `executeTool` 回调里直接判断。`ToolRegistry` 仍只承担后端工具。这样代码更集中、不污染 Registry 抽象。

- [x] `AgentsController` 新增 `POST /agent/:conversationId/tool-result`。
- [x] 新建 `AgentSessionStore`（内存）存储前端工具结果，Phase 4 会扩展为驱动 LangGraph 继续执行。

#### 前端

- [x] `hooks/useAgentStream.ts`：拦截 `tool-call-start` 事件，对 `FRONTEND_TOOL_NAMES` 中的工具立即通过 `executeEditorTool` 执行，并把结果 POST 到 `/api/agent/{convId}/tool-result`。

  ```typescript
  if (event.type === "tool-call-start" && FRONTEND_TOOL_NAMES.has(event.tool)) {
    const result = executeEditorTool(event.tool, event.args);
    void postToolResult(conversationId, event.id, result);
    // 同时在 UI 上记录工具调用让用户看到 agent 做了什么
  }
  ```

- [x] `app/api/agent/[convId]/tool-result/route.ts`：新建前端工具结果回传端点（透传 Authorization）。

- [ ] **Phase 4 任务**：编辑器选区同步 Hook（`hooks/useEditorSync.ts`）。本 Phase 已通过 `getEditorContext` 在每次 sendMessage 时附带 selection，足够 demo；持续推送留到 Phase 4。

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

- [x] Agent 能调用 `edit_note_text` 工具（已在 toolsSchema 注册，system prompt 已说明）。
- [x] 前端拦截并执行编辑器操作（不经过后端业务执行，仅 SSE 透传 + 编辑器命令）。
- [x] 编辑器内容实时更新（依赖 `registerDefaultEditorTools` 已挂载的 TipTap 命令）。
- [ ] 选区信息同步给 agent（可选；当前仅在 sendMessage 时附带一次，持续推送归 Phase 4）。

---

### Phase 2：生成式 UI 组件（3 天）

**目标：** Agent 能通过 `{ type: "ui" }` 事件驱动前端渲染复杂 UI。

#### 前端组件清单

- [x] `components/ai-ui/diff-view.tsx`：Diff 对比框（红绿双栏 + 接受/拒绝）
- [x] `components/ai-ui/suggestion-card.tsx`：建议卡片（标题 + 摘要 + 应用）
- [x] `components/ai-ui/tag-suggestions.tsx`：标签建议列表（hover 显示理由）
- [x] `components/ai-ui/outline-view.tsx`：大纲展示 + 预览效果按钮
- [x] `components/ai-ui/action-items.tsx`：待办事项（可勾选）+ 预览效果按钮
- [x] `components/ai-ui/polish-progress.tsx`：润色进度（pending / running / done 三态）
- [x] `components/ai-ui/preview-controls.tsx`：预览操作条（应用 / 取消）

#### 后端

- [x] `propose_note_update` 工具增强：改为生成 `{ type: "ui", component: "diff-view" }` 事件（已升级：注入 NotesService 取原文，返回 `{ ui: { component: 'diff-view', props }, type: 'requires_confirmation', payload }`）

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

- [x] `propose_note_update` 工具增强：注入 NotesService 取原文，返回结构化结果同时携带 `ui: { component: 'diff-view', props }` 和 `requires_confirmation` payload。

- [x] `agent-engine.ts` ToolMessage 处理增强：识别 `result.ui` 字段，先 yield ui 事件再 yield human-in-the-loop / tool-result。
  ```typescript
  yield { type: "ui", component: "suggestion-card", props: { title: "...", summary: "..." } };
  yield { type: "ui", component: "tag-suggestions", props: { tags: [...] } };
  yield { type: "ui", component: "outline-view", props: { items: [...] } };
  yield { type: "ui", component: "action-items", props: { items: [...] } };
  ```

#### 前端

- [x] `agent-ui-renderer.tsx` 改为根据 `component` 名动态渲染（**当前以内联函数实现，Phase 2 待办：拆到 `components/ai-ui/*.tsx`**）

- [x] `ai-chat/page.tsx` 在 AI 回复下方渲染 UI 组件

- [x] `agent-chat-panel.tsx` 集成 UI 组件渲染

- [x] `ai-workflow-panel.tsx` 结果展示改为使用 UI 组件

**验收：**

- [x] 润色结果展示为 Diff 对比框（`polish-progress` done 态 / `diff-view`）。
- [x] 整理建议展示为结构化面板（标题 / 标签 / 大纲 / 待办）。
- [x] AI 搜索草稿展示为建议卡片（`suggestion-card`）。
- [x] 每个组件支持独立的应用/拒绝操作。
- [x] `components/agent-ui-renderer.test.tsx` 5/5 通过（diff-view accept/reject、tag-suggestions apply、空 list 返回 null、未知组件返回 null、outline-view preview-outline）。

---

### Phase 3：右键菜单 + 选区感知（2 天）

**目标：** 选中文字 → 右键"扩写/精简/改写风格" → Agent 流式输出并直接替换选区。

#### 前端

- [x] `components/editor/ai-context-menu.tsx`：编辑器右键菜单（实际位置 `components/ai-context-menu.tsx`，含扩写/精简/改写风格 5 子项）

  ```typescript
  // 选项：
  // - 扩写 (expand)
  // - 精简 (condense)
  // - 改写风格 → 子菜单 (fluent/professional/concise/casual/academic)
  // - 语法检查
  // - 自定义指令
  ```

- [x] 选区感知的 Agent 调用（右键时冻结 from/to 到 contextMenu state，避免 AI 处理期间漂移）

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

- [x] `note-editor.tsx` 集成右键菜单

**验收：**

- [x] 选中文本后右键弹出 AI 菜单
- [x] 扩写/精简/改写能正常调用 Agent（用了 `/api/ai/expand` / `/api/ai/condense` / `/api/ai/polish`，复用 `edit_note_text` 应用机制 → 享受绿色淡出）
- [x] Agent 返回的内容直接替换选区（走 `executeEditorTool('edit_note_text', replaceRange)`）
- [x] 支持 Sonner toast 撤销按钮（5 秒内可撤）
- [ ] 支持快捷键操作（归 Phase E 体感打磨）

---

### Phase 4：实时上下文同步（1 天）

**目标：** Agent 感知用户当前编辑状态，提供上下文相关的建议。

#### 后端

- [x] Agent 新增 `context` 事件处理端点（`POST /agent/:conversationId/context`，`AuthGuard` 保护）。
- [x] `AgentContextDto` 严格校验：selection.text `MaxLength 2000`、from/to/scrollPosition/contentLength 全部 `IsInt @Min(0)`。
- [x] `AgentSessionStore.setContext(conversationId, snapshot)` 持久化最新一次推送（含 `updatedAt`）。
- [x] `AgentsController.chatStream` 在调用 `agentEngine.chat` 前合并 `dto.noteContext` 和 store 中的 context，body 中的值优先。
- [x] `AgentEngine.chat(message, userId, conversationId, signal, editorContext?)` 接收 editor 上下文，通过 `formatEditorContext` 注入 system prompt（含选区位置、选中文本预览、文档长度、笔记 noteRef）。

#### 前端

- [x] `hooks/useEditorSync.ts`：
  - debounce 600ms 推送 selection / contentLength；
  - 选区长度 < 1（光标移动）不推送，避免噪声；
  - 重复 payload 不推送（lastPayloadRef 去重）；
  - 挂载时立刻推一次，让 agent 在第一条消息前就有 contentLength 可用；
  - 失败静默（console.warn），不影响主流程。
- [x] `app/api/agent/[convId]/context/route.ts`：Buffer 透传 Authorization。
- [x] `lib/editor-bridge.ts` 新增 `subscribeToEditor` + `getCurrentEditor`：让消费组件以响应式方式拿到 editor 实例。
- [x] `hooks/useAgentStream.ts` 暴露 `conversationId` 和 `ensureConversationId()`：让 `useEditorSync` 在第一次 sendMessage 前就拿到 id。
- [x] `components/agent-chat-panel.tsx` 挂载时 `ensureConversationId()` + `subscribeToEditor` + `useEditorSync({ editor, conversationId, noteRef })`。

**验收：**

- [x] Agent 能知道用户当前在编辑什么（system prompt 注入；可在 NestJS 日志看到 `context conv=... sel=...`）。
- [x] Agent 能针对当前选区提供建议（依赖 system prompt 指引 + Phase 1 `edit_note_text(replaceRange, from, to, text)`）。
- [x] 选区变化不会刷屏请求（debounce + 去重）。

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

---

## 七、Phase 5：体验闭环（2026-06-28 新增）

> **⚠ Phase 5.2 - 5.5 已被 `2026-06-28-ag-ui-experience-leap.md` 取代。** 本节仅保留 5.1（已完成）和 5.6（已完成）作为历史记录；其余炫酷升级以新计划的 Phase A-E 为准。

**目标：** Phase 1-4 各自打通后，把"流畅炫酷"作为可验收的体验目标，逐项落地。

### 5.1 编辑器内 Diff 高亮（替代弹窗）

- [x] 新建 ProseMirror 装饰扩展 `extensions/ai-diff-decoration.ts`，把建议改动渲染为：（实际实现：`lib/ai-edit-mark.ts` TipTap Mark 替代纯 Decoration，效果一致）
  - 新增文本：浅绿底色 `bg-emerald-50 underline decoration-dotted`（实际：`.ai-edit-highlight` 绿色背景 + 2.8s 淡出动画）
  - 删除文本：红色删除线 `bg-rose-50 line-through`（实际：只在 AI 面板 diff 卡片里展示原文删除线，编辑器内不保留原文）
- [x] `propose_note_update` 工具改为输出 `ui:diff-view`（同时通过装饰应用到原文位置）。
- [x] 浮出"接受 / 拒绝 / 重新生成"小工具条，跟随选区位置。（实际：撤销按钮在 AI 面板 diff 卡片右下 + Sonner toast 5 秒撤销）
- [x] 用户点接受 → 调 `replaceRange` 前端工具 → POST `/agent/{id}/tool-result` 通知后端。

### 5.2 流式直接插入

> 已迁移到 `2026-06-28-ag-ui-experience-leap.md` Phase A。

- [ ] ~~`agent-chat-panel.tsx` 在收到 `text-delta` 时...~~ → 见新计划 Phase A
- [ ] ~~右键菜单"扩写" / "精简" 默认开启此模式...~~ → 见新计划 Phase A
- [ ] ~~流式过程中显示"光标后渐显光标条 / Tab 接受 / Esc 取消"。~~ → 见新计划 Phase A

### 5.3 内联提示气泡

> 已迁移到 `2026-06-28-ag-ui-experience-leap.md` Phase B（Ghost Text）。

- [ ] ~~实现 `ui:inline-hint` 组件...~~ → 见新计划 Phase B（用 Ghost Text 形态替代）
- [ ] ~~Agent 在分析笔记时主动发 `inline-hint`...~~ → 见新计划 Phase B

### 5.4 渐进式建议面板

> 已迁移到 `2026-06-28-ag-ui-experience-leap.md` Phase C（思维链可视化覆盖了类似的"分批入场"动效）。

- [ ] ~~`ai-workflow-panel.tsx` 改为按 `ui` 事件顺序逐张卡片入场...~~ → 见新计划 Phase C / E
- [ ] ~~标题 / 标签 / 大纲 / 待办 4 类卡片各自支持...~~（已部分实现，见 `agent-ui-renderer.tsx`）

### 5.5 上下文感知主动建议

> 已迁移到 `2026-06-28-ag-ui-experience-leap.md` Phase B（Ghost Text 是这个的更优形态）。

- [x] 依赖 Phase 4 `useEditorSync`。
- [ ] ~~用户在某段停留 > 1.5 秒时...~~ → 见新计划 Phase B
- [ ] ~~后端 Agent 决定是否主动发 `ui:suggestion-card`...~~ → 见新计划 Phase B

### 5.6 拆分 ai-ui 组件

- [x] 把 `components/agent-ui-renderer.tsx` 内联的 5 个组件拆到 `components/ai-ui/diff-view.tsx` 等独立文件。
- [x] `agent-ui-renderer.tsx` 仅保留组件注册表和事件分发。
- [x] 每个组件配 `*.test.tsx` 单测。（`components/agent-ui-renderer.test.tsx` 5/5 通过，覆盖路由 + 各组件交互；单组件级单测可在 Phase E 补全）

**验收：**

- [x] "右键扩写"体验从"等加载圈 → 弹窗 → 替换"变成"文字直接长进来"。（实际：先做了"立即替换 + 绿色淡出 + toast 撤销"；"打字机式流入"等 `2026-06-28-ag-ui-experience-leap.md` Phase A）
- [x] AI 修改建议从弹窗 diff 变成原文高亮 + 浮出工具条。（AI 面板 diff 卡片 + 撤销按钮）
- [ ] ~~AI 整理结果分批入场，可逐项应用。~~ → 见新计划 Phase C / E
- [x] `components/ai-ui/` 目录建立，单元测试覆盖每个组件。
