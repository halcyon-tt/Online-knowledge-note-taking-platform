import { apiRequest } from "./client";
import { Tag } from "@/types/note";

export const fetchTags = () => apiRequest<Tag[]>("/tags");

export const createTag = (data: { name: string }) =>
  apiRequest<Tag>("/tags", { method: "POST", body: JSON.stringify(data) });

export const deleteTag = (id: string | number) =>
  apiRequest<void>(`/tags/${id}`, { method: "DELETE" });

export const fetchNoteTags = (noteId: string | number) =>
  apiRequest<Tag[]>(`/notes/${noteId}/tags`);

export const addTagToNote = (noteId: string | number, tagId: string | number) =>
  apiRequest(`/notes/${noteId}/tags/${tagId}`, { method: "POST" });

export const removeTagFromNote = (noteId: string | number, tagId: string | number) =>
  apiRequest(`/notes/${noteId}/tags/${tagId}`, { method: "DELETE" });
