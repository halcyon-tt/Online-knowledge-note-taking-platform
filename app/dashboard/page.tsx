"use client";

import { useEffect, useState } from "react";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth-utils";
import { createLocalNote, getLocalNotes } from "@/lib/local-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Note } from "@/types/note";

export default function DashboardPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const useLocalStorage = !isSupabaseConfigured();


  useEffect(() => {
    async function loadNotes() {
      if (useLocalStorage) {
        setNotes(getLocalNotes().slice(0, 6));
      } else {
        const supabase = createClient();
        if (supabase) {
          const userId = await getUserId();
          if (userId) {
            const { data } = await supabase
              .from("notes")
              .select("*")
              .eq("user_id", userId)
              .order("updated_at", { ascending: false })
              .limit(6);
            setNotes((data as Note[]) || []);
          } else {
            setNotes([]);
          }
        }
      }
      setLoading(false);
    }
    loadNotes();
  }, [useLocalStorage]);

  const handleCreateNote = async () => {
    if (useLocalStorage) {
      const newNote = createLocalNote({ title: "未命名笔记", content: "" });
      router.push(`/dashboard/notes/${newNote.id}`);
    } else {
      const supabase = createClient();
      if (!supabase) return;

      const userId = await getUserId();
      if (!userId) {
        alert("请先登录");
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("notes")
        .insert({ title: "未命名笔记", content: "", user_id: userId })
        .select()
        .single();
      if (data) {
        router.push(`/dashboard/notes/${data.id}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">欢迎回来</h1>
        <p className="text-muted-foreground mt-2">
          开始编写你的 Markdown 笔记
          {useLocalStorage && (
            <span className="text-yellow-500 ml-2">(本地存储模式)</span>
          )}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleCreateNote}
            >
              <Plus className="h-5 w-5 mr-2" />
              新建笔记
            </Button>
          </CardContent>
        </Card>

        {notes.map((note) => (
          <Link key={note.id} href={`/dashboard/notes/${note.id}`}>
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  <span className="truncate">{note.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {note.content
                    ? note.content.replace(/<[^>]*>/g, "").slice(0, 100)
                    : "暂无内容"}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  {new Date(note.updated_at).toLocaleDateString("zh-CN")}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
