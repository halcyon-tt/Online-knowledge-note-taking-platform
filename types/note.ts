export interface Note {
  id?: number;
  title?: string;
  content?: string;
  tags?: string[]; // 添加标签字段
  created_at?: string;
  updated_at?: string;
}

export interface Tag {
  id: number;
  user_id?: string;
  name: string;
  color: string;
}

export interface Folder {
  id: number;
  // user_id: string;
  name: string;
  notes_id: string; //用逗号分割的笔记ID列表
  created_at: string;
  updated_at: string;
}
