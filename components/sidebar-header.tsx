"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { SidebarHeader } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export function SidebarHeaderComponent() {
  return (
    <SidebarHeader className="border-b border-border p-4">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <span className="font-semibold text-lg">笔记</span>
        </Link>
        <ThemeToggle />
      </div>
    </SidebarHeader>
  );
}
