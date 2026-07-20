# @repo/agent

LangChain + LangGraph agent library used by `@repo/bff`. Graphs run
**in-process** inside the BFF; this package owns tools, the AG-UI bridge, and
`D1CheckpointSaver` persistence through `apps/memory-worker`. It does not
listen on a port — the Hono + CopilotKit HTTP surface lives in `@repo/bff`.

## Layout

```
src/
  index.ts               Public exports consumed by the BFF
  config/env.ts          Zod-validated environment
  config/intelligence.ts CopilotRuntime + per-request agent factory
  agents/workspace-agent/  graph.ts (createAgent), agui-bridge.ts, prompt.ts
  graphs/registry.ts     agent registry for the runtime
  tools/                 registered agent tools
  services/api-client.ts typed client for the existing product REST API
  services/d1-checkpoint-saver.ts  LangGraph checkpointer over the memory worker
  models/                ChatOpenAI singleton
  routes/ controllers/ middleware/  HTTP pieces mounted by the BFF
```

## Short-term memory (checkpoints)

The graph compiles with `D1CheckpointSaver`
(`src/services/d1-checkpoint-saver.ts`), which persists LangGraph checkpoints
through the memory worker into D1 — conversations survive process restarts,
checkpoint rows are scoped per user, and the worker prunes each thread to its
latest 20 checkpoints. Requires `MEMORY_WORKER_URL` (set in `apps/bff/.env`);
without it the agent falls back to in-memory checkpoints (threads reset on
restart) and logs a warning.

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

Runtime env is owned by `apps/bff/.env` (see `apps/bff/.env.example`). Agent
unit tests load that file via the `test` script.
