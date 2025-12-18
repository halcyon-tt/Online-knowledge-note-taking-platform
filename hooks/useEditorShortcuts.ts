import { useEffect } from "react"
import { useEditorOperations } from "./useEditorOperations"
export const useEditorShortcuts = (editor: any, operations: ReturnType<typeof useEditorOperations>) => {
    // 编辑器快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.shiftKey && e.ctrlKey) || e.metaKey) {
                switch (e.code) {
                    case "b":
                        e.preventDefault();
                        operations.toggleBold();
                        break;
                    case "i":
                        e.preventDefault();
                        operations.toggleItalic();
                        break;
                    case "1":
                        if (e.shiftKey) {
                            e.preventDefault();
                            operations.toggleHeading1();
                        }
                        break;
                    case "2":
                        if (e.shiftKey) {
                            e.preventDefault();
                            operations.toggleHeading2();
                        }
                        break;
                    case "3":
                        if (e.shiftKey) {
                            e.preventDefault();
                            operations.toggleHeading3();
                        }
                        break;
                    case "z":
                        if (e.shiftKey) {
                            e.preventDefault();
                            operations.redo();
                        } else {
                            e.preventDefault();
                            operations.undo();
                        }
                        break;
                    case "y":
                        e.preventDefault();
                        operations.redo();
                        break;
                    // case "s":
                    //     e.preventDefault();
                    //     saveToLocalStorage();
                    //     break;
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [editor]);
}