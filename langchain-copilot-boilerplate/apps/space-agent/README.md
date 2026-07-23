# @repo/space-agent

Hono BFF that mounts the CopilotKit runtime (`createCopilotHonoHandler`) and
the embedded LangGraph platform app (`/langgraph`, D1 checkpoints + thread
metadata when `MEMORY_WORKER_URL` is set). The runtime's `LangGraphAgent`
adapters call `/langgraph` over loopback with the caller's Firebase token.

This package also owns everything **product-specific**: the workspace graph,
tools, and the agent registry. The reusable mechanics (verified identity,
embed app, D1 savers, durable-memory middleware, `CopilotRuntime` factory)
come from `@repo/agent-runtime`.

## Layout

```
src/
  server.ts              ~10 lines: startAgentServer + product wiring
  graphs/agent-ids.ts    dependency-free agent id contract (frontend sync)
  graphs/registry.ts     agent registry + embed app / runtime wiring
  agents/workspace-agent/  createAgent ReAct loop: graph.ts, prompt.ts
  agents/resume-agent/   hand-built StateGraph demo: conditional edges over
                         the resume API (see its graph.ts header diagram)
  tools/                 registered agent tools
  middleware/workspace-tools.ts  executes tools as the verified user
  services/api-client.ts typed client for the existing product REST API
  services/workspace-api.ts      product REST endpoints behind the tools
  services/resume-api.ts resume fetch + completeness check (drives routing)
  config/env.ts          product env fragment merged over the runtime's env
  regression/            harness + checks for the experimental embed API
                         (run before/after upgrading @langchain/langgraph-api)
langgraph.json           Graph map for LangGraph Studio (`pnpm studio`) —
                         Studio renders each graph's nodes/edges visually
```

Two agents ship as references: `workspaceAgent` (prebuilt `createAgent`
ReAct loop with tools + middleware) and `resumeAgent` (hand-built
`StateGraph` with custom state channels and two data-driven conditional
branches). Visualize either in Studio or via
`GET /langgraph/assistants/:id/graph`.

**Add a tool over your REST API**: create `src/tools/<name>.tool.ts`
wrapping `apiRequest()` from `services/api-client.ts`, register it in
`src/tools/index.ts`, and take the acting identity from the trusted agent
context — never from model arguments.

**Add an agent**: create `src/agents/<name>/graph.ts` exporting `graph` and
add an entry (with the graph) to `src/graphs/registry.ts`; the CopilotKit
runtime and the embed app pick it up automatically.

## Endpoints

| Method | Path          | Auth                         | Description                                      |
| ------ | ------------- | ---------------------------- | ------------------------------------------------ |
| *      | `/copilotkit` | Firebase ID token (Bearer)   | CopilotKit v2 runtime (LangGraphAgent adapters). |
| *      | `/langgraph/*`| Firebase ID token (Bearer)   | Embedded LangGraph platform API (threads/runs).  |
| GET    | `/memory/*`   | Firebase ID token (Bearer)   | Transcript history for the chat sidebar.         |
| GET    | `/health`     | none                         | Liveness probe.                                  |

Set `FIREBASE_PROJECT_ID` to the same project as `VITE_FIREBASE_PROJECT_ID`
in the web app. The BFF verifies ID tokens with Google JWKS (no Admin key).

## Processes

Chat needs the BFF (and optionally the memory worker for D1):

1. This BFF: `pnpm --filter @repo/space-agent dev` (port `AGENT_PORT`, default `4000`)
2. Memory worker (recommended): `pnpm --filter @repo/memory-worker dev:space`

`pnpm dev` at the repo root starts this server and the workers via Turborepo
(the web app lives in its own repo).
LangGraph Studio is optional: `pnpm --filter @repo/space-agent studio`.

## Environment

Reads from `apps/space-agent/.env` (see `.env.example`):
`FIREBASE_PROJECT_ID`, `OPENAI_*`, `AGENT_PORT`, `CORS_ORIGINS`,
`API_BASE_URL`, and optional `MEMORY_WORKER_URL` / realtime vars.
