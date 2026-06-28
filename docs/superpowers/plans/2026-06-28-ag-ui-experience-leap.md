# AG-UI 体验跃迁计划：从"加按钮的编辑器"到"AI 协作工作台"

> **给后续执行 Agent 的要求：** 实施本计划时，必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐项执行。任务使用 `- [ ]` 复选框跟踪。
>
> 本计划是 `2026-06-27-ag-ui-integration.md` 的延续。前面 Phase 1-5.1 已建立 AG-UI 基础链路（事件契约、前端工具调用、上下文同步、diff 高亮、撤销）。本计划专注于**用户体感层的炫酷升级**，把"功能可用"升级为"体验惊艳"。

---

## 起点：为什么要做这份计划

实际跑通 `2026-06-27-ag-ui-integration.md` 的 Phase 1-5.1 后，发现一个核心问题：

> **当前实现本质是"加了几个 AI 按钮的编辑器"，没有充分发挥 AG-UI 的协作潜力。**

具体缺口：

| AG-UI 的核心承诺  | 当前实现                         | 缺什么                        |
| ----------------- | -------------------------------- | ----------------------------- |
| **Agent 驱动 UI** | UI 是静态布局，AI 只是 push 数据 | 缺"AI 让 UI 动起来"           |
| **流式协作**      | 等几秒一次性出现结果             | 缺"字一个字长出来"的过程感    |
| **前端工具调用**  | 单次替换                         | 缺"AI 连续操作编辑器"         |
| **双向上下文**    | selection 单向推                 | 缺"AI 看到你在干什么主动建议" |

体验层面的对照：

- 当前感觉像：「你跟一个远程操作的远端服务说话，它砰一下回个结果给你」
- 应该感觉像：「另一个人坐在你旁边，看着你写，实时帮你」

Cursor / GitHub Copilot / ChatGPT Canvas 的"哇"时刻，本质都是**实时生成的过程感** + **不打扰的协作感**。本计划目标就是把这两个补上。

---

## 总体目标

完成本计划后，用户应该能直观感受到：

1. **流式可视化**：AI 修改文字时，能看到"字一个字长出来"的过程
2. **主动建议**：AI 在你写作时悄悄递建议（ghost text），不打扰
3. **过程透明**：AI 多步骤工作时，能看到每一步在做什么
4. **操作可视**：AI 修改多处时，编辑器自动滚动 + 高亮当前操作位置

---

## 实施状态（2026-06-28 启动）

| Phase                           | 状态                             | 工作量   | 价值                       |
| ------------------------------- | -------------------------------- | -------- | -------------------------- |
| Phase A 流式打字机插入          | **✅ 完成（已实战验证）**        | 1-1.5 天 | ⭐⭐⭐⭐⭐ Cursor 头号炫点 |
| Phase B Ghost Text 灵感建议     | **✅ 完成（已实战验证）**        | 1 天     | ⭐⭐⭐⭐ 不打扰的协作感    |
| Phase C 思维链可视化            | **≈ 90% 已落地（待端到端验证）** | 0.5-1 天 | ⭐⭐⭐ AI 透明度           |
| Phase D 多步骤 Agent 操作可视化 | **≈ 90% 已落地（待端到端验证）** | 1 天     | ⭐⭐⭐ 操控感              |
| Phase E 体感细节打磨            | **≈ 80% 已落地（待端到端验证）** | 0.5 天   | ⭐⭐ 细节加分              |

**Phase E 已完成项：** 消息气泡 slide-up 入场动画；编辑器 Ctrl+E 扩写 / Ctrl+J 精简（直接走 edit_note_text 链路 + toast 撤销）；Esc 中断流式生成（输入框内 + 全局，但编辑器内 Esc 让 ProseMirror 处理）；AI 面板宽度可拖（左边缘 4px handle + localStorage 持久化，320-680px 范围）；暗色模式 ai-edit-highlight 饱和度从 0.18 降到 0.13。
**未做：** Ctrl+K 命令面板、Ctrl+/ 快捷键面板（非核心，留 backlog）。
| Phase D 多步骤 Agent 操作可视化 | 未启动 | 1 天 | ⭐⭐⭐ 操控感 |
| Phase E 体感细节打磨 | 未启动 | 0.5 天 | ⭐⭐ 细节加分 |

**Phase A 已完成项：** 后端 `stream_edit_note_text` 工具 + `STREAMING_TOOL_NAMES` + `isStreamingTool`；agent-engine `handleStreamingTool` 拦截 marker 走 doubao 流式 + yield `tool-stream-delta`；前端 `AiStreamingMark` + CSS 蓝色脉动 + 打字机光标；editor-tools 三件套（start/delta/finish）+ `streamingState`；useAgentStream 路由 streaming 事件。**待验证：** 浏览器端到端 demo。

**推荐顺序：** A → C → B → D → E。理由：A 提供 SSE delta 基础设施；C 复用 A 的流式机制；B 和 D 是独立扩展。

---

## 执行原则

1. **复用现有基础设施。** Phase 1-5.1 已建立的 `edit_note_text` / `AiEditMark` / `useAgentStream` / `agent-ui-renderer` / `useEditorSync` 不应被推倒重做，只做扩展。
2. **每个 Phase 独立可验收。** 不依赖后续 Phase，做完即可 demo。
3. **可降级。** SSE 中断、网络慢、LLM 输出异常时，必须有"退化为现有非流式行为"的兜底。
4. **不打扰原则。** 主动建议默认关闭，用户开启后才生效；流式过程中用户能随时中断。
5. **键盘优先。** 所有交互能用键盘完成（Tab 接受 / Esc 取消 / Cmd+Enter 发送）。

---

## Phase A：流式打字机插入（1-1.5 天）

**目标：** Agent 调用 `edit_note_text` 时，文字以"打字机"方式逐字流入编辑器，而不是一次性砰出来。

### 用户体感

```
用户右键 → 扩写
当前：[转圈圈 3-5 秒] → 整段文字砰一下出现
升级：编辑器里光标位置开始，文字一个一个长出来
      期间：尾部有闪烁光标条 / Esc 中断 / Tab 加速
      完成：尾部光标条消失 → 整段绿色高亮淡出（保留现有 AiEditMark）
```

### 后端

- [ ] `src/ais/langgraph/agent.graph.ts` 新增 `stream_edit_note_text` 工具（与 `edit_note_text` 并存）：
  ```typescript
  {
    name: "stream_edit_note_text",
    description: "流式修改笔记文本，逐 token 输出到前端。适合 100 字以上的修改。",
    schema: {
      properties: {
        operation: { enum: ["insertAtCursor", "replaceSelection", "replaceRange"] },
        prompt: { type: "string", description: "改成什么的指令，例如 '扩写这段为 200 字'" },
        from: { type: "number" },
        to: { type: "number" },
      },
      required: ["operation", "prompt"],
    },
  }
  ```
- [ ] `src/ais/agent/agent-engine.ts`：识别 `stream_edit_note_text`，**不**走 ToolRegistry，改为：
  1. yield `tool-call-start { tool: 'stream_edit_note_text', args }`
  2. 单独调用 Doubao 流式接口生成内容
  3. 每个 chunk yield `{ type: 'tool-stream-delta', id, delta: '...' }`
  4. 结束 yield `tool-call-end { id }`
- [ ] `src/ais/contracts/agent-contracts.ts` 新增事件类型 `{ type: 'tool-stream-delta'; id: string; delta: string }`
- [ ] `src/ais/providers/doubao.provider.ts` 新增 `streamComplete()` 方法，使用 OpenAI 兼容的 `stream: true`
- [ ] `system prompt` 引导：长内容（> 100 字）优先用 `stream_edit_note_text`，短内容用 `edit_note_text`

### 前端

- [ ] `lib/editor-tools.ts` 新增 `stream_edit_note_text` 处理器：
  - 收到 `tool-call-start` 时：
    - 根据 operation 删除旧文本（如果是 replace），定位插入起点
    - 在插入点创建 ProseMirror Decoration"打字机光标"（闪烁 `▌`）
    - 给"流式区"加 `aiStreaming` 临时 mark
  - 收到 `tool-stream-delta` 时：
    - 在当前流式区末尾插入 delta 文本
    - 给新插入的字符加 `aiStreaming` mark
    - 自动滚动到视口可见
  - 收到 `tool-call-end` 时：
    - 移除"打字机光标" Decoration
    - 移除 `aiStreaming` mark，改为 `aiEdit` mark（享受现有绿色淡出）
    - 把完整新文本 + oldText 写入 result
- [ ] 新建 `lib/ai-streaming-mark.ts`：TipTap Mark `aiStreaming`（蓝色微脉动样式）
- [ ] `app/globals.css` 添加 `.ai-streaming` 样式（蓝色背景 + 脉动动画 + 末尾 ▌ 光标）
- [ ] `hooks/useAgentStream.ts`：分发 `tool-stream-delta` 事件到 editor-tools
- [ ] `components/agent-chat-panel.tsx`：流式过程中显示中断按钮（`Esc / 点击 ⏹` 触发 `editor.commands.cancelStreamingEdit`）
- [ ] 中断处理：用户 Esc 时，前端立即 abort 当前 SSE 连接 + 把已生成内容标记为完成态

### 验收

- [ ] 右键扩写一段超过 100 字的文本，能看到字一个个流入编辑器
- [ ] 流式过程中末尾有闪烁光标
- [ ] 按 Esc 能中断，已生成部分保留
- [ ] 完成后绿色淡出高亮 + AI 面板能看到这次工具调用
- [ ] 短文本（< 100 字）仍走旧的 `edit_note_text`（非流式）
- [ ] 网络中断时降级为"取消 + 提示重试"，不留半截 mark
- [ ] `npx tsc --noEmit` 通过；`nest build` 通过

### 风险与备选

- **Doubao 流式接口不稳定**：fallback 为非流式（一次性输出），保持视觉效果但失去"打字机"体感
- **TipTap 频繁 transaction 性能问题**：用 requestAnimationFrame 批量提交 delta，每 16ms 一次

---

## Phase B：Ghost Text 灵感建议（1 天）

**目标：** 用户在某段停留 > 1.5 秒不动，AI 主动浮出灰色斜体建议，按 Tab 接受 / Esc 忽略。

### 用户体感

```
用户写完一段，停下来思考
1.5 秒后，下一行浮出灰色斜体：
  ↳ "→ 这里要不要补一个 useMemo 的例子？"
按 Tab → 建议被接受为正式文本
按 Esc 或继续打字 → 建议消失
```

### 后端

- [ ] `src/ais/ais.controller.ts` 新增 `POST /api/ai/suggest-inline`：
  ```typescript
  // request: { contextBefore: string, contextAfter: string, noteId?: number }
  // response: { suggestion: string }  // 一句话建议，<= 50 字
  ```
- [ ] `src/ais/ais.service.ts` 新增 `suggestInline()`：
  - System prompt 强约束：返回一句不超过 50 字的、自然延续上下文的内容建议
  - 调用 Doubao 时设置 `max_tokens: 100`，避免长输出
  - 输入超 1000 字截取最近 1000 字
- [ ] DTO `SuggestInlineDto`：contextBefore `@MaxLength(2000)` + contextAfter `@MaxLength(2000)`

### 前端

- [ ] 新建 `hooks/useGhostSuggestion.ts`：
  - 监听编辑器 `update` 事件
  - debounce 1500ms 后，提取光标前后 ±300 字上下文
  - 调 `/api/ai/suggest-inline` 拿建议
  - 暴露 `{ suggestion, accept, dismiss }` 接口
- [ ] 新建 `lib/ghost-text-extension.ts`：TipTap Extension 渲染 ghost text（用 ProseMirror Widget Decoration）
- [ ] `components/note-editor.tsx` 注册 `GhostTextExtension`
- [ ] 键盘绑定：Tab → 接受（调用 `editor.commands.acceptGhost`）；Esc / 任何键入 → 清除
- [ ] AI 面板侧栏加开关：`☑ 智能建议`（默认关，localStorage 持久化）
- [ ] 新建 `app/api/ai/suggest-inline/route.ts` Buffer

### 验收

- [ ] 开启智能建议开关后，停留 1.5s 看到灰色建议
- [ ] Tab 接受 → 建议变成正式文本（继承当前段落样式）
- [ ] Esc / 继续打字 → 建议消失
- [ ] 关闭开关后不发请求（Network 验证）
- [ ] 多语言上下文建议合理（中英文混排）
- [ ] 不会在 ` ``` ` 代码块内浮出（避免破坏代码）

### 风险与备选

- **频繁请求成本高**：debounce 1500ms + 最近 1 分钟内同位置不重复请求
- **建议质量差影响体验**：开关默认关，让用户主动启用
- **遮挡用户视线**：用 widget decoration 而非 inline，放在光标下一行

---

## Phase C：思维链可视化（0.5-1 天）

**目标：** AI 调用多个工具时，AI 面板展示一个"执行步骤流"，每步实时显示状态 + 思考文字。

### 用户体感

```
用户："帮我整理这周关于 React 的所有笔记"

AI 面板里出现：
  ┌─ 任务执行 ──────────────────┐
  │ ① 🔍 搜索"React"   ✓ 找到 8 篇 │
  │ ② 📖 读笔记 #12   ✓          │
  │ ③ 📖 读笔记 #34   ✓          │
  │ ④ 🧠 提取主题     🌀 思考中... │
  │    "这 8 篇都围绕性能优化展开，可以分成三类..." │
  │ ⑤ ✏️ 生成大纲     · 等待     │
  └──────────────────────────────┘
每步实时变化，用户能看到 AI 在"活着"做事
```

### 后端

- [ ] `src/ais/agent/agent-engine.ts` 增强 SSE 事件：
  - 每次 `tool-call-start` 前 yield `{ type: 'step-start', stepId, label, icon }`
  - 工具完成后 yield `{ type: 'step-end', stepId, success: true|false, summary }`
  - LLM 思考流（agent 节点的 text-delta）标记 `phase: 'thinking'`（区别于"最终回复"）

### 前端

- [ ] 新建 `components/ai-ui/thinking-steps.tsx`：渲染步骤流，每步状态（pending / running / done / failed）
- [ ] `agent-ui-renderer.tsx` 注册 `thinking-steps`
- [ ] `hooks/useAgentStream.ts` 维护 `steps[]` state，根据 `step-start` / `step-end` 事件更新
- [ ] CSS 步骤入场动画（`framer-motion` 已有？否则用 CSS transition）

### 验收

- [ ] 调一个需要 ≥ 3 步工具调用的复杂任务，能看到步骤流逐项入场
- [ ] 每步状态实时切换（pending → running → done）
- [ ] 失败步骤红色 + 错误摘要
- [ ] 单步工具调用不显示步骤流（避免冗余）

---

## Phase D：多步骤 Agent 操作可视化（1 天）

**目标：** Agent 需要修改多处时，编辑器自动滚动 + 高亮当前操作位置，让用户"看到 AI 在操控"。

### 用户体感

```
用户："把所有'但是'改成'然而'"
Agent 调多次 edit_note_text，前端：
  1. 滚动到第一个"但是"位置
  2. 高亮 1.5 秒
  3. 替换为"然而" + 绿色淡出
  4. 滚动到下一个 ...
  5. 完成后回到原视口位置
中间可按空格暂停 / Esc 取消剩余操作
```

### 后端

- [ ] System prompt 引导 agent：发现多处修改时，按顺序调用 `edit_note_text`，每次包含 `sequenceIndex` 和 `sequenceTotal` 字段
- [ ] `agent.graph.ts` toolsSchema 给 `edit_note_text` 加可选字段 `sequenceIndex` / `sequenceTotal`

### 前端

- [ ] `lib/editor-tools.ts` 的 `edit_note_text` 增强：
  - 收到第一次调用且有 `sequenceTotal > 1` 时，保存当前滚动位置到 store
  - 每次执行前：`editor.commands.scrollIntoView` 到 `from` 位置
  - 加 1.5s 高亮（用现有 `flashAiEdit` 加强版，时间稍长）
  - 完成最后一次后恢复原始滚动位置
- [ ] AI 面板新增"批量操作进度条"：`正在替换 3/8 ✗ 取消`
- [ ] 取消机制：发 `/api/agent/{convId}/cancel-batch` 通知后端中断后续工具调用

### 验收

- [ ] 触发"全文替换某词"任务，能看到编辑器自动滚动到每个位置
- [ ] 当前操作位置高亮 1.5 秒
- [ ] 进度条实时更新
- [ ] 按 Esc 或点取消按钮能中断
- [ ] 完成后回到原始视口

---

## Phase E：体感细节打磨（0.5 天）

**目标：** 把已有功能的细节调到"丝滑"。

- [ ] 流式插入的字符动画曲线优化（`cubic-bezier(0.4, 0, 0.2, 1)`，比线性更自然）
- [ ] AI 面板消息入场动画（`framer-motion`，从下方 8px slide-in + fade）
- [ ] 工具调用卡片入场动画（同上，错落延迟 50ms）
- [ ] Toast 撤销按钮 hover 微动效（背景色脉动）
- [ ] AI 面板宽度可拖拽调整（`react-resizable` 或纯 CSS）
- [ ] 暗色模式下绿色高亮饱和度降低 30%（已检查 css，可能要再细调）
- [ ] 键盘快捷键面板（`Ctrl+/` 显示）：
  - `Ctrl+K` 调出 AI 命令面板
  - `Ctrl+E` 扩写选中
  - `Ctrl+J` 精简选中
  - `Esc` 中断当前流式生成

---

## 文件清单

### 后端新增

| 文件                                   | 用途                                |
| -------------------------------------- | ----------------------------------- |
| `src/ais/dto/suggest-inline.dto.ts`    | Phase B ghost text 请求 DTO         |
| `src/ais/providers/doubao.provider.ts` | 新增 streamComplete 方法（Phase A） |

### 后端修改

| 文件                                   | 改动                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/ais/langgraph/agent.graph.ts`     | Phase A 新增 stream_edit_note_text 工具；Phase D 给 edit_note_text 加 sequence 字段 |
| `src/ais/agent/agent-engine.ts`        | Phase A 流式工具识别；Phase C step-start/end 事件                                   |
| `src/ais/contracts/agent-contracts.ts` | 新增 tool-stream-delta、step-start、step-end 事件类型                               |
| `src/ais/ais.controller.ts`            | Phase B 新增 POST /ai/suggest-inline                                                |
| `src/ais/ais.service.ts`               | Phase B 新增 suggestInline 方法                                                     |
| `src/agents/agents.controller.ts`      | Phase D 新增 POST /agent/:convId/cancel-batch                                       |

### 前端新增

| 文件                                           | 用途                              |
| ---------------------------------------------- | --------------------------------- |
| `lib/ai-streaming-mark.ts`                     | Phase A TipTap Mark `aiStreaming` |
| `lib/ghost-text-extension.ts`                  | Phase B Ghost Text Extension      |
| `hooks/useGhostSuggestion.ts`                  | Phase B 协调 ghost 状态           |
| `components/ai-ui/thinking-steps.tsx`          | Phase C 步骤流组件                |
| `app/api/ai/suggest-inline/route.ts`           | Phase B Buffer                    |
| `app/api/agent/[convId]/cancel-batch/route.ts` | Phase D Buffer                    |

### 前端修改

| 文件                               | 改动                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `types/ai.ts`                      | 新增 tool-stream-delta / step-start / step-end / inline-hint 事件类型   |
| `lib/editor-tools.ts`              | Phase A 流式插入处理器；Phase D 滚动 + 高亮序列                         |
| `lib/ai-client.ts`                 | streamSse 分发 stream-delta                                             |
| `hooks/useAgentStream.ts`          | 新事件分发；Phase C steps state                                         |
| `components/note-editor.tsx`       | 注册 GhostText extension（Phase B）                                     |
| `components/agent-ui-renderer.tsx` | 注册 thinking-steps（Phase C）                                          |
| `components/agent-chat-panel.tsx`  | 流式中断按钮（Phase A）；智能建议开关（Phase B）；批量进度条（Phase D） |
| `app/globals.css`                  | `.ai-streaming` 样式 + 打字机光标动画 + ghost-text 样式                 |

---

## 最终验收标准

完成本计划后，必须能演示以下场景，每个都让人"哇"：

- [ ] **场景 1（Phase A 验收）**：选一段 200 字的文本，右键扩写。**看到文字一个一个流入**，期间末尾有打字机光标，按 Esc 中断，已生成部分保留。
- [ ] **场景 2（Phase B 验收）**：开启智能建议，写一段技术说明停顿，**1.5 秒后浮出灰色斜体建议**，Tab 接受。
- [ ] **场景 3（Phase C 验收）**：让 agent "整理本周笔记并生成大纲"，AI 面板**展示步骤流**，每步实时变化，能看到 AI 思考。
- [ ] **场景 4（Phase D 验收）**：让 agent "把所有 X 改成 Y"，**编辑器自动滚动到每个位置**逐个替换，可中断。
- [ ] **场景 5（细节验收）**：所有动画曲线自然、键盘流可用、暗色模式视觉舒适。
- [ ] 所有现有测试通过（`npm run test` 前端 + `npm test` 后端）。
- [ ] 没有引入新的浏览器 console 警告。
- [ ] 文档：本计划的复选框全部勾上 + 在 `2026-06-27-ag-ui-integration.md` 加 superseded 横幅指向本计划的 Phase A-E。

---

## 风险地图

| 风险                                   | 触发条件       | 缓解                                          |
| -------------------------------------- | -------------- | --------------------------------------------- |
| Doubao 流式接口不稳                    | Phase A        | 降级非流式，保留视觉但失去打字机感            |
| ProseMirror 频繁 transaction 性能差    | Phase A 长文本 | 用 rAF 批量 commit delta                      |
| Ghost text 频繁请求烧 token            | Phase B        | debounce 1500ms + 同位置不重复                |
| Agent 不按规则用 stream_edit_note_text | Phase A        | fallback 走 edit_note_text + 后续 prompt 微调 |
| 自动滚动让用户晕                       | Phase D        | 用户可关闭"批量操作动画"开关                  |
| 太多动画分散注意力                     | 整体           | 加"专注模式"开关全部关闭                      |

---

## 与既有计划的关系

- **`2026-06-09-ai-note-agent-evolution.md`**：奠基（接口契约 / 鉴权 / e2e）。本计划不动其内容。
- **`2026-06-27-ag-ui-integration.md`**：建立 AG-UI 基础链路（Phase 0-4 完成、Phase 5.1 部分完成）。本计划完成后，原计划 Phase 5.2-5.5 视为被本计划 Phase A-E 替代，可在原计划中标记 superseded。

---

## 开发节奏建议

- **Day 1**：Phase A 后端（流式工具 + provider 流式调用）+ 验收
- **Day 2**：Phase A 前端（streaming mark + editor-tools 流式处理器）+ 端到端 demo 验证
- **Day 3**：Phase C 思维链可视化（依赖 Phase A 的事件基础）
- **Day 4**：Phase B Ghost Text（独立功能，可与 C 并行）
- **Day 5**：Phase D 多步骤可视化
- **Day 6**：Phase E 体感打磨 + 全量回归 + 录 demo

总计约 5-6 天，可根据投入度伸缩。
