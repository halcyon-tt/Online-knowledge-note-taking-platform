-- // 文件夹
create table public.folders (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name character varying(100) not null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  notes_id text null,
  constraint categories_pkey primary key (id),
  constraint categories_user_id_name_key unique (user_id, name),
  constraint categories_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_categories_user_id on public.folders using btree (user_id) TABLESPACE pg_default;

create trigger update_categories_updated_at BEFORE
update on folders for EACH row
execute FUNCTION update_updated_at_column ();

-- // note 和 tag 的多对多关系表
create table public.note_tags (
  note_id uuid not null,
  tag_id uuid not null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  user_id uuid null,
  constraint note_tags_pkey primary key (note_id, tag_id),
  constraint note_tags_note_id_fkey foreign KEY (note_id) references notes (id) on delete CASCADE,
  constraint note_tags_tag_id_fkey foreign KEY (tag_id) references tags (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_note_tags_note_id on public.note_tags using btree (note_id) TABLESPACE pg_default;

create index IF not exists idx_note_tags_tag_id on public.note_tags using btree (tag_id) TABLESPACE pg_default;

-- 笔记
create table public.notes (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  title character varying(255) not null,
  content text null,
  html_content text null,
  category_id uuid null,
  is_public boolean null default false,
  is_pinned boolean null default false,
  view_count integer null default 0,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  deleted_at timestamp with time zone null,
  constraint notes_pkey primary key (id),
  constraint notes_category_id_fkey foreign KEY (category_id) references folders (id) on delete set null,
  constraint notes_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_notes_user_id on public.notes using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_notes_category_id on public.notes using btree (category_id) TABLESPACE pg_default;

create index IF not exists idx_notes_created_at on public.notes using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_notes_public on public.notes using btree (is_public) TABLESPACE pg_default
where
  (is_public = true);

create index IF not exists idx_notes_not_deleted on public.notes using btree (deleted_at) TABLESPACE pg_default
where
  (deleted_at is null);

create trigger update_notes_updated_at BEFORE
update on notes for EACH row
execute FUNCTION update_updated_at_column ();

-- 标签

create table public.tags (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name character varying(50) not null,
  color character varying(7) null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint tags_pkey primary key (id),
  constraint tags_user_id_name_key unique (user_id, name),
  constraint tags_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_tags_user_id on public.tags using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_tags_name on public.tags using btree (name) TABLESPACE pg_default;

create trigger update_tags_updated_at BEFORE
update on tags for EACH row
execute FUNCTION update_updated_at_column ();

-- 用户
create table public.users (
  id uuid not null default gen_random_uuid (),
  username character varying(50) not null,
  email character varying(255) null,
  password character varying(255) not null,
  created_at date null,
  updated_at date null,
  constraint users_pkey primary key (id),
  constraint unique_email unique (email),
  constraint unique_username unique (username),
  constraint users_username_key unique (username)
) TABLESPACE pg_default;

create trigger update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_updated_at_column ();