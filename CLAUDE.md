# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Online Knowledge Note-Taking Platform (在线知识笔记平台) — a modern note-editing platform with Markdown support, tag/folder organization, AI-assisted search (Doubao API), and real-time collaboration infrastructure.

## Common Commands

```bash
npm run dev          # Start Next.js dev server (port 3000)
npm run dev:server   # Start Hocuspocus collaboration server
npm run dev:all      # Start both concurrently
npm run build        # Production build
npm run test         # Run Vitest tests (watch mode)
npx vitest run                        # Run all tests once
npx vitest run path/to/file.test.ts   # Run a single test file
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
```

Pre-commit hooks (Husky + lint-staged) auto-run ESLint fix and related Vitest tests on staged files.

## Tech Stack

- **Framework:** Next.js 16 with App Router, React 19, TypeScript
- **UI:** Tailwind CSS v4 + Radix UI + shadcn/ui (new-york style)
- **Editor:** TipTap (ProseMirror-based) with StarterKit, Link, Image, FontFamily, Placeholder extensions
- **Database/Auth:** Supabase (PostgreSQL + Auth, including GitHub OAuth)
- **State:** React Context (AuthContext, NotesContext) + Zustand (folder selection)
- **Real-time:** Hocuspocus + YJS (collaboration infrastructure, partially enabled — collab server exists but is not wired into the editor)
- **AI:** Doubao API (豆包) for semantic search and note summarization
- **Testing:** Vitest + Testing Library + MSW (API mocking) + JSDOM

## Architecture

### Routing (Next.js App Router)

- `/app/page.tsx` — redirects to dashboard
- `/app/login/`, `/app/register/` — auth pages
- `/app/auth/callback/route.ts` — OAuth callback
- `/app/dashboard/` — main dashboard with sidebar layout
- `/app/dashboard/notes/[id]/` — note editor page
- `/app/dashboard/folder/[id]/` — folder view
- `/app/dashboard/ai-chat/` — AI search interface
- `/app/api/ai-search/route.ts` — Doubao AI search endpoint
- `/app/api/auth/route.ts` — auth stub

### Key Directories

- `components/` — business components (note-editor, app-sidebar, agent-chat-panel, etc.)
- `components/ui/` — shadcn/ui primitives
- `contexts/` — AuthContext and NotesContext providers (wrapped in root layout)
- `hooks/` — custom hooks (e.g., use-mobile)
- `lib/supabase/` — browser (`client.ts`) and server (`server.ts`) Supabase clients
- `lib/auth-utils.ts` — sign-in, sign-up, OAuth helpers
- `lib/local-storage.ts` — localStorage CRUD fallback when Supabase is unavailable
- `lib/store/folders.ts` — Zustand store for current folder ID
- `types/note.ts` — Note, Tag, Folder type definitions
- `server/hocuspocus.ts` — Hocuspocus server config
- `scripts/` — SQL migrations and server startup
- `mocks/` — MSW handlers for test API mocking

### Key Architectural Patterns

**Dual storage system (Supabase + localStorage fallback):**
`isSupabaseConfigured()` in `lib/supabase/client.ts` checks env vars at runtime. When Supabase is not configured, the entire app falls back to `lib/local-storage.ts` for CRUD. Almost every page/component branches on `useLocalStorage = !isSupabaseConfigured()`. NotesContext abstracts this so consumers don't need to know the data source.

**Editor auto-save with debounce:**
The note editor (`components/note-editor.tsx`) uses a custom 5-second debounce via `useRef` timers, with a 60-second force-save ceiling. Changes trigger `onUpdate` → debounced save to Supabase or localStorage. No library debounce — the timing logic is inline.

**Auth flow:**

- Client-side: `lib/auth-utils.ts` uses `@supabase/ssr` for email/password and GitHub OAuth
- Server-side: `lib/supabase/server.ts` uses `createServerClient` with cookie-based sessions
- User record creation in the `users` table is non-blocking — auth succeeds even if the insert fails
- AuthContext subscribes to `onAuthStateChange` for real-time session sync

**AI search (Doubao):**
`/app/api/ai-search/route.ts` receives `{query, notes}`, builds context from all notes (1000-char snippets each), and sends to Doubao API with a system prompt for intent classification. Response includes `[RELATED_NOTES:id1,id2]` markers parsed client-side.

**Folder model caveat:**
Folders store associated note IDs as a comma-separated string in `notes_id`, not an array or join table. No referential integrity — folders can reference deleted notes.

### Data Flow

- Supabase is the primary data store; localStorage serves as offline fallback
- Notes auto-save on content change with 5-second debounce
- Drag-and-drop for note-to-folder assignment (updates comma-separated `notes_id`)
- Database schema in `lib/init.sql`: users, notes, tags, note_tags, folders tables

### Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DOUBAO_API_KEY=...
```

Optional: `DOUBAO_MODEL_ID`, `NEXT_PUBLIC_SITE_URL`, `NEST_API_BASE_URL` (defaults to `http://localhost:3001`)

## AI Agent Subsystem (AG-UI)

This frontend pairs with a separate NestJS backend at `D:\Bt-Training\note-taking-backend\`. Together they implement an AG-UI–style AI agent layer on top of the editor. Key concepts:

**Two-repo split:**

- **Frontend (this repo)** is responsible for UI, editor commands, SSE parsing, and buffer routes (`app/api/**`). It does NOT contain agent orchestration or LLM provider code.
- **Backend (`note-taking-backend/`)** owns LangGraph orchestration, tool registry, DTO validation, JWT auth, and Doubao provider calls. Routes: `/api/ai/*` (single-shot AI) and `/api/agent/*` (streaming agent + workflow).

**Buffer routes (this repo) → NestJS:**

- `app/api/ai/{polish,organize-note,search-notes,expand,condense}/route.ts` → forward to `NEST_API_BASE_URL/api/ai/*`
- `app/api/agent/chat/stream/route.ts` and `workflow/stream/route.ts` → forward SSE
- `app/api/agent/[convId]/{tool-result,context}/route.ts` → AG-UI feedback loops (frontend tool execution result, editor context push)

All buffer routes pass through the `Authorization: Bearer` header from `localStorage.access_token`. `lib/ai-client.ts` handles 401 by redirecting to `/login?redirect=...`.

**SSE event types** (`types/ai.ts`, mirrored in backend `src/ais/contracts/agent-contracts.ts`):
`run-started`, `text-delta`, `tool-call-start`, `tool-call-end`, `tool-result`, `ui`, `human-in-the-loop`, `error`, `run-finished`. UI components are dispatched via the `ui` event's `component` field.

**Editor bridge (`lib/editor-bridge.ts`):**
Global module-level registry that lets AG-UI panel components reach into the TipTap editor without prop-drilling. Owns:

- `registerEditorTool` / `executeEditorTool` — frontend tools the agent can invoke (e.g., `edit_note_text`, `insertAtCursor`, `replaceSelection`, `replaceRange`, `acceptPreview`, `discardPreview`)
- `subscribeToEditor` / `getCurrentEditor` — reactive editor instance access
- `subscribeToLockedSelection` / `setLockedSelection` — "locked selection" feature: user's editor selection survives clicking into the AI input box (ProseMirror selection visually disappears on blur, but our locked ref persists it so agent context push and `edit_note_text` fallback can use it)

**Editor tools registry (`lib/editor-tools.ts`):**
`registerDefaultEditorTools(editor)` returns the list of TipTap-backed tools that get registered into `editor-bridge` when the editor mounts. The key one is `edit_note_text`, which routes by `args.operation` ∈ {`insertAtCursor`, `replaceSelection`, `replaceRange`} and falls back to `replaceRange` using the locked selection if operation is missing/unknown. Successful edits flash a 2.8s green highlight via the `AiEditMark`.

**Marks:**

- `lib/preview-mark.ts` — `PreviewMark`: indigo shimmer for AI-generated preview content the user has not yet accepted
- `lib/ai-edit-mark.ts` — `AiEditMark`: green fade for "AI just changed this" feedback; auto-removed after 2.8s

**Agent panel data flow (`hooks/useAgentStream.ts`):**
Maintains `conversationId` per session, parses SSE stream, intercepts `tool-call-start` for frontend tools (executes locally + posts result to `/api/agent/{convId}/tool-result`). UI events go through `AgentUiRenderer` (`components/agent-ui-renderer.tsx`), which dispatches to `components/ai-ui/*` by component name.

**Editor → agent context push (`hooks/useEditorSync.ts`):**
Debounce 600ms; only pushes when selection length ≥ 1; deduplicates identical payloads. Pushes `{selection, contentLength, noteRef}` to `/api/agent/{convId}/context`. Backend stores in `AgentSessionStore` and injects into the next chat's system prompt via `formatEditorContext`.

**Planning docs (`docs/superpowers/plans/`):**

- `2026-06-09-ai-note-agent-evolution.md` — contract / auth / e2e foundation (Phase 6 hardening complete)
- `2026-06-27-ag-ui-integration.md` — AG-UI base wiring (Phase 0–5.1 complete; 5.2–5.5 superseded by next doc)
- `2026-06-28-ag-ui-experience-leap.md` — active plan for "wow" experience upgrades (streaming typewriter, ghost text, thinking-chain viz)

## Testing

- Config: `vitest.config.ts` — jsdom environment, setup file at `vitest.setup.ts`
- MSW server initialized in `mocks/server.ts`, started/stopped in setup file
- Test files colocated with source (e.g., `lib/api.test.ts`)
- Run related tests only: `npx vitest related --run path/to/file.ts`

## Code Style

- ESLint extends `next/core-web-vitals` (`.eslintrc.json`)
- Prettier: semicolons, double quotes, trailing commas (es5), 80 char width, 2-space indent (`.prettierrc`)
- Path alias: `@/*` maps to project root (`tsconfig.json`)
- TypeScript strict mode enabled, target ES2017
- CI runs on Node.js 20.x (lint → test → build)
