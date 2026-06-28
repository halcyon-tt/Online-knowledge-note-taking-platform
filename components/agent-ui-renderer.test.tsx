import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgentUiRenderer } from "./agent-ui-renderer";

describe("AgentUiRenderer", () => {
  it("renders diff-view and emits accept with newText", () => {
    const onAction = vi.fn();
    render(
      <AgentUiRenderer
        event={{
          type: "ui",
          component: "diff-view",
          props: { oldText: "旧文本", newText: "新文本", title: "标题修改" },
        }}
        onAction={onAction}
      />,
    );

    expect(screen.getByText("标题修改")).toBeTruthy();
    expect(screen.getByText("旧文本")).toBeTruthy();
    expect(screen.getByText("新文本")).toBeTruthy();

    fireEvent.click(screen.getByText("接受"));
    expect(onAction).toHaveBeenCalledWith("accept", {
      newText: "新文本",
      field: "content",
    });

    fireEvent.click(screen.getByText("拒绝"));
    expect(onAction).toHaveBeenLastCalledWith("reject", {});
  });

  it("renders tag-suggestions and emits apply-tags with tag names", () => {
    const onAction = vi.fn();
    render(
      <AgentUiRenderer
        event={{
          type: "ui",
          component: "tag-suggestions",
          props: {
            tags: [
              { name: "React", reason: "出现 8 次" },
              { name: "性能", reason: "主题相关" },
            ],
          },
        }}
        onAction={onAction}
      />,
    );

    expect(screen.getByText("React")).toBeTruthy();
    expect(screen.getByText("性能")).toBeTruthy();

    fireEvent.click(screen.getByText("添加标签"));
    expect(onAction).toHaveBeenCalledWith("apply-tags", {
      tags: ["React", "性能"],
    });
  });

  it("returns null for empty tag list", () => {
    const { container } = render(
      <AgentUiRenderer
        event={{
          type: "ui",
          component: "tag-suggestions",
          props: { tags: [] },
        }}
        onAction={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null for unknown components", () => {
    const { container } = render(
      <AgentUiRenderer
        event={{
          type: "ui",
          component: "nonexistent-component",
          props: {},
        }}
        onAction={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders outline-view and emits preview-outline", () => {
    const onAction = vi.fn();
    render(
      <AgentUiRenderer
        event={{
          type: "ui",
          component: "outline-view",
          props: {
            items: [
              { level: 1, text: "章节一" },
              { level: 2, text: "小节" },
            ],
            summary: "整体摘要",
            outline: [{ level: 1, text: "章节一" }],
            actionItems: [],
          },
        }}
        onAction={onAction}
      />,
    );

    expect(screen.getByText("章节一")).toBeTruthy();
    fireEvent.click(screen.getByText("预览效果"));
    expect(onAction).toHaveBeenCalledWith(
      "preview-outline",
      expect.objectContaining({
        summary: "整体摘要",
        outline: expect.any(Array),
      }),
    );
  });
});
