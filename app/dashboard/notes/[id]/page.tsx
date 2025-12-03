"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { getLocalNote } from "@/lib/local-storage";
import { NoteEditor } from "@/components/note-editor";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!note) {
    return null;
  }

  return <NoteEditor note={note} useLocalStorage={useLocalStorage} />;
}
