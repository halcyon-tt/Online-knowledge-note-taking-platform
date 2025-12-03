import { create } from "zustand";
import type { Note, NoteCreateInput, NoteUpdateInput } from "@/lib/types";
import { localNoteClient } from "@/lib/notesClient";

interface StoreState {
  notes: Note[];
  selectedNoteId: string | null;
  loading: boolean;
  error: string | null;
  loadNotes: () => Promise<void>;
  createNote: (input: NoteCreateInput) => Promise<Note | null>;
  updateNote: (id: string, input: NoteUpdateInput) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  selectNote: (id: string | null) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  notes: [],
  selectedNoteId: null,
  loading: false,
  error: null,
  async loadNotes() {
    set({ loading: true, error: null });
    try {
      const notes = await localNoteClient.list();
      set({ notes, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "加载笔记失败",
      });
    }
  },
  async createNote(input) {
    set({ loading: true, error: null });
    try {
      const note = await localNoteClient.create(input);
      const { notes } = get();
      set({
        notes: [note, ...notes],
        selectedNoteId: note.id,
        loading: false,
      });
      return note;
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "创建笔记失败",
      });
      return null;
    }
  },
  async updateNote(id, input) {
    set({ loading: true, error: null });
    try {
      const updated = await localNoteClient.update(id, input);
      const { notes } = get();
      set({
        notes: notes.map((n) => (n.id === id ? updated : n)),
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "更新笔记失败",
      });
    }
  },
  async deleteNote(id) {
    set({ loading: true, error: null });
    try {
      await localNoteClient.remove(id);
      const { notes, selectedNoteId } = get();
      set({
        notes: notes.filter((n) => n.id !== id),
        selectedNoteId: selectedNoteId === id ? null : selectedNoteId,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "删除笔记失败",
      });
    }
  },
  selectNote(id) {
    set({ selectedNoteId: id });
  },
}));
