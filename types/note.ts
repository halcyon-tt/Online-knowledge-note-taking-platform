export interface Note {
  id?: string;
  title?: string;
  content?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Tag {
  id: string;
  user_id?: string;
  name: string;
  color: string;
}

export interface Folder {
  id: string;
  name: string;
  notes_id: string;
  created_at: string;
  updated_at: string;
}
