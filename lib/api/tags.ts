import { apiRequest } from "./client";
import { Tag } from "@/types/note";

export const fetchTags = () => apiRequest<Tag[]>("/tags");

export const createTag = (data: { name: string }) =>
  apiRequest<Tag>("/tags", { method: "POST", body: JSON.stringify(data) });

export const deleteTag = (id: number) =>
  apiRequest<void>(`/tags/${id}`, { method: "DELETE" });

export const fetchNoteTags = (noteId: number) =>
  apiRequest<Tag[]>(`/notes/${noteId}/tags`);

export const addTagToNote = (noteId: number, tagId: number) =>
  apiRequest(`/notes/${noteId}/tags/${tagId}`, { method: "POST" });

export const removeTagFromNote = (noteId: number, tagId: number) =>
  apiRequest(`/notes/${noteId}/tags/${tagId}`, { method: "DELETE" });
