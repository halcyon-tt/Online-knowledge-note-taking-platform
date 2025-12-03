"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Home } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { createLocalNote, getLocalNotes } from "@/lib/local-storage";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Note } from "@/types/note";

interface AppSidebarProps {
  notes: Note[];
}

export function AppSidebar({ notes: initialNotes }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const useLocalStorage = !isSupabaseConfigured();

  useEffect(() => {
    if (useLocalStorage) {
      setNotes(getLocalNotes());
    }
  }, [useLocalStorage]);

  const handleCreateNote = async () => {
    if (useLocalStorage) {
      const newNote = createLocalNote({ title: "未命名笔记", content: "" });
      setNotes(getLocalNotes());
      router.push(`/dashboard/notes/${newNote.id}`);
    } else {
      // Supabase 模式
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("notes")
        .insert({ title: "未命名笔记", content: "" })
        .select()
        .single();

      if (!error && data) {
        router.push(`/dashboard/notes/${data.id}`);
        router.refresh();
      }
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <span className="font-semibold text-lg">笔记</span>
          </Link>
          <ThemeToggle />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                  <Link href="/dashboard">
                    <Home className="h-4 w-4" />
                    <span>首页</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>我的笔记</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleCreateNote}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {notes.map((note) => (
                <SidebarMenuItem key={note.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/dashboard/notes/${note.id}`}
                  >
                    <Link href={`/dashboard/notes/${note.id}`}>
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{note.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {notes.length === 0 && (
                <p className="px-2 py-4 text-sm text-muted-foreground text-center">
                  暂无笔记
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <Button onClick={handleCreateNote} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          新建笔记
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
