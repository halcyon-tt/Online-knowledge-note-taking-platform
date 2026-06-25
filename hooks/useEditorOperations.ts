import { useCallback } from "react";
export const useEditorOperations= (editor: any) => {
    // 工具栏按钮功能
    const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
    const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
    const toggleStrike = () => editor?.chain().focus().toggleStrike().run();
    const toggleHeading1 = () => {
        // console.log("设置一级标题");
        editor?.chain().focus().toggleHeading({ level: 1 }).run();
    };
    const toggleHeading2 = () => {
        // console.log("设置二级标题");
        editor?.chain().focus().toggleHeading({ level: 2 }).run();
    };
    const toggleHeading3 = () => {
        // console.log("设置三级标题");  // 单行注释：用于说明这行代码的用途，这里表示输出"设置三级标题"到控制台
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
    /**
     * 插入链接功能
     * 该组件用于在富文本编辑器中插入链接
     * 用户可以选择文本并添加链接地址
     */
    // 插入链接
    const insertLink = useCallback(() => {
        const url = window.prompt("请输入 URL");
        if (url) {
            editor?.chain().focus().setLink({ href: url }).run();
        }
    }, [editor]);

    // 清除格式
    const clearFormat = () => {
        editor?.chain().focus().clearNodes().unsetAllMarks().run();
    };

    // 重置为段落
    const setParagraph = () => {
        editor?.chain().focus().setParagraph().run();
    };

    return {
        toggleBold,
        toggleItalic,
        toggleStrike,
        toggleHeading1,
        toggleHeading2,
        toggleHeading3,
        toggleHeading4,
        toggleBulletList,
        toggleOrderedList,
        toggleBlockquote,
        toggleCode,
        toggleCodeBlock,
        clearFormat,
        setParagraph,
        undo,
        redo,
        setHorizontalRule,
        insertLink
    }
}