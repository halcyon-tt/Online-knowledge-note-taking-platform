import { apiRequest } from "./client";
import { Folder } from "@/types/note";

export const fetchFolders = () => apiRequest<Folder[]>("/folders");

export const fetchFolder = (id: string | number) => apiRequest<Folder>(`/folders/${id}`);

export const createFolder = (data: { name: string }) =>
  apiRequest<Folder>("/folders", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateFolder = (id: string | number, data: { name?: string }) =>
  apiRequest<Folder>(`/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const updateFolderNotes = (id: string | number, notes_id: string) =>
  apiRequest<Folder>(`/folders/${id}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ notes_id }),
  });

export const deleteFolder = (id: string | number) =>
  apiRequest<void>(`/folders/${id}`, { method: "DELETE" });
