# @repo/agent

LangChain + LangGraph agent backend. Hosts the CopilotKit runtime and a small
REST surface.

## Endpoints

| Method | Path          | Description                                                |
| ------ | ------------- | ---------------------------------------------------------- |
| POST   | `/copilotkit` | CopilotKit v2 runtime (proxies to the LangGraph server).   |
| POST   | `/chat`       | Streaming chat over Server-Sent Events (in-process graph). |
| GET    | `/health`     | Liveness probe.                                            |

## Processes

`pnpm dev` runs two things via `concurrently`:

- `dev:graph` — `langgraphjs dev` on `:2024`, serving graphs from `langgraph.json`.
- `dev:api` — the Hono server on `AGENT_PORT` (default `4000`).

`pnpm build` bundles the Hono runtime to `dist/server.js`; `pnpm start` runs that
artifact with plain Node. The LangGraph service remains a separate deployment.

## Layout

```
src/
  server.ts              Hono entry (routes + CopilotKit mount)
  copilotkit.ts          CopilotRuntime + LangGraphAgent registry
  config/env.ts          Zod-validated environment
  agents/default-agent/  graph.ts (createAgent), state.ts, index.ts
  graphs/registry.ts     agent registry for the runtime
  tools/                 greeting.tool.ts + index.ts
  prompts/               system prompts
  models/                ChatOpenAI singleton
  routes/ controllers/ services/ schemas/ middleware/ utils/
```

## Environment

Reads from `apps/agent/.env` (see `.env.example` in this directory):
`OPENAI_API_KEY`, `OPENAI_MODEL`, `AGENT_PORT`, `LANGGRAPH_DEPLOYMENT_URL`,
`CORS_ORIGINS`, and (in production) `COPILOT_RUNTIME_SECRET`.

For durable chat history, also set `INTELLIGENCE_API_URL`, `INTELLIGENCE_GATEWAY_WS_URL`,
and `INTELLIGENCE_API_KEY` in this file, plus `NEXT_PUBLIC_COPILOTKIT_PUBLIC_LICENSE_KEY`
in `apps/web/.env`.
