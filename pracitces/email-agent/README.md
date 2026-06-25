# LangChain Practice Agents

Three LangChain + LangGraph practice agents in one monorepo:

| Agent                  | Graph ID        | Description                                                    |
| ---------------------- | --------------- | -------------------------------------------------------------- |
| **Email Agent**        | `emailAgent`    | Read Gmail, classify, draft replies, human review, send        |
| **AI News Summarizer** | `newsAgent`     | `createAgent` + tools + middleware + structured output         |
| **Warranty Assistant** | `warrantyAgent` | Multi-agent handoffs, RAG, human-in-the-loop, long-term memory |

A Vite + CopilotKit UI lets you switch agents in the sidebar and chat with each graph.

## Architecture

This project is a monorepo with three services (mirrors the [langchainjs](https://github.com/CopilotKit/CopilotKit) template layout):

| Service                   | Port | Description                                               |
| ------------------------- | ---- | --------------------------------------------------------- |
| **Frontend** (`apps/app`) | 3000 | Vite + React app with CopilotKit chat UI and agent picker |
| **BFF** (`apps/bff`)      | 4000 | Hono server running the CopilotKit runtime                |
| **Agent** (`apps/agent`)  | 2024 | LangGraph email agent                                     |

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

Required in `.env`: `OPENAI_API_KEY`. Email agent also needs Gmail OAuth vars, `GITHUB_TOKEN`, `GITHUB_REPO`.

Optional: `TAVILY_API_KEY` for richer news search (otherwise Hacker News Algolia fallback).

## Run

**Recommended — agent + BFF + web UI (human review in browser):**

```bash
pnpm dev
# LangGraph API  → http://localhost:2024
# BFF            → http://localhost:4000
# Vite + UI      → http://localhost:3000
```

You can also run each service directly:

```bash
pnpm dev:agent
pnpm dev:bff
pnpm dev:app
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
apps/
  agent/          LangGraph workflows + CLI entry
    src/
      main.ts         CLI entry (pnpm cli)
      lib/            env + OpenAI model factory
      email-agent/    Gmail workflow graph
      news-agent/     Core practice: createAgent, middleware, structured output
      warranty-agent/ Advanced practice: handoffs, RAG, HITL, memory
    langgraph.json    exposes emailAgent, newsAgent, warrantyAgent
  app/            Vite + React + CopilotKit UI (agent picker in sidebar)
  bff/            Hono CopilotKit runtime (proxied by Vite)
docs/
  warranty/       RAG knowledge base for warranty agent
scripts/
  get-gmail-token.mjs
pnpm-workspace.yaml
```

Default model: `gpt-4o-mini` (`OPENAI_MODEL` in `.env`).
