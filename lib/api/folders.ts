import { apiRequest } from "./client";
import { Folder } from "@/types/note";

export const fetchFolders = () => apiRequest<Folder[]>("/folders");

export const fetchFolder = (id: number) => apiRequest<Folder>(`/folders/${id}`);

export const createFolder = (data: { name: string }) =>
  apiRequest<Folder>("/folders", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateFolder = (id: number, data: { name?: string }) =>
  apiRequest<Folder>(`/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const updateFolderNotes = (id: number, notes_id: string) =>
  apiRequest<Folder>(`/folders/${id}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ notes_id }),
  });

export const deleteFolder = (id: number) =>
  apiRequest<void>(`/folders/${id}`, { method: "DELETE" });
