import type { Note } from "@/types/note";

const STORAGE_KEY = "local_notes";

// 获取所有笔记
export function getLocalNotes(): Note[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// 保存所有笔记
export function saveLocalNotes(notes: Note[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// 获取单个笔记
export function getLocalNote(id: string): Note | null {
  const notes = getLocalNotes();
  return notes.find((n) => n.id === id) || null;
}

// 创建笔记
export function createLocalNote(
  note: Omit<Note, "id" | "created_at" | "updated_at">
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
