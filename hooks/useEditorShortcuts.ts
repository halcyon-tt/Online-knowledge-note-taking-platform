import { useEffect } from "react"

// hooks/useEditorShortcuts.ts
export type ShortcutAction =
    | 'toggleBold'
    | 'toggleItalic'
    | 'toggleHeading1'
    | 'toggleHeading2'
    | 'toggleHeading3'
    | 'undo'
    | 'redo'
    | 'saveToLocalStorage'
    | 'copyToClipboard' // 添加复制到剪贴板操作
    | 'exportToMarkdown'
    | 'resetEditor';

// 定义快捷键配置的结构
export interface ShortcutConfig {
    key: string;           // 按下的键（如 's', 'b'）
    ctrlKey?: boolean;     // 是否需要Ctrl键
    shiftKey?: boolean;    // 是否需要Shift键
    altKey?: boolean;      // 是否需要Alt键
    metaKey?: boolean;     // 是否需要Meta键（Mac的Command键）
    action: ShortcutAction; // 对应的操作类型
    description: string;    // 快捷键的描述（用于提示或调试）
}

export const defaultShortcuts: ShortcutConfig[] = [
    {
        key: 'b',
        ctrlKey: true,
        action: 'toggleBold',
        description: '切换粗体'
    },
    {
        key: 'i',
        ctrlKey: true,
        action: 'toggleItalic',
        description: '切换斜体'
    },
    {
        key: 'z',
        ctrlKey: true,
        action: 'undo',
        description: '撤销'
    },
    {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        action: 'redo',
        description: '重做'
    },
    {
        key: 'y',
        ctrlKey: true,
        action: 'redo',
        description: '重做'
    },
    {
        key: '1',
        ctrlKey: true,
        shiftKey: true,
        action: 'toggleHeading1',
        description: '一级标题'
    },
    {
        key: '2',
        ctrlKey: true,
        shiftKey: true,
        action: 'toggleHeading2',
        description: '二级标题'
    },
    {
        key: '3',
        ctrlKey: true,
        shiftKey: true,
        action: 'toggleHeading3',
        description: '三级标题'
    },
    {
        key: 's',
        ctrlKey: true,
        action: 'saveToLocalStorage',
        description: '保存到本地存储'
    },
    {
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        action: 'exportToMarkdown',
        description: '导出为Markdown'
    },
];



export const useEditorShortcuts = (
    editor: any,
    operations: Record<string, () => void>, // operations: useEditorOperations,编辑器的操作函数
    customCallbacks: Record<string, () => void> = {}, // 自定义快捷键的回调函数 比如存本地
    customShortcuts: ShortcutConfig[] = [] // 自定义快捷键配置，覆盖默认的
) => {
    useEffect(() => {
        // 将默认快捷键和自定义快捷键合并
        const allShortcuts = [...defaultShortcuts, ...customShortcuts];
        // 将操作函数和自定义回调函数合并
        const actionHandlers: Record<ShortcutAction, () => void> = {
            ...operations,
            ...customCallbacks,
        } as Record<ShortcutAction, () => void>;

        // 处理键盘事件
        const handleKeyDown = (e: KeyboardEvent) => {
            const pressedKey = e.key.toLowerCase();

            // 查找匹配的快捷键配置
            const matchedShortcut = allShortcuts.find(shortcut => {
                return shortcut.key.toLowerCase() === pressedKey &&
                    !!shortcut.ctrlKey === (e.ctrlKey || e.metaKey) &&
                    !!shortcut.shiftKey === e.shiftKey &&
                    !!shortcut.altKey === e.altKey &&
                    (shortcut.metaKey === undefined || !!shortcut.metaKey === e.metaKey);
            });

            console.log("matchedShortcut", matchedShortcut?.description)

            if (matchedShortcut) {
                e.preventDefault();
                const handler = actionHandlers[matchedShortcut.action];
                if (handler) {
                    handler();
                    // 可选：添加快捷键执行反馈
                    console.log(`执行快捷键: ${matchedShortcut.description}`);
                } else {
                    console.log(`未找到快捷键: ${matchedShortcut.description} 对应的操作函数`)
                }
            }
        };
        // 使用捕获阶段确保我们的处理程序先执行
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [editor, operations, customCallbacks, customShortcuts]);
};