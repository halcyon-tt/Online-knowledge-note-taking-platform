"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";

interface SidebarSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function SidebarSearch({
  searchQuery,
  onSearchChange,
}: SidebarSearchProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="px-2 pt-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索笔记..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
