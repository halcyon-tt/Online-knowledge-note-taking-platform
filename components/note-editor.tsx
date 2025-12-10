"use client";

import { useState, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import FontFamily from "@tiptap/extension-font-family";
import Image from "@tiptap/extension-image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
import { redirect, useRouter } from "next/navigation";

interface TiptapProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  noteId?: string;
}

export default function Tiptap({ initialContent = "开始写作....", onChange, noteId }: TiptapProps) {
  const [content, setContent] = useState(initialContent);
  const [isPreview, setIsPreview] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);
  const [fontFamily, setFontFamily] = useState("");
  const useLocalStorage = !isSupabaseConfigured();

  const router = useRouter();
  // 初始化编辑器
  const editor = useEditor({
    immediatelyRender: false,
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
      // Placeholder.configure({
      //   // placeholder: (charCount > 0) ? "" : "开始写作...",
      // }),
      FontFamily.configure({
        types: ["textStyle"],
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class:
            "rounded-lg border-2 border-gray-700 hover:border-blue-500 transition-all duration-300",
        },
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();

      // 手动计算字符数和字数
      setContent(html);
      setWordCount(text.split(/\s+/).filter((word) => word.length > 0).length);
      setCharCount(text.length);

      if (onChange) {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[600px] p-6 prose-headings:text-gray-100 prose-p:text-gray-300 prose-strong:text-gray-100 prose-em:text-gray-300 prose-code:text-green-400 prose-blockquote:text-gray-400 prose-ul:text-gray-300 prose-ol:text-gray-300 prose-li:text-gray-300",
      },
    },
  });

  // 工具栏按钮功能
  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleStrike = () => editor?.chain().focus().toggleStrike().run();
  const toggleHeading1 = () => {
    console.log("设置一级标题");
    editor?.chain().focus().toggleHeading({ level: 1 }).run();
  };
  const toggleHeading2 = () => {
    console.log("设置二级标题");
    editor?.chain().focus().toggleHeading({ level: 2 }).run();
  };
  const toggleHeading3 = () => {
    console.log("设置三级标题");
    editor?.chain().focus().toggleHeading({ level: 3 }).run();
  };
  const toggleHeading4 = () =>
    editor?.chain().focus().toggleHeading({ level: 4 }).run();
  const toggleBulletList = () =>
    editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () =>
    editor?.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () =>
    editor?.chain().focus().toggleBlockquote().run();
  const toggleCode = () => editor?.chain().focus().toggleCode().run();
  const toggleCodeBlock = () => editor?.chain().focus().toggleCodeBlock().run();
  const undo = () => editor?.chain().focus().undo().run();
  const redo = () => editor?.chain().focus().redo().run();
  const setHorizontalRule = () =>
    editor?.chain().focus().setHorizontalRule().run();

  // 插入图片
  const insertImage = useCallback(() => {
    const url = window.prompt("请输入图片 URL");
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  // 插入链接
  const insertLink = useCallback(() => {
    const url = window.prompt("请输入 URL");
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  // 设置字体
  const setFont = () => {
    if (fontFamily.trim() && editor) {
      editor.chain().focus().setFontFamily(fontFamily).run();
      setFontFamily("");
      setShowFontModal(false);
    }
  };

  // 清除格式
  const clearFormat = () => {
    editor?.chain().focus().clearNodes().unsetAllMarks().run();
  };

  // 重置为段落
  const setParagraph = () => {
    editor?.chain().focus().setParagraph().run();
  };

  // 导出为Markdown
  const exportToMarkdown = () => {
    if (!editor) return "";

    const html = editor.getHTML();
    const markdown = html
      .replace(/<h1>(.*?)<\/h1>/g, "# $1\n\n")
      .replace(/<h2>(.*?)<\/h2>/g, "## $1\n\n")
      .replace(/<h3>(.*?)<\/h3>/g, "### $1\n\n")
      .replace(/<h4>(.*?)<\/h4>/g, "#### $1\n\n")
      .replace(/<h5>(.*?)<\/h5>/g, "##### $1\n\n")
      .replace(/<h6>(.*?)<\/h6>/g, "###### $1\n\n")
      .replace(/<p>(.*?)<\/p>/g, "$1\n\n")
      .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
      .replace(/<em>(.*?)<\/em>/g, "*$1*")
      .replace(/<code>(.*?)<\/code>/g, "`$1`")
      .replace(/<blockquote>(.*?)<\/blockquote>/g, "> $1")
      .replace(/<ul>(.*?)<\/ul>/g, "$1")
      .replace(/<li>(.*?)<\/li>/g, "- $1\n")
      .replace(/<ol>(.*?)<\/ol>/g, "$1")
      .replace(/<li>(.*?)<\/li>/g, "1. $1\n")
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, "[$2]($1)")
      .replace(/<img src="(.*?)".*?>/g, "![图片]($1)")
      .replace(/<hr>/g, "\n---\n")
      .replace(/<br>/g, "\n")
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

  // 保存到本地存储
  const saveToLocalStorage = () => {
    if (!editor) return;

    const content = editor.getHTML();
    localStorage.setItem("tiptap-content", content);
    alert("内容已保存到本地存储！");
  };

  // 从本地存储加载
  const loadFromLocalStorage = () => {
    const savedContent = localStorage.getItem("tiptap-content");
    if (savedContent && editor) {
      editor.commands.setContent(savedContent);
      alert("内容已从本地存储加载！");
    }
  };

  // 重置编辑器
  const resetEditor = () => {
    if (confirm("确定要清空编辑器吗？")) {
      editor?.commands.clearContent();
      setContent("");
    }
  };
  useEffect(() => {
    if (!editor) return;

    // 重新配置编辑器（如果需要完全重新设置）
    // editor.setOptions({
    //   editorProps: {
    //     attributes: {
    //       placeholder: charCount > 0 ? "" : "开始写作...",
    //     },
    //   },
    // });
  }, [editor, charCount]);
  // 编辑器快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "b":
            e.preventDefault();
            toggleBold();
            break;
          case "i":
            e.preventDefault();
            toggleItalic();
            break;
          case "1":
            if (e.shiftKey) {
              e.preventDefault();
              toggleHeading1();
            }
            break;
          case "2":
            if (e.shiftKey) {
              e.preventDefault();
              toggleHeading2();
            }
            break;
          case "3":
            if (e.shiftKey) {
              e.preventDefault();
              toggleHeading3();
            }
            break;
          case "z":
            if (e.shiftKey) {
              e.preventDefault();
              redo();
            } else {
              e.preventDefault();
              undo();
            }
            break;
          case "y":
            e.preventDefault();
            redo();
            break;
          case "s":
            e.preventDefault();
            saveToLocalStorage();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

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
    redirect("/dashboard");
  };
  return (
    <div className="bg-gray-50 dark:bg-black overflow-hidden">
      {/* 顶部工具栏 - 移动端响应式适配 */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-300 shadow-sm ">
        <div className="max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-3">
          {/* 主工具栏 - 移动端使用更紧凑布局 */}
          <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-2 md:mb-3">
            {/* 文本样式 */}
            <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-gray-200 dark:border-gray-800 pr-1 md:pr-3">
              <button
                onClick={toggleBold}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("bold") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="粗体 (Ctrl+B)"
              >
                <Bold className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={toggleItalic}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("italic") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="斜体 (Ctrl+I)"
              >
                <Italic className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={toggleStrike}
                className={`hidden sm:block p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("strike") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="删除线"
              >
                <Strikethrough className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* 字体 - 移动端隐藏 */}
            <div className="hidden md:flex items-center space-x-1 border-r border-gray-200 dark:border-gray-800 pr-3">
              <button
                onClick={() => setShowFontModal(true)}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200"
                title="设置字体"
              >
                <Type className="w-5 h-5" />
              </button>
            </div>

            {/* 标题 */}
            <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-gray-200 dark:border-gray-800 pr-1 md:pr-3">
              <button
                onClick={toggleHeading1}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("heading", { level: 1 }) ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="一级标题 (Shift+1)"
              >
                <span className="text-xs md:text-sm font-bold">H1</span>
              </button>
              <button
                onClick={toggleHeading2}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("heading", { level: 2 }) ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="二级标题 (Shift+2)"
              >
                <span className="text-xs md:text-sm font-bold">H2</span>
              </button>
              <button
                onClick={toggleHeading3}
                className={`hidden sm:block p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("heading", { level: 3 }) ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="三级标题 (Shift+3)"
              >
                <span className="text-xs md:text-sm font-bold">H3</span>
              </button>
              <button
                onClick={setParagraph}
                className={`hidden md:block p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("paragraph") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="段落"
              >
                <span className="text-sm">正文</span>
              </button>
            </div>

            {/* 列表 */}
            <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-gray-200 dark:border-gray-800 pr-1 md:pr-3">
              <button
                onClick={toggleBulletList}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("bulletList") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="无序列表"
              >
                <List className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={toggleOrderedList}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("orderedList") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="有序列表"
              >
                <ListOrdered className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* 引用和代码 - 移动端隐藏代码块 */}
            <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-gray-200 dark:border-gray-800 pr-1 md:pr-3">
              <button
                onClick={toggleBlockquote}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("blockquote") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="引用"
              >
                <Quote className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={toggleCodeBlock}
                className={`hidden sm:block p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("codeBlock") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="代码块"
              >
                <Code className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* 链接和图片 - 移动端隐藏图片 */}
            <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-gray-200 dark:border-gray-800 pr-1 md:pr-3">
              <button
                onClick={insertLink}
                className={`p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive("link") ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                title="插入链接"
              >
                <LinkIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={insertImage}
                className="hidden sm:block p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200"
                title="插入图片"
              >
                <ImageIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* 分隔线 - 移动端隐藏 */}
            <div className="hidden md:flex items-center space-x-1 border-r border-gray-200 dark:border-gray-800 pr-3">
              <button
                onClick={setHorizontalRule}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200"
                title="分隔线"
              >
                <Minus className="w-5 h-5" />
              </button>
            </div>

            {/* 撤销重做 */}
            <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-gray-200 dark:border-gray-800 pr-1 md:pr-3">
              <button
                onClick={undo}
                className="p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="撤销 (Ctrl+Z)"
                disabled={!editor.can().undo()}
              >
                <Undo className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={redo}
                className="p-1.5 md:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="重做 (Ctrl+Y)"
                disabled={!editor.can().redo()}
              >
                <Redo className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* 清除格式 - 移动端隐藏 */}
            <button
              onClick={clearFormat}
              className="hidden md:block p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200"
              title="清除格式"
            >
              <Highlighter className="w-5 h-5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="md:hidden p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={toggleStrike}>
                  <Strikethrough className="w-4 h-4 mr-2" />
                  删除线
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleHeading3}>
                  <span className="font-bold mr-2">H3</span>
                  三级标题
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleCodeBlock}>
                  <Code className="w-4 h-4 mr-2" />
                  代码块
                </DropdownMenuItem>
                <DropdownMenuItem onClick={insertImage}>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  插入图片
                </DropdownMenuItem>
                <DropdownMenuItem onClick={setHorizontalRule}>
                  <Minus className="w-4 h-4 mr-2" />
                  分隔线
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearFormat}>
                  <Highlighter className="w-4 h-4 mr-2" />
                  清除格式
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 操作按钮栏 - 移动端响应式布局 */}
          <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                {/* 字数: {wordCount} |  */}
                字符: {charCount}
              </span>
            </div>

            <div className="flex items-center space-x-1 md:space-x-2">
              {/* <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteNote(note.id);
                }}
              >
                <Trash className="" />
              </Button> */}

              <button
                onClick={() => onChange && onChange(content)}
                className="px-2 md:px-3 py-1 text-xs md:text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors duration-200 border border-blue-200 dark:border-blue-800"
              >
                保存
              </button>
              {/* <button
                onClick={loadFromLocalStorage}
                className="hidden sm:block px-2 md:px-3 py-1 text-xs md:text-sm bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors duration-200 border border-green-200 dark:border-green-800"
              >
                加载
              </button> */}
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
              {/* <button
                onClick={() => setIsPreview(!isPreview)}
                className="px-2 md:px-3 py-1 text-xs md:text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-200 dark:border-gray-700"
              >
                {isPreview ? "编辑" : "预览"}
              </button> */}
              <button
                onClick={() => { handleDeleteNote(noteId) }}
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

      {/* 编辑器区域 - 移动端padding调整 */}
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

      {/* 字体设置弹窗 */}
      {showFontModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              设置字体
            </h3>
            <input
              type="text"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              placeholder="输入字体名称 (如: Arial, 微软雅黑)"
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowFontModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={setFont}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
