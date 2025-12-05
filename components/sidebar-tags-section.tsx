"use client";

import { useState } from "react";
import { Plus, Tag, ChevronDown, ChevronRight, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import type { Tag as TagType } from "@/types/note";

interface SidebarTagsSectionProps {
  tags: TagType[];
  selectedTags: string[];
  onTagCreate: (name: string) => void;
  onTagDelete: (tagId: string) => void;
  onTagToggle: (tagName: string) => void;
  onClearFilter: () => void;
}

export function SidebarTagsSection({
  tags,
  selectedTags,
  onTagCreate,
  onTagDelete,
  onTagToggle,
  onClearFilter,
}: SidebarTagsSectionProps) {
  const [showTagsSection, setShowTagsSection] = useState(true);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const handleCreateTag = () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;

    if (tags.some((t) => t.name === trimmedName)) {
      alert("标签已存在");
      return;
    }

    onTagCreate(trimmedName);
    setIsPopoverOpen(false);
    setNewTagName("");
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel
        className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded px-2 -mx-2"
        onClick={() => setShowTagsSection(!showTagsSection)}
      >
        <div className="flex items-center gap-1">
          {showTagsSection ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <Tag className="h-3.5 w-3.5" />
          <span>标签</span>
        </div>
        <span className="text-xs text-muted-foreground">{tags.length}</span>
      </SidebarGroupLabel>
      {showTagsSection && (
        <SidebarGroupContent className="overflow-hidden">
          <div className="px-2 space-y-2 overflow-hidden min-w-0 max-w-full">
            {/* 新建标签 */}
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  新建标签
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="flex gap-1">
                  <Input
                    placeholder="标签名称"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                    className="h-7 text-xs"
                  />
                  <Button
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleCreateTag}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* 标签列表 */}
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto overflow-x-hidden min-w-0 max-w-full">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={
                    selectedTags.includes(tag.name) ? "default" : "outline"
                  }
                  className="cursor-pointer text-xs h-6 group max-w-[100px] min-w-0 flex-shrink-0 overflow-hidden"
                >
                  <span
                    className={`w-2 h-2 rounded-full mr-1 flex-shrink-0 ${tag.color}`}
                  />
                  <span
                    className="truncate min-w-0 flex-1"
                    onClick={() => onTagToggle(tag.name)}
                  >
                    {tag.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagDelete(tag.id);
                    }}
                    className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {tags.length === 0 && (
                <p className="text-xs text-muted-foreground">暂无标签</p>
              )}
            </div>

            {/* 已选标签提示 */}
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center h-6 text-xs text-muted-foreground"
                onClick={onClearFilter}
              >
                清除筛选 ({selectedTags.length})
              </Button>
            )}
          </div>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}
