"use client";

import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import FontFamily from '@tiptap/extension-font-family';
import Image from '@tiptap/extension-image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Strikethrough,
  Highlighter,
  Type,
  Minus,
} from 'lucide-react';

interface TiptapProps {
  initialContent?: string;
  onChange?: (content: string) => void;
}

export default function Tiptap({ initialContent = '', onChange }: TiptapProps) {
  const [content, setContent] = useState(initialContent);
  const [isPreview, setIsPreview] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);
  const [fontFamily, setFontFamily] = useState('');

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
          class: 'text-blue-400 hover:text-blue-300 underline transition-colors duration-200',
        },
      }),
      Placeholder.configure({
        placeholder: '开始写作...',
      }),
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg border-2 border-gray-700 hover:border-blue-500 transition-all duration-300',
        },
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();

      // 手动计算字符数和字数
      setContent(html);
      setWordCount(text.split(/\s+/).filter(word => word.length > 0).length);
      setCharCount(text.length);

      if (onChange) {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[600px] p-6 prose-headings:text-gray-100 prose-p:text-gray-300 prose-strong:text-gray-100 prose-em:text-gray-300 prose-code:text-green-400 prose-blockquote:text-gray-400 prose-ul:text-gray-300 prose-ol:text-gray-300 prose-li:text-gray-300',
      },
    },
  });

  // 工具栏按钮功能
  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleStrike = () => editor?.chain().focus().toggleStrike().run();
  const toggleHeading1 = () => {
    console.log('设置一级标题');
    editor?.chain().focus().toggleHeading({ level: 1 }).run();
  };
  const toggleHeading2 = () => {
    console.log('设置二级标题');
    editor?.chain().focus().toggleHeading({ level: 2 }).run();
  };
  const toggleHeading3 = () => {
    console.log('设置三级标题');
    editor?.chain().focus().toggleHeading({ level: 3 }).run();
  };
  const toggleHeading4 = () => editor?.chain().focus().toggleHeading({ level: 4 }).run();
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () => editor?.chain().focus().toggleBlockquote().run();
  const toggleCode = () => editor?.chain().focus().toggleCode().run();
  const toggleCodeBlock = () => editor?.chain().focus().toggleCodeBlock().run();
  const undo = () => editor?.chain().focus().undo().run();
  const redo = () => editor?.chain().focus().redo().run();
  const setHorizontalRule = () => editor?.chain().focus().setHorizontalRule().run();

  // 插入图片
  const insertImage = useCallback(() => {
    const url = window.prompt('请输入图片 URL');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  // 插入链接
  const insertLink = useCallback(() => {
    const url = window.prompt('请输入 URL');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  // 设置字体
  const setFont = () => {
    if (fontFamily.trim() && editor) {
      editor.chain().focus().setFontFamily(fontFamily).run();
      setFontFamily('');
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
    if (!editor) return '';

    const html = editor.getHTML();
    let markdown = html
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
      .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n')
      .replace(/<h5>(.*?)<\/h5>/g, '##### $1\n\n')
      .replace(/<h6>(.*?)<\/h6>/g, '###### $1\n\n')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1')
      .replace(/<ul>(.*?)<\/ul>/g, '$1')
      .replace(/<li>(.*?)<\/li>/g, '- $1\n')
      .replace(/<ol>(.*?)<\/ol>/g, '$1')
      .replace(/<li>(.*?)<\/li>/g, '1. $1\n')
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<img src="(.*?)".*?>/g, '![图片]($1)')
      .replace(/<hr>/g, '\n---\n')
      .replace(/<br>/g, '\n')
      .replace(/<[^>]*>/g, '');

    // 下载文件
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
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
      alert('内容已复制到剪贴板！');
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 保存到本地存储
  const saveToLocalStorage = () => {
    if (!editor) return;

    const content = editor.getHTML();
    localStorage.setItem('tiptap-content', content);
    alert('内容已保存到本地存储！');
  };

  // 从本地存储加载
  const loadFromLocalStorage = () => {
    const savedContent = localStorage.getItem('tiptap-content');
    if (savedContent && editor) {
      editor.commands.setContent(savedContent);
      alert('内容已从本地存储加载！');
    }
  };

  // 重置编辑器
  const resetEditor = () => {
    if (confirm('确定要清空编辑器吗？')) {
      editor?.commands.clearContent();
      setContent('');
    }
  };

  // 编辑器快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            toggleBold();
            break;
          case 'i':
            e.preventDefault();
            toggleItalic();
            break;
          case '1':
            if (e.shiftKey) {
              e.preventDefault();
              toggleHeading1();
            }
            break;
          case '2':
            if (e.shiftKey) {
              e.preventDefault();
              toggleHeading2();
            }
            break;
          case '3':
            if (e.shiftKey) {
              e.preventDefault();
              toggleHeading3();
            }
            break;
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              redo();
            } else {
              e.preventDefault();
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 's':
            e.preventDefault();
            saveToLocalStorage();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  return (
    <div className=" bg-gray-50 dark:bg-black">
      {/* 顶部工具栏 */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-300 shadow-sm ">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* 主工具栏 */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* 文本样式 */}
            <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-800 pr-3">
              <button
                onClick={toggleBold}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive('bold') ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                title="粗体 (Ctrl+B)"
              >
                <Bold className="w-5 h-5" />
              </button>
              <button
                onClick={toggleItalic}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive('italic') ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                title="斜体 (Ctrl+I)"
              >
                <Italic className="w-5 h-5" />
              </button>
              <button
                onClick={toggleStrike}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive('strike') ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                title="删除线"
              >
                <Strikethrough className="w-5 h-5" />
              </button>
            </div>

            {/* 字体 */}
            <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-800 pr-3">
              <button
                onClick={() => setShowFontModal(true)}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200"
                title="设置字体"
              >
                <Type className="w-5 h-5" />
              </button>
            </div>

            {/* 标题 */}
            <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-800 pr-3">
              <button
                onClick={toggleHeading1}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                title="一级标题 (Shift+1)"
              >
                <span className="text-sm font-bold">H1</span>
              </button>
              <button
                onClick={toggleHeading2}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                title="二级标题 (Shift+2)"
              >
                <span className="text-sm font-bold">H2</span>
              </button>
              <button
                onClick={toggleHeading3}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                title="三级标题 (Shift+3)"
              >
                <span className="text-sm font-bold">H3</span>
              </button>
              <button
                onClick={setParagraph}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive('paragraph') ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                title="段落"
              >
                <span className="text-sm">正文</span>
              </button>
            </div>

            {/* 列表 */}
            <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-800 pr-3">
              <button
                onClick={toggleBulletList}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive('bulletList') ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                title="无序列表"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={toggleOrderedList}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive('orderedList') ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                title="有序列表"
              >
                <ListOrdered className="w-5 h-5" />
              </button>
            </div>

            {/* 引用和代码 */}
            <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-800 pr-3">
              <button
                onClick={toggleBlockquote}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive('blockquote') ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                title="引用"
              >
                <Quote className="w-5 h-5" />
              </button>
              <button
                onClick={toggleCodeBlock}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive('codeBlock') ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                title="代码块"
              >
                <Code className="w-5 h-5" />
              </button>
            </div>

            {/* 链接和图片 */}
            <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-800 pr-3">
              <button
                onClick={insertLink}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${editor.isActive('link') ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                title="插入链接"
              >
                <LinkIcon className="w-5 h-5" />
              </button>
              <button
                onClick={insertImage}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200"
                title="插入图片"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>

            {/* 分隔线 */}
            <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-800 pr-3">
              <button
                onClick={setHorizontalRule}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200"
                title="分隔线"
              >
                <Minus className="w-5 h-5" />
              </button>
            </div>

            {/* 撤销重做 */}
            <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-800 pr-3">
              <button
                onClick={undo}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="撤销 (Ctrl+Z)"
                disabled={!editor.can().undo()}
              >
                <Undo className="w-5 h-5" />
              </button>
              <button
                onClick={redo}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="重做 (Ctrl+Y)"
                disabled={!editor.can().redo()}
              >
                <Redo className="w-5 h-5" />
              </button>
            </div>

            {/* 清除格式 */}
            <button
              onClick={clearFormat}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-200"
              title="清除格式"
            >
              <Highlighter className="w-5 h-5" />
            </button>
          </div>

          {/* 操作按钮栏 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                字数: {wordCount} | 字符: {charCount}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={saveToLocalStorage}
                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors duration-200 border border-blue-200 dark:border-blue-800"
              >
                保存
              </button>
              <button
                onClick={loadFromLocalStorage}
                className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors duration-200 border border-green-200 dark:border-green-800"
              >
                加载
              </button>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors duration-200 border border-purple-200 dark:border-purple-800"
              >
                复制
              </button>
              <button
                onClick={exportToMarkdown}
                className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors duration-200 border border-indigo-200 dark:border-indigo-800"
              >
                导出Markdown
              </button>
              <button
                onClick={resetEditor}
                className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors duration-200 border border-red-200 dark:border-red-800"
              >
                清空
              </button>
              <button
                onClick={() => setIsPreview(!isPreview)}
                className={`px-3 py-1 text-sm rounded transition-colors duration-200 border ${isPreview
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-800'}`}
              >
                {isPreview ? '编辑模式' : '预览模式'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 编辑器和预览区域 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isPreview ? (
          // 预览模式
          <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 p-6 h-[600px] transition-colors duration-200 overflow-y-auto">
            <div className="tiptap-editor prose prose-lg dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-em:text-gray-700 dark:prose-em:text-gray-300 prose-code:text-green-600 dark:prose-code:text-green-400 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-ol:text-gray-700 dark:prose-ol:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content
                  .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
                  .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
                  .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
                  .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n')
                  .replace(/<h5>(.*?)<\/h5>/g, '##### $1\n\n')
                  .replace(/<h6>(.*?)<\/h6>/g, '###### $1\n\n')
                  .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
                  .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
                  .replace(/<em>(.*?)<\/em>/g, '*$1*')
                  .replace(/<code>(.*?)<\/code>/g, '`$1`')
                  .replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1')
                  .replace(/<ul>(.*?)<\/ul>/g, '$1')
                  .replace(/<li>(.*?)<\/li>/g, '- $1\n')
                  .replace(/<ol>(.*?)<\/ol>/g, '$1')
                  .replace(/<li>(.*?)<\/li>/g, '1. $1\n')
                  .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
                  .replace(/<img src="(.*?)".*?>/g, '![图片]($1)')
                  .replace(/<hr>/g, '\n---\n')
                  .replace(/<br>/g, '\n')
                  .replace(/<[^>]*>/g, '')}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          // 编辑模式
            <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-300 overflow-hidden transition-colors duration-200 overflow-y-auto h-[650px]">
            <EditorContent
              editor={editor}
              className="tiptap-editor"
            />
          </div>
        )}

        {/* 状态提示 */}
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <p>提示：使用快捷键快速操作（Ctrl+B: 粗体, Ctrl+I: 斜体, Shift+1/2/3: 标题, Ctrl+Z: 撤销, Ctrl+S: 保存）</p>
        </div>
      </div>

      {/* 插入链接模态框 */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">插入链接</h3>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="输入链接地址 (例如: https://example.com)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                取消
              </button>
              <button
                onClick={insertLink}
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-200"
              >
                插入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 字体设置模态框 */}
      {showFontModal && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">设置字体</h3>
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => {
                    editor?.chain().focus().setFontFamily('Arial').run();
                    setShowFontModal(false);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-gray-900 dark:text-gray-100 transition-colors duration-200"
                >
                  Arial
                </button>
                <button
                  onClick={() => {
                    editor?.chain().focus().setFontFamily('Times New Roman').run();
                    setShowFontModal(false);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-gray-900 dark:text-gray-100 transition-colors duration-200"
                >
                  Times New Roman
                </button>
                <button
                  onClick={() => {
                    editor?.chain().focus().setFontFamily('Courier New').run();
                    setShowFontModal(false);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-gray-900 dark:text-gray-100 transition-colors duration-200"
                >
                  Courier New
                </button>
                <button
                  onClick={() => {
                    editor?.chain().focus().setFontFamily('Georgia').run();
                    setShowFontModal(false);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-gray-900 dark:text-gray-100 transition-colors duration-200"
                >
                  Georgia
                </button>
              </div>
              <input
                type="text"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                placeholder="输入字体名称 (例如: 宋体, 微软雅黑)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowFontModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                取消
              </button>
              <button
                onClick={setFont}
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-200"
              >
                设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}