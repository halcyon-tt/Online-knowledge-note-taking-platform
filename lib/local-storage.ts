import type { Folder, Note, Tag } from "@/types/note";

const STORAGE_KEY = "local_notes";
const TAGS_STORAGE_KEY = "local_tags"; // 添加标签存储键

const FOLDERS_STORAGE_KEY = "local_folders"; // 添加文件夹存储键


// 获取所有笔记
export function getLocalNotes(): Note[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// 获取所有文件夹
export function getLocalFolders(): Folder[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(FOLDERS_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// 保存所有笔记
export function saveLocalNotes(notes: Note[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// 保存所有文件夹
export function saveLocalFolders(folders: Folder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
}

// 在 lib/local-storage.ts 中添加以下函数
export function updateLocalFolder(updatedFolder: Folder) {
  const folders = getLocalFolders();
  const index = folders.findIndex(f => f.id === updatedFolder.id);
  if (index !== -1) {
    folders[index] = updatedFolder;
    localStorage.setItem('folders', JSON.stringify(folders));
  }
  return updatedFolder;
}

// 在 lib/local-storage.ts 中添加以下函数

// 获取单个文件夹
export function getLocalFolder(folderId: string): Folder | null {
  const folders = getLocalFolders();
  return folders.find(folder => folder.id === folderId) || null;
}

// 删除文件夹
export function deleteLocalFolder(folderId: string): void {
  const folders = getLocalFolders();
  const newFolders = folders.filter(folder => folder.id !== folderId);
  localStorage.setItem('folders', JSON.stringify(newFolders));
}


// 获取单个笔记
export function getLocalNote(id: string): Note | null {
  const notes = getLocalNotes();
  return notes.find((n) => n.id === id) || null;
}

// 创建笔记
export function createLocalNote(
  note: Omit<Note, "id" | "created_at" | "updated_at"> // Omit用于排除id, created_at, updated_at字段
): Note {
  const notes = getLocalNotes();
  const newNote: Note = {
    ...note,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  notes.unshift(newNote);
  saveLocalNotes(notes);
  return newNote;
}

// 创建文件夹
export function createLocalFolder(
  folder: Omit<Folder, "id" | "created_at" | "updated_at" | "notes_id"> // Omit用于排除id, created_at, updated_at, notes_id字段
): Folder {
  const folders = getLocalFolders();
  const newFolder: Folder = {
    ...folder,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notes_id: "",
  };
  folders.unshift(newFolder);
  saveLocalFolders(folders);
  return newFolder;
}

// 更新笔记
export function updateLocalNote(
  id: string,
  updates: Partial<Note>
): Note | null {
  const notes = getLocalNotes();
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return null;

  notes[index] = {
    ...notes[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveLocalNotes(notes);
  return notes[index];
}

// 删除笔记
export function deleteLocalNote(id: string): boolean {
  const notes = getLocalNotes();
  const filtered = notes.filter((n) => n.id !== id);
  if (filtered.length === notes.length) return false;
  saveLocalNotes(filtered);
  return true;
}

// 预设标签颜色
const TAG_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-red-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
];

// 获取所有标签
export function getLocalTags(): Tag[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(TAGS_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// 保存所有标签
export function saveLocalTags(tags: Tag[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
}

// 创建标签
export function createLocalTag(name: string): Tag {
  const tags = getLocalTags();
  const colorIndex = tags.length % TAG_COLORS.length;
  const newTag: Tag = {
    id: crypto.randomUUID(),
    name,
    color: TAG_COLORS[colorIndex],
  };
  tags.push(newTag);
  saveLocalTags(tags);
  return newTag;
}

// 删除标签
export function deleteLocalTag(id: string): boolean {
  const tags = getLocalTags();
  const filtered = tags.filter((t) => t.id !== id);
  if (filtered.length === tags.length) return false;
  saveLocalTags(filtered);

  // 同时从所有笔记中移除该标签
  const notes = getLocalNotes();
  const tag = tags.find((t) => t.id === id);
  if (tag) {
    notes.forEach((note) => {
      if (note.tags?.includes(tag.name)) {
        note.tags = note.tags.filter((t) => t !== tag.name);
      }
    });
    saveLocalNotes(notes);
  }
  return true;
}

// 为笔记添加标签
export function addTagToNote(noteId: string, tagId: string): Note | null {
  const notes = getLocalNotes();
  const index = notes.findIndex((n) => n.id === noteId);
  if (index === -1) return null;

  const currentTags = notes[index].tags || [];
  if (!currentTags.includes(tagId)) {
    notes[index] = {
      ...notes[index],
      tags: [...currentTags, tagId],
      updated_at: new Date().toISOString(),
    };
    saveLocalNotes(notes);
  }
  return notes[index];
}

// 从笔记移除标签
export function removeTagFromNote(
  noteId: string,
  tagId: string
): Note | null {
  const notes = getLocalNotes();
  const index = notes.findIndex((n) => n.id === noteId);
  if (index === -1) return null;

  notes[index] = {
    ...notes[index],
    tags: (notes[index].tags || []).filter((t) => t !== tagId),
    updated_at: new Date().toISOString(),
  };
  saveLocalNotes(notes);
  return notes[index];
}

// 搜索笔记
export function searchLocalNotes(query: string, filterTags?: string[]): Note[] {
  const notes = getLocalNotes();
  const lowerQuery = query.toLowerCase();

  return notes.filter((note) => {
    // 关键字匹配（标题或内容）
    const matchesQuery =
      !query ||
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery);

    // 标签匹配
    const matchesTags =
      !filterTags ||
      filterTags.length === 0 ||
      filterTags.some((tag) => note.tags?.includes(tag));

    return matchesQuery && matchesTags;
  });
}
