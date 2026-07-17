# @repo/agent

LangChain + LangGraph agent runtime. Hosts the CopilotKit runtime with the
graph running **in this process**, called directly by the chat frontend with
a Firebase bearer token. All durable state (transcript ledger and engine
checkpoints) lives in D1 behind `apps/memory-worker`.

## Endpoints

| Method | Path          | Auth            | Description                                     |
| ------ | ------------- | --------------- | ----------------------------------------------- |
| POST   | `/copilotkit` | Firebase bearer | CopilotKit v2 runtime (in-process agents).      |
| GET    | `/memory/*`   | Firebase bearer | Transcript history for the chat sidebar.        |
| GET    | `/health`     | none            | Liveness probe.                                 |

Authenticated endpoints require `Authorization: Bearer <Firebase ID token>`.
When `ALLOWED_EMAIL_DOMAINS` is configured, only verified emails on those
domains are accepted.

## Processes

`pnpm dev` runs the Hono server on `AGENT_PORT` (default `4000`) — that is
the whole agent runtime; there is no separate graph server. `pnpm build`
bundles it to `dist/server.js`; `pnpm start` runs that artifact with plain
Node.

Runs execute through an AG-UI bridge
(`src/agents/workspace-agent/agui-bridge.ts`): the CopilotKit runtime builds
a per-request agent closing over the verified user, the bridge streams
`graph.streamEvents` and translates model/tool events into AG-UI events.

### Short-term memory (checkpoints)

The graph compiles with `D1CheckpointSaver`
(`src/services/d1-checkpoint-saver.ts`), which persists LangGraph checkpoints
through the memory worker into D1 — conversations survive process restarts,
checkpoint rows are scoped per user, and the worker prunes each thread to its
latest 20 checkpoints. Requires `MEMORY_WORKER_URL`; without it the agent
falls back to in-memory checkpoints (threads reset on restart) and logs a
warning.

## Layout

```
src/
  server.ts              Hono entry (CORS, bearer auth, routes, CopilotKit mount)
  copilotkit.ts          CopilotKit runtime fetch handler
  config/env.ts          Zod-validated environment
  config/intelligence.ts CopilotRuntime + per-request agent factory
  agents/workspace-agent/  graph.ts (createAgent), agui-bridge.ts, prompt.ts
  graphs/registry.ts     agent registry for the runtime
  tools/                 registered agent tools
  services/api-client.ts typed client for the existing product REST API
  services/d1-checkpoint-saver.ts  LangGraph checkpointer over the memory worker
  models/                ChatOpenAI singleton
  routes/ controllers/ services/ middleware/ utils/
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
`OPENAI_*`, `AGENT_PORT`, `CORS_ORIGINS`, `ALLOWED_EMAIL_DOMAINS`,
`FIREBASE_*` (required in production), `API_BASE_URL` + `API_SERVICE_TOKEN`
(+ optional `API_TIMEOUT_MS`), and `MEMORY_WORKER_URL` +
`CF_ACCESS_CLIENT_ID` + `CF_ACCESS_CLIENT_SECRET` for durable memory and
checkpoints (transcript features and restart-surviving threads need the
worker; without it the agent degrades to stateless-per-restart chat).
