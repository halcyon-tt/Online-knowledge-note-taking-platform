import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AIPolishDialog } from "./ai-polish-dialog";

describe("AIPolishDialog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders polish actions after receiving a polished result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ polishedText: "更流畅的文本", style: "fluent" }),
      })
    );

    render(
      <AIPolishDialog
        open
        onOpenChange={vi.fn()}
        selectedText="原始文本"
        onConfirm={vi.fn()}
        onInsertBelow={vi.fn()}
        onReject={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /开始润色/ }));

    expect(await screen.findByText("更流畅的文本")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /复制/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /插入下方/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /确认替换/ })).toBeInTheDocument();
  });

  it("calls insert and confirm callbacks with the polished result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ polishedText: "更流畅的文本", style: "fluent" }),
      })
    );
    const onConfirm = vi.fn();
    const onInsertBelow = vi.fn();

    const { rerender } = render(
      <AIPolishDialog
        open
        onOpenChange={vi.fn()}
        selectedText="原始文本"
        onConfirm={onConfirm}
        onInsertBelow={onInsertBelow}
        onReject={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /开始润色/ }));
    await screen.findByText("更流畅的文本");
    await userEvent.click(screen.getByRole("button", { name: /插入下方/ }));

    expect(onInsertBelow).toHaveBeenCalledWith("更流畅的文本");

    rerender(
      <AIPolishDialog
        open
        onOpenChange={vi.fn()}
        selectedText="原始文本"
        onConfirm={onConfirm}
        onInsertBelow={onInsertBelow}
        onReject={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("更流畅的文本")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: /确认替换/ }));

    expect(onConfirm).toHaveBeenCalledWith("更流畅的文本");
  });
});
