---
name: langchain-practice
description: >-
  Run and extend the email agent practice in this TypeScript repo (Gmail + GitHub
  + doc search, LangGraph interrupts, CopilotKit web UI). Use when working on
  src/email-agent/, src/main.ts, the langgraph dev server, or web/.
disable-model-invocation: true
---

# Email Agent Practice

Single LangChain + LangGraph practice: read Gmail, classify, search docs or file
GitHub issues, draft a reply, human review, send.

## Run

```bash
pnpm dev             # LangGraph (2024) + Next.js UI (3000) — primary mode
pnpm cli             # terminal workflow with interactive review
AUTO_APPROVE=true pnpm cli
pnpm gmail:token     # one-time Gmail OAuth
```

## Layout

- `src/main.ts` — CLI entry (`pnpm cli`)
- `src/email-agent/graph.ts` — exports `graph` (dev server) and `compileWithMemory()` (CLI)
- `src/email-agent/nodes/` — readEmail, classifyIntent, docSearch, bugTrack, draftReply, humanReview, sendReply
- `src/email-agent/integrations/` — gmail.ts, github.ts, doc-search.ts
- `web/` — CopilotKit UI
- `langgraph.json` — graph id `emailAgent`

## Conventions

- Model via `getChatModel()` from `src/lib/model.js` — never construct `ChatOpenAI` directly.
- `.js` extensions on relative imports (ESM).
- Integration clients are lazy (no credentials required at graph load time).
- `humanReview` auto-approves when `configurable.autoApprove` is true; otherwise `interrupt()`.
- CopilotKit resume payloads are JSON strings; keep `ReviewDecision` JSON-serializable.
- Dev server graph has no checkpointer; CLI uses `compileWithMemory()`.
- Package manager: **pnpm** (`pnpm-workspace.yaml` includes `web/`).

## Pattern reference

See [reference.md](reference.md) for LangChain/LangGraph/CopilotKit snippets.
