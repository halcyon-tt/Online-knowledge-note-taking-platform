-- 创建 note_tags 关联表（如果不存在）
CREATE TABLE IF NOT EXISTS note_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(note_id, tag_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS note_tags_note_id_idx ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS note_tags_tag_id_idx ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS note_tags_user_id_idx ON note_tags(user_id);

-- 启用 RLS
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
DROP POLICY IF EXISTS "Users can manage their own note_tags" ON note_tags;
CREATE POLICY "Users can manage their own note_tags" ON note_tags
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
