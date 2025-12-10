// types.ts
export interface Note {
  id: string;
  userId: string;
  title: string;
  content?: string;
  htmlContent?: string;
  categoryId?: string;
  isPublic: boolean;
  isPinned: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface NoteCreateInput {
  title?: string;
  content?: string;
  htmlContent?: string;
  categoryId?: string;
  userId?: string;
  isPublic?: boolean;
  isPinned?: boolean;
  viewCount?: number;
  deletedAt?: string;
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
  htmlContent?: string;
  categoryId?: string;
  userId?: string;
  isPublic?: boolean;
  isPinned?: boolean;
  viewCount?: number;
  deletedAt?: string;
}
