"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { getLocalNote, updateLocalNote } from "@/lib/local-storage";
import NoteEditor from "@/components/note-editor"; // 确保路径正确
import type { Note } from "@/types/note";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function NotePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const useLocalStorage = !isSupabaseConfigured();

  useEffect(() => {
    async function loadNote() {
      if (useLocalStorage) {
        const localNote = getLocalNote(id);
        if (!localNote) {
          router.push("/dashboard");
          return;
        }
        setNote(localNote);
      } else {
        const supabase = createClient();
        if (!supabase) {
          router.push("/dashboard");
          return;
        }

        const { data, error } = await supabase
          .from("notes")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) {
          router.push("/dashboard");
          return;
        }
        setNote(data as Note);
      }
      setLoading(false);
    }
    loadNote();
  }, [id, useLocalStorage, router]);

  // 处理内容变化的函数
  const handleContentChange = async (content: string) => {
    if (!note) return;

    const updatedNote = {
      ...note,
      content,
      updated_at: new Date().toISOString(),
    };

    if (useLocalStorage) {
      // 更新本地存储
      updateLocalNote(id, updatedNote);
    } else {
      // 更新到Supabase
      const supabase = createClient();
      if (!supabase) return;

      try {
        const { error } = await supabase
          .from("notes")
          .update({
            content: content,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) {
          console.error("更新失败:", error);
        }
      } catch (error) {
        console.error("更新出错:", error);
      }
    }

    setNote(updatedNote);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载笔记内容中...</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">笔记不存在或已被删除</p>
      </div>
    );
  }

  return (


    <NoteEditor
      initialContent={note.content || ''}
      onChange={handleContentChange}
    />

  );
}