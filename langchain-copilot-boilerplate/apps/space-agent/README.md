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

## Endpoints

| Method                  | Path                                         | Auth                       | Description                                       |
| ----------------------- | -------------------------------------------- | -------------------------- | ------------------------------------------------- |
| `POST` / runtime routes | `/copilotkit`, `/copilotkit/*`               | Firebase ID token (Bearer) | CopilotKit v2 runtime (LangGraphAgent adapters).  |
| Platform routes         | `/langgraph`, `/langgraph/*`                 | Firebase ID token (Bearer) | Embedded LangGraph threads, runs, and assistants. |
| `GET`                   | `/memory/threads`                            | Firebase ID token (Bearer) | List the signed-in user's transcript threads.     |
| `GET`                   | `/memory/threads/:threadId/history-messages` | Firebase ID token (Bearer) | Read one thread's durable chat history.           |
| `PATCH`                 | `/memory/threads/:threadId`                  | Firebase ID token (Bearer) | Rename a thread.                                  |
| `DELETE`                | `/memory/threads/:threadId`                  | Firebase ID token (Bearer) | Delete a thread and all of its durable state.     |
| `GET`                   | `/health`                                    | none                       | Liveness probe.                                   |

Set `FIREBASE_PROJECT_ID` to the same project as `VITE_FIREBASE_PROJECT_ID`
in the web app. The BFF verifies ID tokens with Google JWKS (no Admin key).

## Local development

From the repository root:

```bash
# Install all workspace dependencies
pnpm install

# Configure this app, including OPENAI_API_KEY and FIREBASE_PROJECT_ID
cp apps/space-agent/.env.example apps/space-agent/.env

# Initialize local D1 on first run and after new migrations
pnpm --filter @repo/memory-worker db:apply:local:space

# Start this app plus the space memory and realtime workers
pnpm dev
```

`pnpm dev` also starts the realtime worker, which reads
`workers/realtime-worker/.dev.vars.space`. Create that file from
`.dev.vars.sample` and set `FIREBASE_PROJECT_ID` and
`REALTIME_PUBLISH_SECRET` when realtime sync is enabled.

Run the services separately when needed:

```bash
pnpm --filter @repo/space-agent dev          # BFF on :4000
pnpm --filter @repo/memory-worker dev:space  # local D1 worker on :8788
pnpm --filter @repo/realtime-worker dev:space # optional sync worker on :8789
pnpm --filter @repo/space-agent studio       # optional Studio on :2024
```

The frontend lives in the separate `langchain-copilot-web` repository. Its
Firebase project must match this app, its runtime URL should end in
`/copilotkit`, and its optional realtime URL is
`ws://localhost:8789/ws`.

## Environment

This app reads `apps/space-agent/.env`; start with `.env.example`.

| Variable                                                                                                                 | Required                 | Purpose                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`                                                                                                         | yes                      | Constructs the shipped agent graphs.                                                            |
| `FIREBASE_PROJECT_ID`                                                                                                    | yes for protected routes | Firebase project whose ID tokens are accepted.                                                  |
| `AGENT_PORT`                                                                                                             | no                       | BFF port; defaults to `4000`.                                                                   |
| `CORS_ORIGINS`                                                                                                           | no                       | Comma-separated frontend origins; defaults to `http://localhost:3000`.                          |
| `API_BASE_URL`                                                                                                           | no                       | Existing product API. Workspace tools are disabled and resume data is unavailable when omitted. |
| `API_TIMEOUT_MS`                                                                                                         | no                       | Product API timeout; defaults to `10000`.                                                       |
| `MEMORY_WORKER_URL`                                                                                                      | no                       | Enables D1 transcript, checkpoint, and thread persistence.                                      |
| `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`                                                                         | deployed worker only     | Cloudflare Access service-token pair; configure both together.                                  |
| `REALTIME_WORKER_URL`, `REALTIME_PUBLISH_SECRET`                                                                         | no                       | Enables cross-session events; configure both together.                                          |
| `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`, `OPENAI_MAX_OUTPUT_TOKENS`, `OPENAI_REQUEST_TIMEOUT_MS`, `OPENAI_MAX_RETRIES` | no                       | Model and request tuning; see `.env.example` for defaults.                                      |
| `ALLOWED_EMAIL_DOMAINS`                                                                                                  | no                       | Comma-separated allowlist for verified user email domains.                                      |
| `NODE_ENV`                                                                                                               | no                       | Runtime mode; defaults to `development`.                                                        |
| `COPILOTKIT_LICENSE_TOKEN`, `COPILOTKIT_TELEMETRY_DISABLED`                                                              | no                       | Optional CopilotKit licensing and telemetry controls.                                           |
| `LANGSMITH_API_KEY`, `LANGSMITH_TRACING`, `LANGSMITH_PROJECT`                                                            | no                       | Optional LangSmith tracing and Studio configuration.                                            |

Without `MEMORY_WORKER_URL`, transcript operations no-op and engine state
falls back to in-process storage that resets on restart.

## Validation

```bash
pnpm --filter @repo/space-agent lint
pnpm --filter @repo/space-agent typecheck
pnpm --filter @repo/space-agent test
pnpm --filter @repo/space-agent build
pnpm --filter @repo/space-agent start # run the built server with .env
```

The `regression:*` scripts in `package.json` exercise the experimental
embedded LangGraph and CopilotKit integration. Both harnesses use port
`2100`, so run only one chain at a time:

```bash
# Terminal 1: prerequisite for either chain
pnpm --filter @repo/memory-worker dev:space

# Terminal 2: production embed app + CopilotKit runtime (:2100 and :2200)
pnpm --filter @repo/space-agent regression:harness:gateway

# Terminal 3: checks paired with the gateway harness
pnpm --filter @repo/space-agent regression:chat-flow
pnpm --filter @repo/space-agent regression:hitl
pnpm --filter @repo/space-agent regression:trusted-context
pnpm --filter @repo/space-agent regression:summary-parity
pnpm --filter @repo/space-agent regression:resume-agent
```

Alternatively, pair the direct platform harness with its API check:

```bash
pnpm --filter @repo/space-agent regression:harness:embed
pnpm --filter @repo/space-agent regression:embed-api
```

`regression:trusted-context` additionally requires `API_BASE_URL`. Run the
relevant chain before and after changing pinned LangGraph, CopilotKit, or
AG-UI dependencies.

## Extending the app

**Add a tool over your REST API**: define its model-facing schema in
`src/tools/`, implement the API operation through
`services/api-client.ts`, and register its execution in
`middleware/workspace-tools.ts`. Take the acting identity from the trusted
agent context inside `wrapToolCall`, never from model arguments. Plain tools
that do not need authenticated product data can follow
`tools/greeting.tool.ts` and be registered in `tools/index.ts`.

**Add an agent**: create `src/agents/<name>/graph.ts` exporting `graph` and
add an entry (with the graph) to `src/graphs/registry.ts`; the CopilotKit
runtime and the embed app pick it up automatically. Add the same graph ID to
`langgraph.json` if it should appear in LangGraph Studio.
