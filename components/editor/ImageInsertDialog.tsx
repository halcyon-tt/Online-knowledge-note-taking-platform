"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageInsertDialogProps {
    editor: any;
    onClose: () => void;
    onInsert?: (url: string) => void;
    maxSize?: number; // 最大文件大小（字节）
    allowedTypes?: string[]; // 允许的文件类型
}

export default function ImageInsertDialog({
    editor,
    onClose,
    onInsert, //自定义插入逻辑
    maxSize = 5 * 1024 * 1024, // 默认最大5MB
    allowedTypes = ["image/jpeg", "image/png", "image/gif"], // 默认允许的文件类型
}: ImageInsertDialogProps) {
    const [url, setUrl] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // 清理对象 URL 防止内存泄漏
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);


    // 处理URL插入
    const handleInsertByUrl = useCallback(() => {
        if (url.trim()) {
            editor?.chain().focus().setImage({ src: url.trim() }).run();
            setUrl("");
            onClose();
        }
    }, [editor, url, onClose]);

    // 处理文件选择
    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // 验证文件类型
            if (!allowedTypes.includes(file.type)) {
                alert("请选择图片文件 (JPG, PNG, GIF等)");
                return;
            }

            // 验证文件大小（限制5MB）
            if (file.size > 5 * 1024 * 1024) {
                alert("图片大小不能超过5MB");
                return;
            }

            // 创建本地预览
            // const reader = new FileReader();
            // reader.onload = (event) => {
            //     const base64 = event.target?.result as string;
            //     setPreviewUrl(base64);
            // };
            // reader.readAsDataURL(file);
            // 使用 createObjectURL 创建预览（性能更好）
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        },
        []
    );

    // 插入预览的图片
    const insertPreviewImage = useCallback(() => {
        if (previewUrl) {
            if (onInsert) {
                onInsert(previewUrl);
            } else {
                editor?.chain().focus().setImage({ src: previewUrl }).run();
            }
            onClose();
        }
    }, [editor, previewUrl, onClose]);

    // 手动触发文件选择
    const handleSelectFile = () => {
        fileInputRef.current?.click();
    };

    // 清除预览
    const clearPreview = () => {
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    // 处理键盘事件（ESC 关闭，Enter 确认）
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
            if (e.key === "Enter" && url.trim()) {
                handleInsertByUrl();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, url, handleInsertByUrl]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        插入图片
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* URL输入部分 */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            通过URL插入
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleInsertByUrl();
                                    }
                                }}
                            />
                            <Button
                                onClick={handleInsertByUrl}
                                disabled={!url.trim()}
                                size="sm"
                            >
                                插入
                            </Button>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                                或
                            </span>
                        </div>
                    </div>

                    {/* 文件上传部分 */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            从本地上传
                        </label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {previewUrl ? (
                                <div className="relative mb-4">
                                    <img
                                        src={previewUrl || "/placeholder.svg"}
                                        alt="预览"
                                        className="max-h-48 mx-auto rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={clearPreview}
                                        className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        支持 JPG, PNG, GIF 格式，最大 5MB
                                    </p>
                                </>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSelectFile}
                                className="w-full bg-transparent"
                            >
                                {previewUrl ? "重新选择" : "选择图片文件"}
                            </Button>

                            {previewUrl && (
                                <Button onClick={insertPreviewImage} className="w-full mt-2">
                                    插入图片
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <Button variant="outline" onClick={onClose}>
                        取消
                    </Button>
                </div>
            </div>
        </div>
    );
}
