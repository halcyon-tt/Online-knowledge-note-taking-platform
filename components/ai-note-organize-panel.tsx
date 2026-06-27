"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, Check, X, Tags, ListTree, ClipboardList, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { organizeNote } from "@/lib/ai-client";
import type { OrganizeNoteResponse } from "@/types/ai";
import { toast } from "sonner";

interface AINoteOrganizePanelProps {
  title: string;
  content: string;
  existingTags: string[];
  onApplyTitle: (title: string) => void;
  onApplyTags: (tags: string[]) => void;
  onInsertSummary: (summary: string) => void;
}

export function AINoteOrganizePanel({
  title,
  content,
  existingTags,
  onApplyTitle,
  onApplyTags,
  onInsertSummary,
}: AINoteOrganizePanelProps) {
  const [result, setResult] = useState<OrganizeNoteResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOrganize = useCallback(async () => {
    if (!content.trim()) {
      toast.info("笔记内容为空，无法整理");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await organizeNote({ title, content, existingTags });
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "整理失败");
    } finally {
      setLoading(false);
    }
  }, [title, content, existingTags]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          AI 整理
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOrganize}
          disabled={loading}
          className="h-7 text-xs bg-transparent"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {loading ? "整理中..." : "开始整理"}
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-xs text-muted-foreground">AI 正在分析笔记...</p>
            </div>
          </div>
        )}

        {!loading && !result && (
          <div className="flex items-center justify-center py-12">
            <p className="text-xs text-muted-foreground">{'点击"开始整理"分析当前笔记'}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <Section title="建议标题" icon={<FileText className="h-3 w-3" />}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm flex-1">{result.title}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-6 text-xs bg-transparent"
                  onClick={() => { onApplyTitle(result.title); toast.success("标题已更新"); }}
                >
                  <Check className="h-3 w-3 mr-1" />应用
                </Button>
              </div>
            </Section>

            <Section title="摘要" icon={<ClipboardList className="h-3 w-3" />}>
              <p className="text-sm text-muted-foreground">{result.summary}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 h-6 text-xs bg-transparent"
                onClick={() => { onInsertSummary(result.summary); toast.success("摘要已插入"); }}
              >
                <Check className="h-3 w-3 mr-1" />插入
              </Button>
            </Section>

            <Section title="建议标签" icon={<Tags className="h-3 w-3" />}>
              <div className="flex flex-wrap gap-1">
                {result.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 h-6 text-xs bg-transparent"
                onClick={() => { onApplyTags(result.tags); toast.success("标签已更新"); }}
              >
                <Check className="h-3 w-3 mr-1" />应用
              </Button>
            </Section>

            <Section title="大纲" icon={<ListTree className="h-3 w-3" />}>
              <div className="space-y-1">
                {result.outline.map((item, i) => (
                  <div
                    key={i}
                    className="text-sm"
                    style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="待办事项" icon={<ClipboardList className="h-3 w-3" />}>
              {result.actionItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无待办事项</p>
              ) : (
                <div className="space-y-1">
                  {result.actionItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span>{item.checked ? "☑" : "☐"}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
