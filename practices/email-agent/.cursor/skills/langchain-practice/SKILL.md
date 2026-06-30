---
name: langchain-practice
description: >-
  Run and extend the email agent practice in this TypeScript monorepo (Gmail + GitHub
  + doc search, LangGraph interrupts, CopilotKit web UI). Use when working on
  apps/agent/, apps/app/, apps/bff/, or the langgraph dev server.
disable-model-invocation: true
---

# Email Agent Practice

Single LangChain + LangGraph practice: read Gmail, classify, search docs or file
GitHub issues, draft a reply, human review, send.

## Run

```bash
pnpm dev             # LangGraph (2024) + BFF (4000) + Vite UI (3000)
pnpm cli             # terminal workflow with interactive review
AUTO_APPROVE=true pnpm cli
pnpm gmail:token     # one-time Gmail OAuth
```

## Layout (monorepo — mirrors langchainjs template)

- `apps/agent/src/main.ts` — CLI entry (`pnpm cli`)
- `apps/agent/src/email-agent/graph.ts` — exports `graph` (dev server) and `compileWithMemory()` (CLI)
- `apps/agent/src/email-agent/nodes/` — readEmail, classifyIntent, docSearch, bugTrack, draftReply, humanReview, sendReply
- `apps/agent/src/email-agent/integrations/` — gmail.ts, github.ts, doc-search.ts
- `apps/app/` — Vite + CopilotKit UI (proxies `/api/copilotkit` → BFF)
- `apps/bff/` — Hono CopilotKit runtime
- `apps/agent/langgraph.json` — graph id `emailAgent`

## Conventions

- Model via `getChatModel()` from `apps/agent/src/lib/model.js` — never construct `ChatOpenAI` directly.
- `.js` extensions on relative imports (ESM).
- Integration clients are lazy (no credentials required at graph load time).
- `humanReview` auto-approves when `configurable.autoApprove` is true; otherwise `interrupt()`.
- CopilotKit resume payloads are JSON strings; keep `ReviewDecision` JSON-serializable.
- Dev server graph has no checkpointer; CLI uses `compileWithMemory()`.
- Package manager: **pnpm** (`pnpm-workspace.yaml` includes `apps/*`).

## Pattern reference

See [reference.md](reference.md) for LangChain/LangGraph/CopilotKit snippets.
