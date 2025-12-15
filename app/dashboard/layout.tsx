"use client";

import type React from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCurrentFolderIdStore } from "@/lib/store/folders";
import { NotesProvider } from '@/contexts/NotesContext';

function MainContent({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  const isMobile = useIsMobile();
  const isExpanded = state === "expanded";

  return (
    <div
      className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-200 ease-linear"
      style={{
        marginLeft: isMobile ? 0 : isExpanded ? "16rem" : "0rem",
      }}
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <SidebarTrigger className="-ml-1" />
        <span className="text-sm text-muted-foreground">Markdown 笔记</span>
      </header>
      <main className="flex-1 overflow-auto hide-scrollbar">{children}</main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { setCurrentFolderId } = useCurrentFolderIdStore();
  useEffect(() => {
    if (!pathname.includes("folders")) return;
    else setCurrentFolderId("")
  }, [pathname]);
  return (
    <SidebarProvider>
      <NotesProvider>
        <AppSidebar />
        <MainContent>{children}</MainContent>
      </NotesProvider>
    </SidebarProvider>
  );
}
