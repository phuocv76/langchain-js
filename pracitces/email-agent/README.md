# Email Agent Practice

One LangChain + LangGraph practice project: a TypeScript agent that **reads Gmail**,
classifies intent, searches local docs or files a GitHub issue, **drafts a reply**,
pauses for **human review**, then **sends** the response. A Next.js + CopilotKit UI
runs the same graph with in-chat review.

## Setup

Requires **Node.js 20+** and **pnpm 11.9.0** (pinned in `package.json`).

If `pnpm install` fails with a missing CLI under `~/.pnpm/.tools`, activate the
pinned version via Corepack first:

```bash
npm run setup        # corepack enable + pnpm@11.9.0
pnpm install
```

Otherwise:

```bash
pnpm install
cp .env.example .env   # fill in keys (see below)
pnpm gmail:token       # one-time: mint GOOGLE_REFRESH_TOKEN
```

Required in `.env`: `OPENAI_API_KEY`, Gmail OAuth vars, `GITHUB_TOKEN`, `GITHUB_REPO`.

## Run

**Recommended — agent server + web UI (human review in browser):**

```bash
pnpm dev
# LangGraph API  → http://localhost:2024
# Next.js + UI   → http://localhost:3000
```

**Terminal-only (interactive review in the shell):**

```bash
pnpm cli
```

Skip the review prompt in the terminal:

```bash
AUTO_APPROVE=true pnpm cli
```

> `@langchain/langgraph-cli` dev server officially supports Node 20. On Node 22+,
> if port 2024 never binds, use `nvm use 20`.

## Layout

```
src/
  main.ts         CLI entry (pnpm cli)
  lib/            env + OpenAI model factory
  email-agent/    LangGraph workflow
    graph.ts        exports `graph` for dev server + `compileWithMemory()` for CLI
    nodes/          read → classify → docSearch/bugTrack → draft → review → send
    integrations/   gmail.ts, github.ts, doc-search.ts
docs/             knowledge-base markdown for doc search
web/              Next.js + CopilotKit UI
langgraph.json    exposes graph as "emailAgent"
scripts/
  get-gmail-token.mjs
pnpm-workspace.yaml
```

Default model: `gpt-4o-mini` (`OPENAI_MODEL` in `.env`).
