"use client";

import type React from "react";

import { useState, useEffect, useMemo } from "react";
import { Sparkles, Search, Loader2, FileText, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth-utils";
import { getLocalNotes } from "@/lib/local-storage";
import type { Note } from "@/types/note";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  relatedNotes?: Array<{ id: string; title: string; snippet: string }>;
}

export function AISearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const useLocalStorage = !isSupabaseConfigured();

  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    async function loadNotes() {
      setError(null);
      try {
        if (useLocalStorage) {
          if (isMounted) {
            const localNotes = getLocalNotes();
            setNotes(localNotes);
          }
        } else {
          const supabase = createClient();
          if (!supabase) {
            setError("Supabase 未配置");
            return;
          }

          const userId = await getUserId();
          if (!userId) {
            setError("请先登录");
            return;
          }

          const { data, error: fetchError } = await supabase
            .from("notes")
            .select("id, title, content")
            .eq("user_id", userId);

          if (fetchError) {
            setError("加载笔记失败：" + fetchError.message);
            return;
          }

          if (data && isMounted) {
            setNotes(data as Note[]);
          }
        }
      } catch (err) {
        setError("加载笔记时发生错误");
        console.error(err);
      }
    }

    loadNotes();

    return () => {
      isMounted = false;
    };
  }, [open, useLocalStorage]);

  const processedNotes = useMemo(() => {
    return notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
    }));
  }, [notes]);

  const handleSearch = async () => {
    if (!query.trim() || loading) return;

    const userMessage: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
    const currentQuery = query;
    setQuery("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: currentQuery,
          notes: processedNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error || `请求失败 (${response.status})`;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `错误：${errorMsg}` },
        ]);
        setError(errorMsg);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer || "未能获取回答",
            relatedNotes: data.relatedNotes,
          },
        ]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "网络请求失败";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `请求失败：${errorMsg}` },
      ]);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  // 快捷操作
  const quickActions = [
    { label: "总结所有笔记", query: "请总结我所有笔记的核心内容" },
    { label: "找出关联", query: "分析我的笔记之间有哪些关联和共同主题" },
    { label: "生成待办", query: "根据我的笔记整理出待办事项和行动建议" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-transparent"
        >
          <Sparkles className="h-4 w-4" />
          <span>AI 智能检索</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] h-[550px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI 智能检索
          </DialogTitle>
          <DialogDescription>
            支持自然语言查询、摘要生成和信息聚合
          </DialogDescription>
        </DialogHeader>

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-md text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* 笔记数量提示 */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span>已加载 {notes.length} 篇笔记</span>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  输入问题开始检索，或尝试快捷操作：
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickActions.map((action) => (
                    <Badge
                      key={action.label}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        setQuery(action.query);
                      }}
                    >
                      {action.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className="space-y-2">
                <div
                  className={`p-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ml-8"
                      : "bg-muted mr-8"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {/* 显示相关笔记链接 */}
                {msg.role === "assistant" &&
                  msg.relatedNotes &&
                  msg.relatedNotes.length > 0 && (
                    <div className="mr-8 p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">
                        相关笔记：
                      </p>
                      <div className="space-y-1">
                        {msg.relatedNotes.map((note) => (
                          <Link
                            key={note.id}
                            href={`/dashboard/notes/${note.id}`}
                            className="block p-2 rounded hover:bg-muted transition-colors"
                            onClick={() => setOpen(false)}
                          >
                            <p className="text-sm font-medium">{note.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {note.snippet}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">正在分析...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            placeholder="输入问题，如：总结关于项目的笔记..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <Button onClick={handleSearch} disabled={loading || !query.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
