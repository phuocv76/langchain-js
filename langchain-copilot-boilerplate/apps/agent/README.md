# @repo/agent

LangChain + LangGraph agents and tools. Graphs run **in-process** inside the
BFF CopilotKit runtime (`BuiltInAgent` + `D1CheckpointSaver` when
`MEMORY_WORKER_URL` is set). This package exports the `CopilotRuntime`
factory and shared Hono routes (`/health`, `/memory`).

CopilotKit Intelligence is **not** used — durable transcript history and
engine checkpoints both live in D1 behind `apps/memory-worker`.

## Layout

```
src/
  index.ts               Public exports consumed by the BFF
  config/env.ts          Zod-validated environment
  config/intelligence.ts CopilotRuntime + BuiltInAgent wiring
  agents/workspace-agent/  graph.ts, agui-bridge.ts, prompt.ts
  graphs/registry.ts     agent registry (id + graphId)
  tools/                 registered agent tools
  services/api-client.ts typed client for the existing product REST API
  services/d1-checkpoint-saver.ts  LangGraph checkpointer → memory worker
  models/                ChatOpenAI singleton
  routes/ controllers/ middleware/  HTTP pieces mounted by the BFF
langgraph.json           Optional graph map for LangGraph Studio
```

## Optional LangGraph Studio

```bash
# from repo root — uses apps/agent/.env
pnpm --filter @repo/agent studio
# → http://localhost:2024  (graph id: workspaceAgent)
```

Studio still uses the Agent Server's local checkpointer; production chat
does not go through it.

## Calling the existing REST API from tools

`services/api-client.ts` is the single entry point: it sends the signed-in
user's Firebase ID token as `Authorization: Bearer` (forwarded from the BFF
as `x-agent-access-token`) plus `X-Request-Id`. Wrap it in a tool and inject
identity from the trusted context inside a middleware `wrapToolCall`
(see `middleware/workspace-tools.ts`).

The model never supplies user ids — tools must ignore any identity present in
model arguments.

## Environment

Runtime env is owned by `apps/bff/.env` / `apps/agent/.env` (see
`apps/bff/.env.example`).
