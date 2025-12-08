"use client";

import type React from "react";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Sparkles,
  Loader2,
  FileText,
  Trash2,
  BookOpen,
  Layers,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth-utils";
import { getLocalNotes } from "@/lib/local-storage";
import type { Note } from "@/types/note";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  relatedNotes?: Array<{
    id: string;
    title: string;
    snippet: string;
  }>;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const useLocalStorage = !isSupabaseConfigured();

  // 加载笔记
  useEffect(() => {
    async function loadNotes() {
      if (useLocalStorage) {
        setNotes(getLocalNotes());
      } else {
        const supabase = createClient();
        if (!supabase) return;

        const userId = await getUserId();
        if (!userId) return;

        const { data } = await supabase
          .from("notes")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (data) {
          setNotes(data as Note[]);
        }
      }
    }
    loadNotes();
  }, [useLocalStorage]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMessage.content,
          notes: notes.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content?.replace(/<[^>]*>/g, "").slice(0, 500) || "",
          })),
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || "抱歉，无法处理您的请求。",
        relatedNotes: data.relatedNotes,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `请求失败：${error instanceof Error ? error.message : "未知错误"}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, notes]);

  // 清空对话
  const handleClear = () => {
    setMessages([]);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* 顶部标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border shrink-0 gap-3 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-semibold">AI 智能助手</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              检索、摘要、聚合您的笔记内容
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="self-end sm:self-auto bg-transparent"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            清空对话
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 md:px-6">
        <div className="max-w-3xl mx-auto py-4 md:py-6 space-y-4 md:space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 md:py-16 text-center">
              <div className="p-3 md:p-4 rounded-full bg-primary/10 mb-3 md:mb-4">
                <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h2 className="text-base md:text-lg font-medium mb-2">
                AI 智能助手
              </h2>
              <p className="text-muted-foreground max-w-md mb-6 md:mb-8 text-sm md:text-base px-4">
                支持智能检索、内容摘要和信息聚合，让 AI 帮您整理和分析笔记
              </p>

              {/* 功能卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 w-full max-w-2xl mb-6 md:mb-8 px-2">
                <Card className="text-left">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">智能检索</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      语义搜索笔记内容，找到相关信息
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-left">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">内容摘要</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      精炼总结笔记要点，快速了解内容
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-left">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-sm">信息聚合</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      整合多篇笔记，形成结构化知识
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-sm text-muted-foreground px-2">
                <p className="mb-3">试试这些问题：</p>
                {/* 建议按钮 */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 justify-center">
                  {[
                    "帮我总结所有笔记的核心内容",
                    "整理我关于学习的笔记",
                    "查找与项目相关的信息",
                    "聚合分析我的工作笔记",
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(suggestion)}
                      className="text-xs w-full sm:w-auto"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[85%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 md:px-4 py-2 md:py-3"
                      : "bg-muted rounded-2xl rounded-tl-sm px-3 md:px-4 py-2 md:py-3"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </p>

                  {/* 相关笔记 */}
                  {message.relatedNotes && message.relatedNotes.length > 0 && (
                    <div className="mt-3 md:mt-4 pt-2 md:pt-3 border-t border-border/50">
                      <p className="text-xs font-medium mb-2 opacity-70">
                        相关笔记：
                      </p>
                      <div className="space-y-2">
                        {message.relatedNotes.map((note) => (
                          <Link
                            key={note.id}
                            href={`/dashboard/notes/${note.id}`}
                            className="block"
                          >
                            <Card className="hover:bg-background/50 transition-colors">
                              <CardContent className="p-2 md:p-3">
                                <div className="flex items-start gap-2">
                                  <FileText className="h-4 w-4 mt-0.5 shrink-0 opacity-60" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {note.title}
                                    </p>
                                    <p className="text-xs opacity-70 line-clamp-2 mt-1">
                                      {note.snippet}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* 加载状态 */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-tl-sm px-3 md:px-4 py-2 md:py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI 正在分析您的笔记...</span>
                </div>
              </div>
            </div>
          )}

          {/* 滚动锚点 */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="border-t border-border px-4 md:px-6 py-3 md:py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 md:gap-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题进行检索..."
              className="min-h-[44px] max-h-32 resize-none text-sm"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            已加载 {notes.length} 篇笔记
          </p>
        </div>
      </div>
    </div>
  );
}
