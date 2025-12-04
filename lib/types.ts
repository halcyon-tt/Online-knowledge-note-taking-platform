export interface Notes {
  id: string;
userId: string; // 对应user_id
title: string;
content?: string; // 可以为空
htmlContent?: string; // 可以为空
categoryId?: string; // 可以为空
isPublic: boolean; // 默认false
isPinned: boolean; // 默认false
viewCount: number; // 默认0
createdAt: string; // 注意：这里使用字符串表示日期时间，也可以使用Date类型，但通常序列化为字符串
updatedAt: string;
deletedAt?: string; // 可以为空
}

export interface NoteCreateInput {
  title: string;
  content: string;
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
}


