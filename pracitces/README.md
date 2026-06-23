# LangChain + LangGraph Practices

TypeScript playground for practicing [LangChain.js](https://js.langchain.com/) and
[LangGraph.js](https://langchain-ai.github.io/langgraphjs/) with OpenAI.

## Setup

```bash
npm install
cp .env.example .env   # then add your OPENAI_API_KEY
```

## Run an exercise

```bash
npm run exercise src/exercises/01-hello-chain.ts
npm run exercise src/exercises/02-hello-graph.ts
```

## Create a new exercise

```bash
npm run new -- chain "structured output"
npm run new -- graph "tool calling agent"
```

This generates a numbered file in `src/exercises/` and prints the run command.

## Email Agent (Read & Reply)

A complete LangGraph workflow that reads Gmail, classifies intent, searches a
local knowledge base or files a GitHub issue, drafts a reply, pauses for human
review, and sends. Built in three phases:

1. Full workflow (auto-approved review):

```bash
npm run exercise src/exercises/03-email-workflow.ts
```

2. Interrupts + memory (human-in-the-loop, resumable):

```bash
npm run exercise src/exercises/04-email-interrupts-memory.ts
```

3. CopilotKit web UI on top of a `langgraphjs dev` server:

```bash
npm run gmail:token     # one-time: mint GOOGLE_REFRESH_TOKEN
npm run dev             # langgraph dev (2024) + Next.js app (3000)
```

Requires Gmail, GitHub, and OpenAI credentials in `.env` (see `.env.example`).

> Note: `@langchain/langgraph-cli`'s dev server officially supports Node 20. On
> Node 22+ the in-memory server may print its banner but never bind the port. If
> `npm run dev:agent` doesn't come up at `http://localhost:2024`, switch to Node 20
> (e.g. `nvm use 20`) or run it under WSL. The graph code itself is runtime-agnostic.

## Layout

```
src/
  lib/          shared helpers (env loading, model factory)
  exercises/    numbered practice exercises (NN-title.ts)
  email-agent/  the email workflow graph
    nodes/        read/classify/docSearch/bugTrack/draft/review/send
    integrations/ gmail.ts, github.ts, doc-search.ts
docs/           knowledge-base files for doc search
web/            Next.js + CopilotKit UI (Phase 3)
langgraph.json  exposes the graph as "emailAgent" for the dev server
scripts/
  new-exercise.mjs     scaffolds a new exercise
  get-gmail-token.mjs  Gmail OAuth helper
  templates/           chain/graph starter templates
.cursor/skills/
  langchain-practice/  Cursor skill for this repo
```

## Notes

- Each exercise is a standalone script with its own `main()`.
- The default model is `gpt-4o-mini`; override via `OPENAI_MODEL` in `.env`.
