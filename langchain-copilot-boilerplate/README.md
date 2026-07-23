# LangChain + LangGraph Agent Runtime Boilerplate

A **Turborepo** boilerplate for the backend of a full-window AI chatbot: a
**BFF** built with **Hono** + the **CopilotKit runtime**, and **LangGraph**
agents served through an **embedded LangGraph platform app**
(`createEmbedServer`). When `MEMORY_WORKER_URL` is configured, checkpoints,
threads, and transcript history are persisted in D1; otherwise the runtime
uses in-process fallbacks — no separate agent server.
The frontend lives in its own repository (`langchain-copilot-web`).

Business data lives in your existing REST API (separate repo), which agent
tools call through a typed client.

- Frontend: **separate repository** (`langchain-copilot-web`) — Vite +
  React full-window CopilotKit chat that calls this BFF directly from the
  browser. This monorepo is backend-only.
- `apps/space-agent` — the space product's agent server: its LangGraph
  graphs, tools, and agent registry over the shared runtime composition
  (CopilotKit `/copilotkit`, embedded LangGraph `/langgraph`, transcript
  `/memory`, `/health`; optional `pnpm studio` for LangGraph Studio).
- `apps/kitchen-agent` — skeleton for the next product: same shape as
  space-agent with its own registry, port, env, and D1 database. Copy it to
  add a product.
- `workers/memory-worker` — Cloudflare Worker owning durable transcript state
  and LangGraph engine checkpoints in D1.
- `workers/realtime-worker` — Cloudflare Worker + Durable Objects for
  cross-session thread/message sync (`GET /ws`, `POST /publish`).
- `packages/agent-runtime` — reusable, product-agnostic agent runtime
  (identity, embedded LangGraph app, D1 persistence, durable memory).
- `packages/*` — shared config, cross-app contracts, and prompt builders.

## Architecture

```mermaid
flowchart LR
  UI["langchain-copilot-web (separate repo)<br/>Vite + React CopilotChat"]
  subgraph bff [apps/space-agent (one per product): Hono + CopilotKit]
    Identity["Firebase Bearer → x-agent-*"]
    Runtime["createCopilotHonoHandler /copilotkit"]
    Adapter["LangGraphAgent adapter (@ag-ui/langgraph)"]
    Embed["/langgraph: createEmbedServer + assistants shim"]
    Graph["createAgent + D1CheckpointSaver + D1ThreadSaver"]
    Tools["Tools -> api-client"]
  end
  MW["workers/memory-worker (D1): transcript + checkpoints + threads"]
  API["Existing REST API (separate repo)"]
  UI -->|CORS| Identity --> Runtime --> Adapter
  Adapter -->|loopback + user Bearer| Embed --> Graph
  Graph --> Tools -->|user Bearer token| API
  Graph <-->|transcript + checkpoints + threads| MW
```

The BFF verifies Firebase ID tokens, injects sanitized `x-agent-*` headers,
and serves the graph through the embedded LangGraph platform routes
(`/langgraph`, experimental `createEmbedServer` pinned by version); the
CopilotKit runtime reaches them with stock `LangGraphAgent` adapters over
loopback, re-presenting the caller's token. Tools call the existing REST API
with the user's Bearer token — identity always comes from that trusted
context, never from model arguments. CopilotKit Intelligence is not used.

## Tech stack

| Area     | Choice                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| Monorepo | Turborepo + pnpm workspaces + TypeScript (strict)                                                          |
| Frontend | Vite, React 19, Tailwind CSS 4, CopilotKit v2 CopilotChat                                                  |
| BFF      | Node, Hono, CopilotKit runtime + embedded LangGraph platform app                                           |
| Agent    | LangChain, LangGraph, Zod                                                                                  |
| Identity | Firebase ID token (JWKS verify on BFF)                                                                     |
| Tooling  | `@repo/eslint-config` + `@repo/typescript-config`; pnpm catalog for shared versions; Prettier at repo root |

## Getting started

Requirements:

- Node.js 20 or newer
- pnpm 11.11.0 (`corepack enable`)

```bash
# 1. Install dependencies
pnpm install

# 2. Configure the space product
cp apps/space-agent/.env.example apps/space-agent/.env
# Set OPENAI_API_KEY and FIREBASE_PROJECT_ID. API_BASE_URL is optional;
# without it, product-API tools are not advertised to the model.

# 3. Initialize the local space D1 database (first run and after migrations)
pnpm --filter @repo/memory-worker db:apply:local:space

# 4. Configure local realtime sync
cp workers/realtime-worker/.dev.vars.sample \
  workers/realtime-worker/.dev.vars.space
# Set the same FIREBASE_PROJECT_ID and a REALTIME_PUBLISH_SECRET. Copy that
# secret into apps/space-agent/.env together with:
# REALTIME_WORKER_URL=http://localhost:8789

# 5. Start the space agent, memory worker, and realtime worker
pnpm dev
```

- Space agent/BFF: http://localhost:4000 (`/health`, `/copilotkit`,
  `/langgraph`, `/memory`)
- Memory worker: http://localhost:8788
- Realtime worker: http://localhost:8789
- Frontend: run `pnpm dev` in the separate `langchain-copilot-web` repository
  (normally http://localhost:3000)

For a minimal, non-durable setup, leave `MEMORY_WORKER_URL` and the realtime
variables unset and run `pnpm dev:space`. Transcript routes then return no
durable history, and graph checkpoints use an in-process `MemorySaver` that
resets whenever the agent restarts.

Note: `/copilotkit` and `/memory` require a Firebase ID token
(`Authorization: Bearer`). Set `FIREBASE_PROJECT_ID` in `apps/space-agent/.env`
(same project as the web app). `/langgraph/*` is protected by the same policy.

To run the kitchen skeleton instead, follow
[apps/kitchen-agent/README.md](apps/kitchen-agent/README.md); it uses separate
ports, environment files, and D1 storage.

### How the frontend connects

The frontend (`langchain-copilot-web`, separate repo) signs the user in with
the Firebase client SDK and mounts CopilotKit pointed directly at the BFF:

```tsx
<CopilotKit
  runtimeUrl="https://your-bff-host/copilotkit"
  agent="workspaceAgent"
>
  <CopilotChat agentId="workspaceAgent" />
</CopilotKit>
```

The BFF's `CORS_ORIGINS` must include the frontend origin (the default
`.env.example` allows `http://localhost:3000`). Firebase ID tokens expire
after about an hour — the frontend subscribes to `onIdTokenChanged` and
rotates the header via `copilotkit.setHeaders()`; see the
`langchain-copilot-web` repo's README.

### Useful scripts

```bash
pnpm dev              # space agent + space memory/realtime workers
pnpm dev:space        # space agent only
pnpm dev:kitchen      # kitchen agent only (configure its .env first)
pnpm dev:realtime     # space realtime worker only, on :8789
pnpm build            # build every buildable workspace
pnpm typecheck        # type-check every workspace
pnpm lint             # lint every workspace
pnpm test             # run workspace tests
pnpm format           # format supported files with Prettier
```

### Optional: realtime multi-tab sync

1. Copy `workers/realtime-worker/.dev.vars.sample` →
   `workers/realtime-worker/.dev.vars.space` and set `FIREBASE_PROJECT_ID` +
   `REALTIME_PUBLISH_SECRET`.
2. Set matching `REALTIME_WORKER_URL` + `REALTIME_PUBLISH_SECRET` in
   `apps/space-agent/.env`.
3. Set `VITE_REALTIME_WS_URL=ws://localhost:8789/ws` in the frontend repo's `.env`.
4. Run `pnpm dev`, or run `pnpm dev:realtime` alongside a separately started
   space agent and memory worker.

The agent publishes events after durable memory writes; browsers connect with
the Firebase ID token and stay in sync across tabs/devices.

## Repository layout

```
apps/               # one per product — copy an app to add a product
  space-agent/      Space product agent server: graphs/tools/agent registry
                    over the shared runtime composition (port 4000)
  kitchen-agent/    Skeleton product server — copy this to add a product
                    (port 4100, own env + own memory-worker D1)
workers/            # shared Cloudflare infra — never copied; deployed
                    # per product via wrangler envs
  memory-worker/    D1 transcript ledger + engine checkpoints
  realtime-worker/  Durable Objects WebSocket sync (optional)
packages/
  agent-runtime/      reusable runtime: verified identity, embedded LangGraph
                      app, D1 savers, durable-memory middleware,
                      CopilotRuntime factory
  shared/             cross-product wire contracts: identity claim headers/
                      types, memory turns, realtime events, summary prefix
  prompts/            reusable system-prompt builders
  eslint-config/      shared flat ESLint config
  typescript-config/  shared tsconfig presets (base, node)
```

Each product gets its own `apps/<product>-agent` server owning everything
product-specific and injecting its graphs into `@repo/agent-runtime`
(`src/graphs/registry.ts` is the single wiring point per app); the runtime
package never imports product code. Adding a product = copying the
`apps/kitchen-agent` skeleton, pointing it at its own memory-worker D1
(`wrangler deploy --env <product>`), and pairing it with its own frontend
repo.

## Dependency notes

Shared dependency versions live in ONE place: the `catalog:` section of
`pnpm-workspace.yaml`. Workspace packages reference them as `"catalog:"`,
so bumping a version there updates every consumer — including the exact
pins (`@langchain/langgraph-api`, `@copilotkit/runtime`,
`@ag-ui/langgraph`) that couple to embed-server internals. After changing
any of those, run the paired regression harnesses and checks below.

The same file pins the LangChain stack via `overrides`: a single
`langchain`/`@langchain/core` instance (CopilotKit's `@ag-ui/langgraph`
otherwise pulls a second copy, breaking channel identity checks), and
`@langchain/langgraph` at 1.4.4 (later 1.4.x type definitions reject this
zod release's state fields).
`packages/agent-runtime/src/middleware/durable-memory-state.ts` documents the
related runtime workaround — read both comments before upgrading any of
these packages, and re-verify graph construction (`pnpm dev`) after.

The regression harnesses use overlapping ports, so run only one harness chain
at a time:

```bash
# Shared prerequisite
pnpm --filter @repo/memory-worker dev:space

# CopilotKit gateway chain: embed on :2100, runtime on :2200
pnpm --filter @repo/space-agent regression:harness:gateway
pnpm --filter @repo/space-agent regression:chat-flow
pnpm --filter @repo/space-agent regression:hitl
pnpm --filter @repo/space-agent regression:trusted-context
pnpm --filter @repo/space-agent regression:summary-parity
pnpm --filter @repo/space-agent regression:resume-agent

# Direct embedded platform chain on :2100
pnpm --filter @repo/space-agent regression:harness:embed
pnpm --filter @repo/space-agent regression:embed-api
```

The `regression:trusted-context` check additionally needs `API_BASE_URL`.
The product API may reject its regression token; that is acceptable because
the check is validating trusted-context propagation and run completion.

## Extending the boilerplate

- **Add a tool over your REST API**: create
  the model-facing schema in `apps/space-agent/src/tools/`, implement its API
  operation through `services/api-client.ts`, and register its execution in
  `middleware/workspace-tools.ts`. Take the acting identity from the trusted
  agent context inside `wrapToolCall`, never from model-provided arguments.
- **Add an agent**: create `apps/space-agent/src/agents/<name>/graph.ts` exporting
  `graph`, add an entry (with the graph) to `graphs/registry.ts` — the
  CopilotKit runtime and the embedded LangGraph app pick it up automatically —
  then point the frontend `CopilotChat agentId=...` at it. Optionally register
  it in `langgraph.json` for LangGraph Studio.

See [apps/space-agent/README.md](apps/space-agent/README.md),
[apps/kitchen-agent/README.md](apps/kitchen-agent/README.md),
[workers/memory-worker/README.md](workers/memory-worker/README.md),
[workers/realtime-worker/README.md](workers/realtime-worker/README.md), and
[packages/agent-runtime/README.md](packages/agent-runtime/README.md) for
details.
