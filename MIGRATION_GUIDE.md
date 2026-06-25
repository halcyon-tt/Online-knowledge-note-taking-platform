# 前端接入 NestJS 后端 — 迁移指南

> 后端地址: `http://localhost:3001/api`
> 已有: `lib/api/client.ts` (apiRequest) + `lib/api/auth.ts` (登录/注册)

---

## 1. 新建 API 文件

### `lib/api/notes.ts`

```ts
import { apiRequest } from "./client";
import type { Note } from "@/types/note";

export const fetchNotes = (page = 1, limit = 20) =>
  apiRequest<[Note[], number]>(`/notes?page=${page}&limit=${limit}`);

export const fetchNote = (id: number) => apiRequest<Note>(`/notes/${id}`);

export const createNote = (data: { title: string; content?: string }) =>
  apiRequest<Note>("/notes", { method: "POST", body: JSON.stringify(data) });

export const updateNote = (
  id: number,
  data: Partial<{ title: string; content: string }>
) =>
  apiRequest<Note>(`/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteNote = (id: number) =>
  apiRequest<void>(`/notes/${id}`, { method: "DELETE" });

export const searchNotes = (q: string) =>
  apiRequest<Note[]>(`/notes/search?q=${encodeURIComponent(q)}`);
```

### `lib/api/tags.ts`

```ts
import { apiRequest } from "./client";
import type { Tag } from "@/types/note";

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
```

### `lib/api/folders.ts`

```ts
import { apiRequest } from "./client";
import type { Folder } from "@/types/note";

export const fetchFolders = () => apiRequest<Folder[]>("/folders");

export const fetchFolder = (id: number) => apiRequest<Folder>(`/folders/${id}`);

export const createFolder = (data: { name: string }) =>
  apiRequest<Folder>("/folders", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateFolder = (id: number, data: { name?: string }) =>
  apiRequest<Folder>(`/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const updateFolderNotes = (id: number, notes_id: string) =>
  apiRequest<Folder>(`/folders/${id}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ notes_id }),
  });

export const deleteFolder = (id: number) =>
  apiRequest<void>(`/folders/${id}`, { method: "DELETE" });
```

### `lib/api/ai.ts`

```ts
import { apiRequest } from "./client";

export const aiSearch = (query: string) =>
  apiRequest<{ answer: string; relatedNotes: number[] }>("/ai/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
```

---

## 2. 逐文件替换对照表

### `contexts/AuthContext.tsx`

| 原代码                                                 | 替换为                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `import { createClient } from "@/lib/supabase/client"` | `import { getCurrentUser, signOut } from "@/lib/api/auth"` |
| `supabase.auth.getUser()`                              | `getCurrentUser()`                                         |
| `supabase.auth.onAuthStateChange(callback)`            | 删除。初始化时调 `getCurrentUser()`，token 存在则已登录    |
| `supabase.auth.signOut()`                              | `signOut()` (清 localStorage)                              |

**关键变化**: 用户对象从 Supabase `User` 变为 `{ sub: number, email: string, username: string }`

### `contexts/NotesContext.tsx`

| 原代码                                                                | 替换为                      |
| --------------------------------------------------------------------- | --------------------------- |
| `isSupabaseConfigured()` 分支判断                                     | 删除，统一走 API            |
| `supabase.from("notes").select('*').eq('user_id', userId).order(...)` | `fetchNotes()`              |
| `getLocalNotes()`                                                     | 删除 localStorage 分支      |
| `getUserId()`                                                         | 不需要，后端从 JWT 自动获取 |

### `app/login/page.tsx`

| 原代码                                               | 替换为                                             |
| ---------------------------------------------------- | -------------------------------------------------- |
| `import { signInWithEmail } from "@/lib/auth-utils"` | `import { signInWithEmail } from "@/lib/api/auth"` |
| `signInWithGitHub()`                                 | 暂时移除或隐藏 GitHub 登录按钮                     |

### `app/register/page.tsx`

| 原代码                                               | 替换为                                             |
| ---------------------------------------------------- | -------------------------------------------------- |
| `import { signUpWithEmail } from "@/lib/auth-utils"` | `import { signUpWithEmail } from "@/lib/api/auth"` |

### `app/dashboard/page.tsx`

| 原代码 (行号参考)                                                                         | 替换为                                    |
| ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| `supabase.from("folders").select("*").eq("user_id", userId).order("updated_at").limit(6)` | `fetchFolders()` 然后前端取前 6 个        |
| `supabase.from("folders").select("notes_id").eq("user_id", userId)`                       | `fetchFolders()` 复用上面结果             |
| `supabase.from("notes").insert({...}).select().single()`                                  | `createNote({ title, content })`          |
| `supabase.from("folders").insert({...}).select().single()`                                | `createFolder({ name })`                  |
| `supabase.from("folders").update({notes_id}).eq("id", folderId)...`                       | `updateFolderNotes(folderId, newNotesId)` |
| `getUserId()`                                                                             | 不需要                                    |

### `app/dashboard/notes/[id]/page.tsx`

| 原代码                                                     | 替换为                                |
| ---------------------------------------------------------- | ------------------------------------- |
| `supabase.from("notes").select("*").eq("id", id).single()` | `fetchNote(Number(id))`               |
| `supabase.from("notes").update({content}).eq("id", id)`    | `updateNote(Number(id), { content })` |
| `getLocalNote(id)` / localStorage 分支                     | 删除                                  |
| `isSupabaseConfigured()`                                   | 删除                                  |

### `app/dashboard/folder/[id]/page.tsx`

| 原代码                                                                             | 替换为                                                                 |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `supabase.from("folders").select("*").eq("id", id).eq("user_id", userId).single()` | `fetchFolder(Number(id))`                                              |
| `supabase.from("notes").select("*").in("id", noteIds)...`                          | 解析 folder.notes_id 后逐个 `fetchNote()` 或用 `fetchNotes()` 前端过滤 |
| `supabase.from("folders").update({name}).eq("id", id)...`                          | `updateFolder(Number(id), { name })`                                   |
| `supabase.from("folders").delete().eq("id", id)...`                                | `deleteFolder(Number(id))`                                             |
| `supabase.from("notes").delete().eq("id", noteId)...`                              | `deleteNote(Number(noteId))`                                           |
| `supabase.from("folders").update({notes_id}).eq("id", id)...`                      | `updateFolderNotes(Number(id), newNotesId)`                            |

### `components/app-sidebar.tsx`

| 原代码                                                                       | 替换为                           |
| ---------------------------------------------------------------------------- | -------------------------------- |
| `supabase.from("folders").select("notes_id").eq("id", currentFolderId)...`   | `fetchFolder(currentFolderId)`   |
| `supabase.from("tags").select("*").eq("user_id", userId).order("name")`      | `fetchTags()`                    |
| `supabase.from("notes").insert({title, content, user_id}).select().single()` | `createNote({ title, content })` |
| `supabase.from("notes").update({title}).eq("id", noteId)`                    | `updateNote(noteId, { title })`  |
| `supabase.from("notes").delete().eq("id", noteId)`                           | `deleteNote(noteId)`             |
| `supabase.from("tags").insert({name, user_id}).select().single()`            | `createTag({ name })`            |
| `supabase.from("tags").delete().eq("id", tagId)`                             | `deleteTag(tagId)`               |
| `localStorage.setItem("notes", ...)`                                         | 删除                             |

### `components/note-tag-manager.tsx`

| 原代码                                                                             | 替换为                             |
| ---------------------------------------------------------------------------------- | ---------------------------------- |
| `supabase.from("tags").select("*").eq("user_id", userId).order("name")`            | `fetchTags()`                      |
| `supabase.from("note_tags").select("tag_id").eq("note_id", noteId)...`             | `fetchNoteTags(noteId)`            |
| `supabase.from("note_tags").insert({tag_id, note_id, user_id})`                    | `addTagToNote(noteId, tagId)`      |
| `supabase.from("note_tags").delete().eq("note_id", noteId).eq("tag_id", tagId)...` | `removeTagFromNote(noteId, tagId)` |

### `components/ai-search-dialog.tsx`

| 原代码                                                                      | 替换为                   |
| --------------------------------------------------------------------------- | ------------------------ |
| `supabase.from("notes").select("id, title, content").eq("user_id", userId)` | 删除（后端自动获取笔记） |
| `fetch("/api/ai-search", { body: JSON.stringify({ query, notes }) })`       | `aiSearch(query)`        |

### `app/dashboard/ai-chat/page.tsx`

| 原代码                                                                | 替换为            |
| --------------------------------------------------------------------- | ----------------- |
| `supabase.from("notes").select("*").eq("user_id", userId)...`         | 删除              |
| `fetch("/api/ai-search", { body: JSON.stringify({ query, notes }) })` | `aiSearch(query)` |
| 整个 notes 预加载逻辑                                                 | 删除              |

---

## 3. 类型调整 (`types/note.ts`)

**注意: 后端 ID 是 `number` 不是 UUID `string`**

```ts
// 调整前
interface Note { id?: string; ... }

// 调整后
interface Note { id?: number; ... }
interface Tag  { id: number; ... }
interface Folder { id: number; ... }
```

---

## 4. 可删除的文件

| 文件                         | 原因                       |
| ---------------------------- | -------------------------- |
| `lib/supabase/client.ts`     | 不再直连 Supabase          |
| `lib/supabase/server.ts`     | 同上                       |
| `lib/auth-utils.ts`          | 被 `lib/api/auth.ts` 替代  |
| `lib/local-storage.ts`       | 不再需要 localStorage 降级 |
| `app/api/ai-search/route.ts` | AI 搜索由后端处理          |
| `app/api/auth/route.ts`      | Auth 由后端处理            |
| `app/auth/callback/route.ts` | OAuth 回调不再需要         |

---

## 5. 环境变量

```bash
# .env.local — 删除
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# .env.local — 添加
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 6. 验证清单

- [ ] 注册 → 获取 token → 自动跳转 dashboard
- [ ] 登录 → 获取 token → 自动跳转 dashboard
- [ ] Dashboard 加载笔记列表和文件夹列表
- [ ] 创建笔记 → 出现在列表
- [ ] 编辑笔记 → 自动保存（5s 防抖）
- [ ] 删除笔记 → 从列表消失
- [ ] 创建/删除文件夹
- [ ] 拖拽笔记到文件夹
- [ ] 创建/删除标签
- [ ] 给笔记添加/移除标签
- [ ] AI 搜索返回结果
- [ ] Token 过期后自动刷新
- [ ] 无 Supabase 引用残留: `grep -r "supabase" --include="*.ts" --include="*.tsx" lib/ contexts/ components/ app/`
