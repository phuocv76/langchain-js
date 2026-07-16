# @repo/agent

LangChain + LangGraph agent runtime. Hosts the CopilotKit runtime and a small
REST surface, called directly by the chat frontend with a Firebase bearer token.

## Endpoints

| Method | Path          | Auth            | Description                                                |
| ------ | ------------- | --------------- | ---------------------------------------------------------- |
| POST   | `/copilotkit` | Firebase bearer | CopilotKit v2 runtime (proxies to the LangGraph server).   |
| POST   | `/chat`       | Firebase bearer | Streaming chat over Server-Sent Events (in-process graph). |
| GET    | `/memory/*`   | Firebase bearer | Transcript history for the chat sidebar.                   |
| GET    | `/health`     | none            | Liveness probe.                                            |

Authenticated endpoints require `Authorization: Bearer <Firebase ID token>`.
When `ALLOWED_EMAIL_DOMAINS` is configured, only verified emails on those
domains are accepted.

## Processes

`pnpm dev` runs two things via `concurrently`:

- `dev:graph` — `langgraphjs dev` on `:2024`, serving graphs from `langgraph.json`.
- `dev:api` — the Hono server on `AGENT_PORT` (default `4000`).

`pnpm build` bundles the Hono runtime to `dist/server.js`; `pnpm start` runs that
artifact with plain Node. The LangGraph service remains a separate deployment and
must never be reachable from outside the trust boundary — identity arrives there
as plain `x-agent-*` headers.

### LangGraph server in Docker (Postgres checkpoints)

`pnpm dev:server` replaces `dev:graph` with the self-hosted LangGraph server:
`docker-compose.langgraph.yml` runs Postgres + Redis + the API image built by
`Dockerfile.langgraph` (monorepo-aware pnpm build — the official
`langgraphjs build` cannot resolve `workspace:*` dependencies). Checkpoints
and threads then live in Postgres instead of the dev server's
`.langgraph_api/` file cache, matching production behavior.

Setup: `cp .env.docker.sample .env.docker`, fill `LANGSMITH_API_KEY` (free
Lite license from smith.langchain.com) and the other values — service URLs
must use `host.docker.internal` because the graph runs inside a container.
The API serves on `:2024` like `dev:graph`, so run one mode at a time; stop
with `pnpm dev:server:down`. Inspect checkpoints at `localhost:5433`
(postgres/postgres).

## Layout

```
src/
  server.ts              Hono entry (CORS, bearer auth, routes, CopilotKit mount)
  copilotkit.ts          CopilotRuntime + LangGraphAgent registry
  config/env.ts          Zod-validated environment
  agents/workspace-agent/  graph.ts (createAgent), prompt.ts, index.ts
  graphs/registry.ts     agent registry for the runtime
  tools/                 registered agent tools
  services/api-client.ts typed client for the existing product REST API
  models/                ChatOpenAI singleton
  routes/ controllers/ services/ schemas/ middleware/ utils/
```

## Calling the existing REST API from tools

`services/api-client.ts` is the single entry point: it sends the
`API_SERVICE_TOKEN` as the service credential plus `X-Acting-User-Id`,
`X-Acting-User-Email`, and `X-Request-Id` headers, and bounds every request
with `API_TIMEOUT_MS`. Wrap it in a tool and inject identity from the trusted
context inside a middleware `wrapToolCall` (see `middleware/durable-memory.ts`
for the working pattern):

```ts
const identity = (request.state as AgentState).agentContext;
const orders = await apiRequest<Order[]>('/v1/orders', { identity });
```

The model never supplies user ids — tools must ignore any identity present in
model arguments.

## Environment

Reads from `apps/agent/.env` (see `.env.example` in this directory):
`OPENAI_*`, `AGENT_PORT`, `LANGGRAPH_DEPLOYMENT_URL`, `CORS_ORIGINS`,
`ALLOWED_EMAIL_DOMAINS`, `FIREBASE_*` (required in production),
`API_BASE_URL` + `API_SERVICE_TOKEN`
(+ optional `API_TIMEOUT_MS`), and optionally `MEMORY_WORKER_URL` +
`CF_ACCESS_CLIENT_ID` + `CF_ACCESS_CLIENT_SECRET` for durable transcript
memory (no-ops when unset).
