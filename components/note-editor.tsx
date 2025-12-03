"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TurndownService from "turndown";
import {
  Save,
  Trash2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Code,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateLocalNote, deleteLocalNote } from "@/lib/local-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import type { Note } from "@/types/note";

const turndownService = new TurndownService();

interface NoteEditorProps {
  note: Note;
  useLocalStorage?: boolean; // 新增属性
}

export function NoteEditor({ note, useLocalStorage = false }: NoteEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(note.title);
  const [markdownContent, setMarkdownContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "开始输入你的笔记内容...",
      }),
    ],
    content: note.content || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
      setMarkdownContent(markdown);
    },
    onCreate: ({ editor }) => {
      if (note.content) {
        const html = editor.getHTML();
        const markdown = turndownService.turndown(html);
        setMarkdownContent(markdown);
      }
    },
    immediatelyRender: false,
  });

  const handleSave = useCallback(async () => {
    if (!editor) return;

    setIsSaving(true);
    const content = editor.getHTML();

    if (useLocalStorage) {
      // 本地存储模式
      updateLocalNote(note.id, {
        title: title || "未命名笔记",
        content: content,
      });
      setLastSaved(new Date());
    } else {
      // Supabase 模式
      const supabase = createClient();
      if (!supabase) {
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from("notes")
        .update({
          title: title || "未命名笔记",
          content: content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", note.id);

      if (!error) {
        setLastSaved(new Date());
        startTransition(() => {
          router.refresh();
        });
      }
    }

    setIsSaving(false);
  }, [editor, title, note.id, useLocalStorage, router]);

  const handleDelete = async () => {
    if (useLocalStorage) {
      deleteLocalNote(note.id);
      router.push("/dashboard");
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase.from("notes").delete().eq("id", note.id);

      if (!error) {
        router.push("/dashboard");
        router.refresh();
      }
    }
  };

  // Auto-save
  useEffect(() => {
    if (!editor) return;

    const timeoutId = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [title, markdownContent, editor, handleSave]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">加载编辑器中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Input
            className="w-64 h-8"
            placeholder="笔记标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1">
            <Toggle
              size="sm"
              pressed={editor.isActive("bold")}
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("italic")}
              onPressedChange={() =>
                editor.chain().focus().toggleItalic().run()
              }
            >
              <Italic className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("code")}
              onPressedChange={() => editor.chain().focus().toggleCode().run()}
            >
              <Code className="h-4 w-4" />
            </Toggle>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Toggle
              size="sm"
              pressed={editor.isActive("heading", { level: 1 })}
              onPressedChange={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
            >
              <Heading1 className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("heading", { level: 2 })}
              onPressedChange={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              <Heading2 className="h-4 w-4" />
            </Toggle>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Toggle
              size="sm"
              pressed={editor.isActive("bulletList")}
              onPressedChange={() =>
                editor.chain().focus().toggleBulletList().run()
              }
            >
              <List className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("orderedList")}
              onPressedChange={() =>
                editor.chain().focus().toggleOrderedList().run()
              }
            >
              <ListOrdered className="h-4 w-4" />
            </Toggle>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              已保存 {lastSaved.toLocaleTimeString("zh-CN")}
            </span>
          )}
          {useLocalStorage && (
            <span className="text-xs text-yellow-500">本地模式</span>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "保存中..." : "保存"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Trash2 className="h-4 w-4 mr-1" />
                删除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确定删除？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作不可撤销，笔记将被永久删除。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Editor and Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
            编辑区
          </div>
          <div className="flex-1 overflow-y-auto">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
            预览区
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {markdownContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {markdownContent}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">暂无内容</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
