export interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[]; // 添加标签字段
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}
