# @repo/agent

LangChain + LangGraph agent backend. Hosts the CopilotKit runtime and a small
REST surface.

## Endpoints

| Method | Path          | Description                                         |
| ------ | ------------- | --------------------------------------------------- |
| POST   | `/copilotkit` | CopilotKit v2 runtime (proxies to the LangGraph server). |
| POST   | `/chat`       | Streaming chat over Server-Sent Events (in-process graph). |
| GET    | `/health`     | Liveness probe.                                     |

## Processes

`pnpm dev` runs two things via `concurrently`:

- `dev:graph` — `langgraphjs dev` on `:2024`, serving graphs from `langgraph.json`.
- `dev:api` — the Hono server on `AGENT_PORT` (default `4000`).

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

Reads from the repo-root `.env` (see `../../.env.example`): `OPENAI_API_KEY`,
`OPENAI_MODEL`, `AGENT_PORT`, `LANGGRAPH_DEPLOYMENT_URL`, `CORS_ORIGINS`.
