"use client";

import type React from "react";
import type { UiEvent } from "@/types/ai";
import { DiffView } from "@/components/ai-ui/diff-view";
import { SuggestionCard } from "@/components/ai-ui/suggestion-card";
import { TagSuggestions } from "@/components/ai-ui/tag-suggestions";
import { OutlineView } from "@/components/ai-ui/outline-view";
import { ActionItems } from "@/components/ai-ui/action-items";
import { PolishProgress } from "@/components/ai-ui/polish-progress";
import { PreviewControls } from "@/components/ai-ui/preview-controls";

interface AgentUiRendererProps {
  event: UiEvent;
  onAction: (action: string, data: unknown) => void;
}

type UiComponent = React.ComponentType<{
  props: Record<string, unknown>;
  onAction: (action: string, data: unknown) => void;
}>;

// Component registry：后端 yield 的 ui 事件按 component 名分发到对应组件。
// 新增组件时同步注册即可，不需要改 renderer 主体。
const UI_COMPONENTS: Record<string, UiComponent> = {
  "diff-view": DiffView,
  "suggestion-card": SuggestionCard,
  "tag-suggestions": TagSuggestions,
  "outline-view": OutlineView,
  "action-items": ActionItems,
  "polish-progress": PolishProgress,
  "preview-controls": PreviewControls,
};

export function AgentUiRenderer({ event, onAction }: AgentUiRendererProps) {
  const Component = UI_COMPONENTS[event.component];
  if (!Component) return null;
  return <Component props={event.props} onAction={onAction} />;
}
