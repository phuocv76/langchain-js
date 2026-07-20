# LangChain + LangGraph Agent Runtime Boilerplate

A **Turborepo** boilerplate for a full-window AI chatbot: a **Vite + React**
frontend and a **BFF** built with **Hono** + the **CopilotKit runtime**,
composing in-process **LangChain JS** / **LangGraph** agents.

Business data lives in your existing REST API (separate repo), which agent
tools call through a typed client.

- `apps/web` — Vite + React product frontend: Google sign-in (Firebase) and a
  full-window CopilotKit chat that calls the BFF directly from the browser
  (no proxy layer).
- `apps/bff` — Hono service composing the CopilotKit runtime
  (`POST /copilotkit`), transcript history (`GET /memory/*`), and
  `GET /health`.
- `apps/agent` — LangGraph agents, tools, and `D1CheckpointSaver` (library
  used in-process by the BFF; not a separate HTTP server).
- `apps/memory-worker` — Cloudflare Worker owning all durable state in D1:
  the transcript ledger, semantic recall, and the engine's checkpoints
  (short-term memory).
- `apps/realtime-worker` — Cloudflare Worker + Durable Objects for
  cross-session thread/message sync (`GET /ws`, `POST /publish`).
- `packages/*` — shared config, types, constants, and prompt builders.

## Architecture

```mermaid
flowchart LR
  UI["apps/web: Vite + React<br/>CopilotChat full-window"]
  subgraph bff [apps/bff: Hono + CopilotKit]
    Auth["Bearer auth (Firebase ID token)"]
    Runtime["CopilotKit Runtime POST /copilotkit"]
  end
  subgraph agent [apps/agent: in-process library]
    Bridge["AG-UI bridge (BuiltInAgent)"]
    Graph["workspaceAgent (createAgent)"]
    Tools["Tools -> api-client"]
    D1Saver["D1CheckpointSaver"]
  end
  MW["apps/memory-worker (D1):<br/>transcript + checkpoints"]
  API["Existing REST API (separate repo)"]
  UI -->|Authorization: Bearer + CORS| Auth --> Runtime --> Bridge --> Graph
  Graph --> Tools -->|service token + acting-user headers| API
  Graph <-->|checkpoints via D1Saver + transcript| MW
```

The frontend sends the signed-in user's **Firebase ID token** as
`Authorization: Bearer`. The BFF verifies it (with revocation checking) and,
when `ALLOWED_EMAIL_DOMAINS` is set, only accepts verified emails on those
domains (e.g. company accounts). The verified identity is injected into each
graph run's config — agents run in the same process, so the raw credential
never leaves the BFF. Tools call the existing REST API with a
**service credential** plus acting-user headers — identity always comes from
the verified context, never from model arguments.

## Tech stack

| Area     | Choice                                                                    |
| -------- | ------------------------------------------------------------------------- |
| Monorepo | Turborepo + pnpm workspaces + TypeScript (strict)                         |
| Frontend | Vite, React 19, Tailwind CSS 4, CopilotKit v2 CopilotChat                 |
| BFF      | Node, Hono, CopilotKit runtime                                            |
| Agent    | LangChain, LangGraph, Zod, D1CheckpointSaver                              |
| Identity | Firebase Auth (Google sign-in on web; token verified via firebase-admin)  |
| Tooling  | Shared ESLint (flat) + tsconfig via `@repo/config`; Prettier at repo root |

## Getting started

Requirements: Node >= 20 and pnpm (`corepack enable`).

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp apps/bff/.env.example apps/bff/.env
# set OPENAI_API_KEY; set FIREBASE_* to enable authenticated endpoints;
# set ALLOWED_EMAIL_DOMAINS to restrict sign-in to your company accounts;
# set API_BASE_URL + API_SERVICE_TOKEN so tools can call your REST API
cp apps/web/.env.example apps/web/.env
# set VITE_FIREBASE_* (same Firebase project as the BFF)

# 3. Run everything (web + bff)
pnpm dev

# Optional but recommended: durable memory + checkpoints in local D1
pnpm --filter @repo/memory-worker dev

# Optional: cross-tab / cross-device thread sync
pnpm --filter @repo/realtime-worker dev
```

- Web app: http://localhost:3000
- BFF API: http://localhost:4000 (`/health`, `/copilotkit`, `/memory`)
- Memory worker (optional): http://localhost:8788 — set `MEMORY_WORKER_URL`
  in `apps/bff/.env`. Without it the agent still chats, but threads reset
  when the process restarts (in-memory checkpoints, no transcript history).
- Realtime worker (optional): http://localhost:8789 — set
  `REALTIME_WORKER_URL` + `REALTIME_PUBLISH_SECRET` in `apps/bff/.env` and
  `VITE_REALTIME_WS_URL=ws://localhost:8789/ws` in `apps/web/.env`.

Note: `/copilotkit` and `/memory` require a signed-in Firebase user.
Set `ALLOWED_EMAIL_DOMAINS` to restrict access to your company's accounts.
Without Firebase env vars the endpoints return 503.

### How the frontend connects

`apps/web` signs the user in with the Firebase client SDK and mounts
CopilotKit pointed directly at the BFF:

```tsx
<CopilotKit
  runtimeUrl="https://your-bff-host/copilotkit"
  agent="workspaceAgent"
  headers={{ Authorization: `Bearer ${firebaseIdToken}` }}
>
  <CopilotChat agentId="workspaceAgent" />
</CopilotKit>
```

The BFF's `CORS_ORIGINS` must include the frontend origin (the default
`.env.example` allows `http://localhost:3000`). Firebase ID tokens expire
after about an hour — `apps/web` subscribes to `onIdTokenChanged` and rotates
the header via `copilotkit.setHeaders()`; see
[apps/web/README.md](apps/web/README.md).

### Useful scripts

```bash
pnpm dev            # run web + bff
pnpm dev:bff        # bff only
pnpm dev:web        # web only
pnpm dev:realtime   # realtime worker (Durable Objects) on :8789
pnpm typecheck      # type-check every package
pnpm lint           # lint every package
pnpm test           # run workspace regression tests
pnpm format         # format with Prettier
```

### Optional: realtime multi-tab sync

1. Copy `apps/realtime-worker/.dev.vars.sample` → `.dev.vars` and set
   `FIREBASE_PROJECT_ID` + `REALTIME_PUBLISH_SECRET`.
2. Set matching `REALTIME_WORKER_URL` + `REALTIME_PUBLISH_SECRET` in
   `apps/bff/.env`.
3. Set `VITE_REALTIME_WS_URL=ws://localhost:8789/ws` in `apps/web/.env`.
4. Run `pnpm dev:realtime` alongside `pnpm dev`.

The agent publishes events after durable memory writes; browsers connect with
the Firebase ID token and stay in sync across tabs/devices.

## Repository layout

```
apps/
  web/              Vite + React frontend (Firebase sign-in + full-window CopilotChat)
  bff/              Hono BFF: CopilotKit runtime + REST (/memory, /health)
  agent/            in-process LangGraph agents + D1CheckpointSaver (library)
  memory-worker/    Cloudflare Worker: D1 transcript ledger + engine checkpoints
  realtime-worker/  Cloudflare Worker + Durable Objects (WebSocket sync)
packages/
  config/  shared tsconfig / eslint
  types/   shared TypeScript types
  shared/  framework-agnostic constants
  prompts/ reusable system-prompt builders
```

## Dependency notes

`pnpm-workspace.yaml` pins the LangChain stack via `overrides`: a single
`langchain`/`@langchain/core` instance (CopilotKit's `@ag-ui/langgraph`
otherwise pulls a second copy, breaking channel identity checks), and
`@langchain/langgraph` at 1.4.4 (later 1.4.x type definitions reject this
zod release's state fields). `middleware/durable-memory-state.ts` documents the
related runtime workaround — read both comments before upgrading any of
these packages, and re-verify graph construction (`pnpm dev`) after.

## Extending the boilerplate

- **Add a tool over your REST API**: create
  `apps/agent/src/tools/<name>.tool.ts` that wraps
  `apiRequest()` from `services/api-client.ts`, and register it in
  `apps/agent/src/tools/index.ts`. Take the acting identity from the trusted
  agent context (see `middleware/durable-memory.ts` → `wrapToolCall`), never
  from model-provided arguments.
- **Add an agent**: create `apps/agent/src/agents/<name>/graph.ts` plus an
  AG-UI bridge (see `workspace-agent/agui-bridge.ts`), register it in
  `apps/agent/src/graphs/registry.ts` and `config/intelligence.ts`, then
  point the frontend `CopilotChat agentId=...` at it.

See [apps/bff/README.md](apps/bff/README.md),
[apps/agent/README.md](apps/agent/README.md), and
[docs/trusted-agent-context.md](docs/trusted-agent-context.md) for details.
