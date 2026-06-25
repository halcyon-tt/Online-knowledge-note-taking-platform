"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import {
  fetchNotes as apiFetchNotes,
  createNote as apiCreateNote,
  updateNote as apiUpdateNote,
  deleteNote as apiDeleteNote,
} from "@/lib/api/notes";
import { fetchNoteTags } from "@/lib/api/tags";
import type { Note } from "@/types/note";

interface NotesContextType {
  notes: Note[];
  loading: boolean;
  refreshNotes: () => Promise<void>;
  createNote: (data: { title: string; content?: string }) => Promise<Note>;
  updateNote: (
    noteId: string | number,
    updates: Partial<{ title: string; content: string }>
  ) => Promise<void>;
  deleteNote: (noteId: string | number) => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // 刷新笔记列表
  const refreshNotes = useCallback(async () => {
    setLoading(true);
    try {
      const [data] = await apiFetchNotes();
      const notesList = data || [];

      // 批量加载每个笔记的标签
      const notesWithTags = await Promise.all(
        notesList.map(async (note) => {
          if (!note.id) return note;
          try {
            const tagList = await fetchNoteTags(note.id);
            return { ...note, tags: tagList.map((t) => t.name) };
          } catch {
            return note;
          }
        })
      );

      setNotes(notesWithTags);
    } catch (error) {
      console.error("Failed to load notes:", error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建笔记：调 API + 更新本地 state
  const createNote = useCallback(
    async (data: { title: string; content?: string }): Promise<Note> => {
      const note = await apiCreateNote(data);
      setNotes((prev) => [note, ...prev]);
      return note;
    },
    []
  );

  // 更新笔记：调 API + 更新本地 state
  const updateNote = useCallback(
    async (
      noteId: string | number,
      updates: Partial<{ title: string; content: string }>
    ) => {
      await apiUpdateNote(noteId, updates);
      setNotes((prev) =>
        prev.map((note) =>
          String(note.id) === String(noteId) ? { ...note, ...updates } : note
        )
      );
    },
    []
  );

  const deleteNote = useCallback(async (noteId: string | number) => {
    await apiDeleteNote(noteId);
    setNotes((prev) => prev.filter((note) => String(note.id) !== String(noteId)));
  }, []);

  // 初始加载
  React.useEffect(() => {
    refreshNotes();
  }, [refreshNotes]);

  return (
    <NotesContext.Provider
      value={{
        notes,
        loading,
        refreshNotes,
        createNote,
        updateNote,
        deleteNote,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error("useNotes must be used within a NotesProvider");
  }
  return context;
}
