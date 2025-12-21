"use client";

import type React from "react";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import FontFamily from "@tiptap/extension-font-family";
import Image from "@tiptap/extension-image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "markdown-it";
import debounce from 'lodash/debounce';
import ImageInsertDialog from "@/components/editor/ImageInsertDialog";

import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  LinkIcon,
  ImageIcon,
  Undo,
  Redo,
  Strikethrough,
  Highlighter,
  Type,
  Minus,
  MoreHorizontal,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getLocalNotes } from "@/lib/local-storage";
import { useRouter } from "next/navigation";
import MarkdownIt from "markdown-it";
import { useEditorOperations } from "@/hooks/useEditorOperations";
import { useEditorShortcuts } from "@/hooks/useEditorShortcuts";
import Loading from "@/app/dashboard/ai-chat/loading";

interface TiptapProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  noteId?: string;
}

export default function Tiptap({
  initialContent = "",
  onChange,
  noteId,
}: TiptapProps) {
  const [content, setContent] = useState(initialContent);
  const [isPreview, setIsPreview] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const useLocalStorage = !isSupabaseConfigured();

  const router = useRouter();

  // 防抖函数
  const debouncedOnChange = useMemo(
    () => debounce((content: string) => {
      if (onChange) onChange(content);
    }, 500),
    [onChange]
  );
  // const LazyImageExtension = Image.extend({
  //   addAttributes() {
  //     return {
  //       ...this.parent?.(),
  //       loading: {
  //         default: 'lazy',
  //         parseHTML: element => element.getAttribute('loading') || 'lazy'
  //       },
  //       'data-src': {
  //         default: null,
  //         parseHTML: element => element.getAttribute('data-src') || (element as HTMLImageElement).src
  //       }
  //     };
  //   },

  //   renderHTML({ HTMLAttributes }) {
  //     return [
  //       'img',
  //       {
  //         ...HTMLAttributes,DOMPurify
  //         loading: 'lazy',
  //         'data-src': HTMLAttributes.src,
  //         src: 'data:image/svg+xml;base64,...', // 占位图
  //       }
  //     ];
  //   }
  // });
  // 初始化编辑器
  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      handlePaste(view, event) {
        event.preventDefault();
        event.stopPropagation();

        const md = new MarkdownIt();
        const plainText = event.clipboardData?.getData("text/plain") || "";
        const html = md.render(plainText);

        // 使用 insertContent 在光标处插入内容
        editor?.commands.insertContent(html);

        return true;
      },
      attributes: {
        class:
          "prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[600px] p-6 prose-headings:text-gray-100 prose-p:text-gray-300 prose-strong:text-gray-100 prose-em:text-gray-300 prose-code:text-green-400 prose-blockquote:text-gray-400 prose-ul:text-gray-300 prose-ol:text-gray-300 prose-li:text-gray-300",
      },
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-blue-400 hover:text-blue-300 underline transition-colors duration-200",
        },
      }),
      FontFamily.configure({
        types: ["textStyle"],
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class:
            "rounded-lg border-2 border-gray-700 hover:border-blue-500 transition-all duration-300",
          // loading: "lazy",
          // decoding:"async"
        },
      }),
      // LazyImageExtension.configure({
      //   inline: false,
      //   allowBase64: false, // 禁止Base64
      //   HTMLAttributes: {
      //     class: 'lazy-image rounded-lg border-2 border-gray-700',
      //     loading: 'lazy'
      //   }
      // }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();

      // 手动计算字符数和字数
      setContent(html);
      setWordCount(text.split(/\s+/).filter((word) => word.length > 0).length);
      setCharCount(text.length);

      // if (onChange) {
      //   onChange(html);
      // }
      debouncedOnChange(html);
    },
  });

  // 1. 获取编辑器操作函数
  const operations = useEditorOperations(editor);
  // 保存到本地存储
  const saveToLocalStorage = useCallback(() => {
    if (!editor) return;

    const content = editor.getHTML();
    localStorage.setItem("tiptap-content", content);
    alert("内容已保存到本地存储！");
  }, [editor]);
  // 复制内容
  const copyToClipboard = async () => {
    if (!editor) return;

    const text = editor.getText();
    try {
      await navigator.clipboard.writeText(text);
      alert("内容已复制到剪贴板！");
    } catch (err) {
      console.error("复制失败:", err);
    }
  };
  // 导出为Markdown
  const exportToMarkdown = () => {
    if (!editor) return "";

    const html = editor.getHTML();
    const markdown = html
      // 先处理行内元素
      .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
      .replace(/<em>(.*?)<\/em>/g, "*$1*")
      .replace(/<code>(.*?)<\/code>/g, "`$1`")
      // 处理链接和图片
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, "[$2]($1)")
      .replace(/<img[^>]*src="([^"]*)"[^>]*>/g, "![图片]($1)")
      // 处理标题
      .replace(/<h1>(.*?)<\/h1>/g, "# $1\n\n")
      .replace(/<h2>(.*?)<\/h2>/g, "## $1\n\n")
      .replace(/<h3>(.*?)<\/h3>/g, "### $1\n\n")
      .replace(/<h4>(.*?)<\/h4>/g, "#### $1\n\n")
      .replace(/<h5>(.*?)<\/h5>/g, "##### $1\n\n")
      .replace(/<h6>(.*?)<\/h6>/g, "###### $1\n\n")
      // 处理列表（需要区分有序和无序）
      .replace(/<ul>([\s\S]*?)<\/ul>/g, (match, content) =>
        content.replace(/<li>(.*?)<\/li>/g, "- $1\n")
      )
      .replace(/<ol>([\s\S]*?)<\/ol>/g, (match, content) =>
        content.replace(
          /<li>(.*?)<\/li>/g,
          (match: any, item: any, index: number) => `${index + 1}. ${item}\n`
        )
      )
      // 处理其他块级元素
      .replace(/<blockquote>(.*?)<\/blockquote>/g, "> $1")
      .replace(/<p>(.*?)<\/p>/g, "$1\n\n")
      .replace(/<hr>/g, "\n---\n")
      .replace(/<br>/g, "\n")
      // 最后清理剩余的标签
      .replace(/<[^>]*>/g, "");

    // 下载文件
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 重置编辑器
  const resetEditor = () => {
    if (confirm("确定要清空编辑器吗？")) {
      editor?.commands.clearContent();
      setContent("");
    }
  };

  // 3. 封装所有自定义回调
  const customCallbacks = useMemo(() => ({
    saveToLocalStorage,    // ← 这里提供saveToLocalStorage的实现
    copyToClipboard,
    exportToMarkdown,
    resetEditor,
  }), [saveToLocalStorage, copyToClipboard, exportToMarkdown, resetEditor]);

  // 4. 启用快捷键系统
  useEditorShortcuts(editor, operations, customCallbacks);

  // 清理防抖函数（防止内存泄漏）
  useEffect(() => {
    return () => {
      if (debouncedOnChange && debouncedOnChange.cancel) {
        debouncedOnChange.cancel();
      }
    };
  }, [debouncedOnChange]);

  // 修改后的插入图片函数
  const insertImage = useCallback(() => {
    setShowImageModal(true);
  }, []);

  // 从本地存储加载
  const loadFromLocalStorage = () => {
    const savedContent = localStorage.getItem("tiptap-content");
    if (savedContent && editor) {
      editor.commands.setContent(savedContent);
      alert("内容已从本地存储加载！");
    }
  };

  useEffect(() => {
    if (!editor) return;
  }, [editor, charCount]);

  if (!editor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">编辑器加载中...</p>
        </div>
      </div>
    );
  }

  // 删除笔记
  const handleDeleteNote = async (noteId: string | undefined) => {
    if (!noteId) return;

    const confirmed = window.confirm("确定要删除这篇笔记吗？");
    if (!confirmed) return;

    if (useLocalStorage) {
      const notes = getLocalNotes().filter((n) => n.id !== noteId);
      localStorage.setItem("notes", JSON.stringify(notes));
    } else {
      const supabase = createClient();
      if (!supabase) return;
      const { error } = await supabase.from("notes").delete().eq("id", noteId);
      if (error) {
        console.error("Error deleting note:", error);
        return;
      }
    }
    router.push("/dashboard");
  };

  return (
    <div className="bg-gray-50 dark:bg-black overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-300 shadow-sm ">
        <div className="max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-3">
          {/* 主工具栏 */}
          <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-2 md:mb-3">
            {/* 文本样式 */}
            <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-gray-200 dark:border-gray-800 pr-1 md:pr-3">
              <button
                onClick={operations.toggleBold}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("bold") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="粗体 (Ctrl+B)"
              >
                <Bold className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={operations.toggleItalic}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("italic") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="斜体 (Ctrl+I)"
              >
                <Italic className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={operations.toggleStrike}
                className={`hidden sm:block p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("strike") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="删除线"
              >
                <Strikethrough className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* 标题 */}
            <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-gray-200 dark:border-gray-800 pr-1 md:pr-3">
              <button
                onClick={operations.toggleHeading1}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("heading", { level: 1 }) ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="一级标题 (Shift+1)"
              >
                <span className="text-xs md:text-sm font-bold">H1</span>
              </button>
              <button
                onClick={operations.toggleHeading2}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("heading", { level: 2 }) ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="二级标题 (Shift+2)"
              >
                <span className="text-xs md:text-sm font-bold">H2</span>
              </button>
              <button
                onClick={operations.toggleHeading3}
                className={`hidden sm:block p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("heading", { level: 3 }) ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="三级标题 (Shift+3)"
              >
                <span className="text-xs md:text-sm font-bold">H3</span>
              </button>
              <button
                onClick={operations.setParagraph}
                className={`hidden md:block p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("paragraph") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="段落"
              >
                <span className="text-sm">正文</span>
              </button>
            </div>

            {/* 列表 */}
            <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-gray-200 dark:border-gray-800 pr-1 md:pr-3">
              <button
                onClick={operations.toggleBulletList}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("bulletList") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="无序列表"
              >
                <List className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={operations.toggleOrderedList}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("orderedList") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="有序列表"
              >
                <ListOrdered className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* 引用和代码 - 移动端隐藏代码块 */}
            <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-gray-200 dark:border-gray-800 pr-1 md:pr-3">
              <button
                onClick={operations.toggleBlockquote}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("blockquote") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="引用"
              >
                <Quote className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={operations.toggleCodeBlock}
                className={`hidden sm:block p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("codeBlock") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="代码块"
              >
                <Code className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* 链接和图片 */}
            <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-gray-200 dark:border-gray-800 pr-1 md:pr-3">
              <button
                onClick={operations.insertLink}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("link") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="插入链接"
              >
                <LinkIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={insertImage}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("image") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="插入图片"
              >
                <ImageIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* 分隔线 - 移动端隐藏 */}
            <div className="hidden md:flex items-center space-x-1 border-r border-gray-200 dark:border-gray-800 pr-3">
              <button
                onClick={operations.setHorizontalRule}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200"
                title="分隔线"
              >
                <Minus className="w-5 h-5" />
              </button>
            </div>

            {/* 撤销重做 */}
            <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-gray-200 dark:border-gray-800 pr-1 md:pr-3">
              <button
                onClick={operations.undo}
                className="p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="撤销 (Ctrl+Z)"
                disabled={!editor.can().undo()}
              >
                <Undo className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={operations.redo}
                className="p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="重做 (Ctrl+Y)"
                disabled={!editor.can().redo()}
              >
                <Redo className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* 清除格式 - 移动端隐藏 */}
            <button
              onClick={operations.clearFormat}
              className="hidden md:block p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200"
              title="清除格式"
            >
              <Highlighter className="w-5 h-5" />
            </button>
          </div>

          {/* 操作按钮栏 */}
          <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                字符: {charCount}
              </span>
            </div>

            <div className="flex items-center space-x-1 md:space-x-2">
              <button
                onClick={() => onChange && onChange(content)}
                className="px-2 md:px-3 py-1 text-xs md:text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors duration-200 border border-blue-200 dark:border-blue-800"
              >
                保存
              </button>
              <button
                onClick={copyToClipboard}
                className="hidden sm:block px-2 md:px-3 py-1 text-xs md:text-sm bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors duration-200 border border-purple-200 dark:border-purple-800"
              >
                复制
              </button>
              <button
                onClick={exportToMarkdown}
                className="hidden md:block px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors duration-200 border border-indigo-200 dark:border-indigo-800"
              >
                导出 Markdown
              </button>
              <button
                onClick={() => {
                  handleDeleteNote(noteId);
                }}
                className="px-2 md:px-3 py-1 text-xs md:text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-white-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors duration-200 border border-blue-200 dark:border-blue-800"
              >
                删除笔记
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="sm:hidden px-2 py-1 h-auto bg-transparent"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={loadFromLocalStorage}>
                    加载
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyToClipboard}>
                    复制
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToMarkdown}>
                    导出 Markdown
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={resetEditor}
                    className="text-red-600"
                  >
                    清空编辑器
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* 编辑器区域 */}
      <div className="tiptap-editor overflow-y-auto hide-scrollbar px-2 md:px-4">
        {isPreview ? (
          <div className="prose dark:prose-invert max-w-none p-4 md:p-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/g, " ")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")}
            </ReactMarkdown>
          </div>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>

      {/* 图片插入对话框 */}
      {showImageModal && (
        <ImageInsertDialog
          editor={editor}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
}
