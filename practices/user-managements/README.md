# User Management Practice (LangChain.js)

LangChain + LangGraph port of the AI SDK user-management app. Directory CRUD, RAG knowledge base, and human-in-the-loop mutations via CopilotKit interrupts.

See [MIGRATION.md](./MIGRATION.md) for the full migration plan from `ai-sdk-training/practices/user-managements`.

## Prerequisites

- Node.js 20+
- pnpm 11+

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm db:apply:local
pnpm dev
```

| Service        | URL                   |
| -------------- | --------------------- |
| Frontend       | http://localhost:3000 |
| Backend (Hono) | http://localhost:4000 |
| LangGraph dev  | http://localhost:2024 |

Default admin: `admin@admin.com` / `Abcd@123`

## Monorepo layout

| Package          | Path            | Role                                           |
| ---------------- | --------------- | ---------------------------------------------- |
| `@repo/backend`  | `apps/backend`  | Hono — REST API, auth, RAG, CopilotKit runtime |
| `@repo/frontend` | `apps/frontend` | Vite + React UI                                |
| `@repo/agent`    | `apps/agent`    | LangGraph `userManagementAgent`                |

## Production (Cloudflare)

See [DEPLOY.md](./DEPLOY.md) for Worker + D1 + Pages deployment and LangGraph hosting options.

```bash
pnpm db:apply:remote          # D1 migrations (first deploy)
pnpm deploy:backend           # Backend Worker (REST + CopilotKit)
# set VITE_BACKEND_URL in .env first
pnpm deploy:frontend          # Pages static UI
```
