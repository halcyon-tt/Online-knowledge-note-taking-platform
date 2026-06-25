import { apiRequest } from "./client";
import { Note } from "@/types/note";

export const fetchNotes = (page = 1, limit = 20) =>
  apiRequest<[Note[], number]>(`/notes?page=${page}&limit=${limit}`);

export const fetchNote = (id: string | number) => apiRequest<Note>(`/notes/${id}`);

export const createNote = (data: { title: string; content?: string }) =>
  apiRequest<Note>("/notes", { method: "POST", body: JSON.stringify(data) });

export const updateNote = (
  id: string | number,
  data: Partial<{ title: string; content: string }>
) =>
  apiRequest<Note>(`/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteNote = (id: string | number) =>
  apiRequest<void>(`/notes/${id}`, { method: "DELETE" });

export const searchNotes = (q: string) =>
  apiRequest<Note[]>(`/notes/search?q=${encodeURIComponent(q)}`);
