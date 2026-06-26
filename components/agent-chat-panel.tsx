"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Square, AlertCircle, Check, X, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useAgentStream } from "@/hooks/useAgentStream";

interface AgentChatPanelProps {
  noteContext?: {
    noteId?: number;
    title?: string;
    content?: string;
  };
}

export function AgentChatPanel({ noteContext }: AgentChatPanelProps) {
  const [input, setInput] = useState("");
  const { messages, isLoading, error, sendMessage, cancel, clearMessages } = useAgentStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    await sendMessage(text, noteContext);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Agent</span>
        </div>
        <div className="flex gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearMessages} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" />
              清空
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-1">AI Agent 助手</p>
              <p className="text-xs text-muted-foreground/60">
                发送消息开始对话，Agent 可以搜索笔记、获取内容、提出修改建议
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              <div
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>

              {/* Tool calls */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="flex gap-2 ml-9">
                  <div className="flex-1 space-y-1">
                    {msg.toolCalls.map((tc, i) => (
                      <Card key={i} className="bg-muted/30 border-border/30">
                        <CardContent className="p-2 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Wrench className="h-3 w-3" />
                            <span className="font-mono">{tc.tool}</span>
                          </div>
                          {tc.result != null ? (
                            <p className="text-muted-foreground/70 truncate">
                              {String(typeof tc.result === "string" ? tc.result : JSON.stringify(tc.result)).slice(0, 100)}
                            </p>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* requires_confirmation */}
              {msg.requiresConfirmation && (
                <div className="flex gap-2 ml-9">
                  <Card className="flex-1 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                        <AlertCircle className="h-4 w-4" />
                        需要确认
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {msg.requiresConfirmation.action === "update_note"
                          ? "Agent 建议修改笔记内容"
                          : "Agent 请求执行以下操作"}
                      </p>
                      {msg.requiresConfirmation.payload ? (
                        <pre className="text-xs bg-background/50 p-2 rounded mb-3 overflow-x-auto max-h-24">
                          {JSON.stringify(msg.requiresConfirmation.payload, null, 2) ?? ""}
                        </pre>
                      ) : null}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          确认
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive">
                          <X className="h-3 w-3 mr-1" />
                          拒绝
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Agent 思考中...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t px-4 py-3 shrink-0">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，如：帮我查找关于项目的笔记..."
            className="min-h-[40px] max-h-24 resize-none text-sm"
            rows={1}
            disabled={isLoading}
          />
          {isLoading ? (
            <Button onClick={cancel} size="icon" variant="outline" className="h-10 w-10 shrink-0">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
