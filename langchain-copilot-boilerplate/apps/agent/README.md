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
  tools/                 registered agent tools
  prompts/               system prompts
  models/                ChatOpenAI singleton
  routes/ controllers/ services/ schemas/ middleware/ utils/
```

## Environment

Reads from `apps/agent/.env` (see `.env.example` in this directory):
`OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`,
`OPENAI_MAX_OUTPUT_TOKENS`, `OPENAI_REQUEST_TIMEOUT_MS`,
`OPENAI_MAX_RETRIES`, `AGENT_PORT`, `LANGGRAPH_DEPLOYMENT_URL`,
`CORS_ORIGINS`, and (in production) `COPILOT_RUNTIME_SECRET`.

For durable chat history in the Cloudflare deployment, configure
`MEMORY_SERVICE_URL` (the Agent Worker's own URL) and
`MEMORY_INTERNAL_SECRET`. The same Agent Worker stores transcripts in D1 and
indexes them in Vectorize; there is no separate memory Worker.

## Cloudflare Worker deployment

`wrangler.jsonc` deploys the Agent API and durable-memory implementation as one
Worker. Create the D1 database and Vectorize index, replace the D1 database ID,
then apply the migration with one of these commands:

```bash
# Local Wrangler D1 database
pnpm db:migrate:local

# Cloudflare D1 database (requires a real database_id in wrangler.jsonc)
pnpm db:migrate:remote
```

Set `MEMORY_INTERNAL_SECRET` with `wrangler secret put`. Set
`MEMORY_SERVICE_URL` to this Worker's public URL for the remote LangGraph
runtime.
