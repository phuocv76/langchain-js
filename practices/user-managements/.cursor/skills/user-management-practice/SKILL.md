---
name: user-management-practice
description: >-
  Run and extend the user management LangChain practice (directory CRUD, RAG,
  human-in-the-loop via LangGraph interrupts, CopilotKit web UI). Use when working
  on apps/agent/, apps/backend/, apps/frontend/, or the langgraph dev server.
disable-model-invocation: true
---

# User Management Practice

LangChain + LangGraph user directory assistant: profile tools, admin CRUD, RAG knowledge base, human review for mutations.

## Run

```bash
pnpm install
cp .env.example .env
pnpm db:apply:local
pnpm dev             # LangGraph (2024) + backend (4000) + frontend (3000)
```

## Layout (monorepo)

- `apps/agent/src/user-management-agent/graph.ts` — exports `graph` (dev server)
- `apps/agent/src/user-management-agent/tools/` — LangChain tools (call REST API)
- `apps/agent/src/user-management-agent/middleware/` — scope guardrail
- `apps/agent/src/user-management-agent/nodes/human-review.ts` — mutation interrupts
- `apps/backend/src/` — Hono REST (auth, users, RAG) + CopilotKit runtime
- `apps/frontend/` — Vite + CopilotKit UI
- `apps/agent/langgraph.json` — graph id `userManagementAgent`

## Conventions

- Model via `getChatModel()` from `apps/agent/src/lib/model.js` — never construct `ChatOpenAI` directly.
- `.js` extensions on relative imports in `apps/agent` (ESM).
- Tools call `apps/backend` over HTTP; pass `userId` / `userRole` via LangGraph `configurable`.
- Mutations use LangGraph `interrupt()` — not `humanAffirmsExecute`.
- CopilotKit resume payloads are JSON strings.
- Package manager: **pnpm** (`pnpm-workspace.yaml` includes `apps/*`).
- Follow `.cursor/rules/es6-coding-standards.mdc` and `format-after-edit.mdc`.

## Migration

See [MIGRATION.md](../../MIGRATION.md) for AI SDK → LangChain mapping and phase checklist.
