import type React from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Note } from "@/types/note";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let notes: Note[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from("notes")
        .select("*")
        .order("updated_at", { ascending: false });
      notes = (data as Note[]) || [];
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar notes={notes} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b border-border px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
