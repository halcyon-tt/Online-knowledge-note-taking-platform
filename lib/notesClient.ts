import type { Note, NoteCreateInput, NoteUpdateInput } from "./types";

export interface NoteClient {
  list(): Promise<Note[]>;
  create(input: NoteCreateInput): Promise<Note>;
  update(id: string, input: NoteUpdateInput): Promise<Note>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = "notes-app-data";

function safeParse(json: string | null): Note[] {
  if (!json) return [];
  try {
    const data = JSON.parse(json) as Note[];
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

function persist(notes: Note[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function load(): Note[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return safeParse(raw);
}

export const localNoteClient: NoteClient = {
  async list() {
    return load();
  },
  async create(input) {
    const now = new Date().toISOString();
    const notes = load();
    const note: Note = {
      id: crypto.randomUUID(),
      title: input.title || "未命名笔记",
      content: input.content || "",
      createdAt: now,
      updatedAt: now,
    };
    // id: string;
    // userId: string; // 对应user_id
    // title: string;
    // content ?: string; // 可以为空
    // htmlContent ?: string; // 可以为空
    // categoryId ?: string; // 可以为空
    // isPublic: boolean; // 默认false
    // isPinned: boolean; // 默认false
    // viewCount: number; // 默认0
    // createdAt: string; // 注意：这里使用字符串表示日期时间，也可以使用Date类型，但通常序列化为字符串
    // updatedAt: string;
    // deletedAt ?: string; // 可以为空
    const next = [note, ...notes];
    persist(next);
    return note;
  },
  async update(id, input) {
    const notes = load();
    let updated: Note | null = null;
    const next = notes.map((n) => {
      if (n.id !== id) return n;
      updated = {
        ...n,
        ...input,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    persist(next);
    if (!updated) {
      throw new Error("Note not found");
    }
    return updated;
  },
  async remove(id) {
    const notes = load();
    const next = notes.filter((n) => n.id !== id);
    persist(next);
  },
};

// export const httpNoteClient: NoteClient = {
//   async list() {
//     const res = await fetch("/api/notes");
//     return res.json();
//   },
//   async create(input) {
//     const res = await fetch("/api/notes", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(input),
//     });
//     return res.json();
//   },
//   async update(id, input) {
//     const res = await fetch(`/api/notes/${id}`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(input),
//     });
//     return res.json();
//   },
//   async remove(id) {
//     await fetch(`/api/notes/${id}`, { method: "DELETE" });
//   },
// };


