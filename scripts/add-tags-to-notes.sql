-- 添加标签支持到 notes 表
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 创建 tags 表
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'bg-blue-500',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以加速标签搜索
CREATE INDEX IF NOT EXISTS notes_tags_idx ON notes USING GIN(tags);

-- 创建全文搜索索引
CREATE INDEX IF NOT EXISTS notes_title_search_idx ON notes USING GIN(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS notes_content_search_idx ON notes USING GIN(to_tsvector('simple', content));

-- Enable Row Level Security for tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Create policy for tags
CREATE POLICY "Allow all operations on tags" ON tags
  FOR ALL
  USING (true)
  WITH CHECK (true);
