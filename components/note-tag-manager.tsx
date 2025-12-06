"use client";

import { useState, useEffect, use } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth-utils";
import {
  getLocalTags,
  addTagToNote,
  removeTagFromNote,
  getLocalNotes,
} from "@/lib/local-storage";
import type { Tag } from "@/types/note";

interface NoteTagManagerProps {
  noteId: string;
  noteTags: string[];
  onTagsChange: (tags: string[]) => void;// 传入tag的id
}

export function NoteTagManager({
  noteId,
  noteTags,
  onTagsChange,
}: NoteTagManagerProps) {
  // const [tags, setTags] = useState<Tag[]>([]);
  // const [open, setOpen] = useState(false);
  // const useLocalStorage = !isSupabaseConfigured();

  // useEffect(() => {
  //   async function loadTags() {
  //     if (useLocalStorage) {
  //       setTags(getLocalTags());
  //     } else {
  //       const supabase = createClient();
  //       if (!supabase) return;

  //       const userId = await getUserId();
  //       if (!userId) {
  //         setTags([]);
  //         return;
  //       }

  //       const t = await supabase
  //         .from("tags")
  //         .select("*")
  //         .eq("user_id", userId)
  //         .order("name");
  //       if (t.data) {
  //         setTags(t.data as Tag[]);
  //       }


  //       const nts: string[] = []
  //       const nt = await supabase
  //         .from("note_tags")
  //         .select("*")
  //         .eq("user_id", userId)
  //         .eq("note_id", noteId)
  //       for (const note_tag of nt.data || []) {
  //         const { data } = await supabase
  //           .from("tags")
  //           .select("*")
  //           .eq("id", note_tag.tag_id)
  //         const [tag] = data as Tag[];
  //         nts.push(tag.name);
  //       }
  //       if (nts.length > 0) {
  //         onTagsChange(nts);
  //       }
  //     }
  //   }
  //   loadTags();
  // }, [useLocalStorage]);

  // const handleAddTag = async (tagId: string) => {
  //   // 检查是否已添加该标签
  //   const tagName = tags.find(t => t.id === tagId)?.name;
  //   if (!tagName) return;

  //   if (useLocalStorage) {
  //     // 本地存储模式
  //     addTagToNote(noteId, tagId);
  //     const updatedNote = getLocalNotes().find((n) => n.id === noteId);
  //     if (updatedNote) {
  //       // 确保返回的是标签名称数组
  //       onTagsChange(updatedNote.tags || []);
  //     }
  //   } else {
  //     // Supabase模式
  //     const supabase = createClient();
  //     if (!supabase) return;

  //     const userId = await getUserId();
  //     if (!userId) {
  //       alert("请先登录");
  //       return;
  //     }

  //     try {
  //       // 正确的字段名：note_id 和 tag_id
  //       const { error } = await supabase
  //         .from("note_tags")
  //         .insert({
  //           tag_id: tagId,
  //           note_id: noteId,
  //           user_id: userId,
  //           created_at: new Date().toISOString()
  //         });

  //       if (error) {
  //         console.error("Error adding tag to note:", error);
  //         alert("添加标签失败: " + error.message);
  //         return;
  //       }

  //       // 更新UI - 这里需要获取标签名称，而不仅仅是ID
  //       const updatedTags = [...noteTags, tagName];
  //       onTagsChange(updatedTags);

  //     } catch (error) {
  //       console.error("Unexpected error:", error);
  //       alert("添加标签时发生未知错误");
  //     }
  //   }

  //   setOpen(false); // 关闭弹出框
  // };

  // const handleRemoveTag = async (tagId: string) => {
  //   if (useLocalStorage) {
  //     removeTagFromNote(noteId, tagName);
  //     const updatedNote = getLocalNotes().find((n) => n.id === noteId);
  //     if (updatedNote) {
  //       onTagsChange(updatedNote.tags || []);
  //     }
  //   } else {
  //     const supabase = createClient();
  //     if (!supabase) return;

  //     const newTags = noteTags.filter((t) => t !== tagName);
  //     const { error } = await supabase
  //       .from("notes")
  //       .update({ tags: newTags, updated_at: new Date().toISOString() })
  //       .eq("id", noteId);

  //     if (!error) {
  //       onTagsChange(newTags);
  //     }
  //   }
  // };

  // const availableTags = tags.filter((t) => !noteTags.includes(t.name));

  // return (
  //   <div className="flex items-center gap-2 flex-wrap">
  //     {noteTags.map((tagName) => {
  //       const tagData = tags.find((t) => t.name === tagName);
  //       return (
  //         <Badge
  //           key={tagName}
  //           variant="secondary"
  //           className="text-xs h-6 gap-1"
  //         >
  //           <span
  //             className={`w-2 h-2 rounded-full ${tagData?.color || "bg-gray-400"}`}
  //           />
  //           {tagName}
  //           <button
  //             onClick={() => handleRemoveTag(tagName)}
  //             className="ml-0.5 hover:text-destructive"
  //           >
  //             <X className="h-3 w-3" />
  //           </button>
  //         </Badge>
  //       );
  //     })}

  //     <Popover open={open} onOpenChange={setOpen}>
  //       <PopoverTrigger asChild>
  //         <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
  //           <Plus className="h-3 w-3 mr-1" />
  //           添加标签
  //         </Button>
  //       </PopoverTrigger>
  //       <PopoverContent className="w-48 p-2" align="start">
  //         {availableTags.length > 0 ? (
  //           <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
  //             {availableTags.map((tag) => (
  //               <div
  //                 key={tag.id}
  //                 className="flex items-center p-2 rounded hover:bg-accent cursor-pointer"
  //                 onClick={() => handleAddTag(tag.id)}
  //               >
  //                 <span
  //                   className={`w-3 h-3 rounded-full mr-2 ${tag.color || 'bg-gray-400'
  //                     }`}
  //                 />
  //                 <span className="text-xs flex-1">{tag.name}</span>
  //                 <Plus className="h-3 w-3 text-muted-foreground" />
  //               </div>
  //             ))}
  //           </div>
  //         ) : (
  //           <p className="text-xs text-muted-foreground text-center py-2">
  //             {tags.length === 0 ? "请先在侧边栏创建标签" : "所有标签已添加"}
  //           </p>
  //         )}
  //       </PopoverContent>
  //     </Popover>
  //   </div>
  // );

  return <>开发中</>
}
