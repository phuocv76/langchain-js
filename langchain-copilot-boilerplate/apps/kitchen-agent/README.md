# @repo/kitchen-agent

Skeleton product agent server — the reference for adding a new product to
this monorepo. Everything generic (identity, embedded LangGraph platform
app, D1 persistence, durable memory, CopilotKit runtime, HTTP composition)
comes from `@repo/agent-runtime`; this app owns only:

```
src/
  server.ts                    ~10 lines: startAgentServer + product wiring
  graphs/registry.ts           agent registry (the single wiring point)
  agents/kitchen-agent/        graph.ts, prompt.ts
  config/env.ts                product env fragment over the runtime infra env
  tools/index.ts               product tools (empty in the skeleton)
```

Every product module imports `env` from `@agent/config/env.js` (the merged
infra + product environment), never from `@repo/agent-runtime` directly —
same seam as the space product.

The shipped graph is exposed as `kitchenAgent`. It is a conversational
reference agent with no product tools yet.

## Local development

From the repository root:

```bash
# Configure the kitchen agent
cp apps/kitchen-agent/.env.example apps/kitchen-agent/.env
# Set OPENAI_API_KEY and FIREBASE_PROJECT_ID.

# Initialize kitchen's local D1 on first run and after new migrations
pnpm --filter @repo/memory-worker db:apply:local:kitchen

# Start each process in a separate terminal
pnpm --filter @repo/memory-worker dev:kitchen    # http://localhost:8790
pnpm --filter @repo/kitchen-agent dev            # http://localhost:4100
```

Kitchen uses its **own memory-worker deployment** (own D1 database), so its
threads and checkpoints never mix with the space product. For production,
create a `kitchen-agent-memory` D1 database, fill its `database_id` in
`workers/memory-worker/wrangler.jsonc`, then apply migrations and deploy:

```bash
pnpm --filter @repo/memory-worker db:apply:remote:kitchen
pnpm --filter @repo/memory-worker deploy:kitchen
```

Run `pnpm dev:kitchen` to start only the agent server through Turborepo. It
does not start the kitchen memory or realtime worker.

## Endpoints

| Method                  | Path                                         | Auth                       | Description                                       |
| ----------------------- | -------------------------------------------- | -------------------------- | ------------------------------------------------- |
| `POST` / runtime routes | `/copilotkit`, `/copilotkit/*`               | Firebase ID token (Bearer) | CopilotKit v2 runtime for `kitchenAgent`.         |
| Platform routes         | `/langgraph`, `/langgraph/*`                 | Firebase ID token (Bearer) | Embedded LangGraph threads, runs, and assistants. |
| `GET`                   | `/memory/threads`                            | Firebase ID token (Bearer) | List the signed-in user's transcript threads.     |
| `GET`                   | `/memory/threads/:threadId/history-messages` | Firebase ID token (Bearer) | Read one thread's durable chat history.           |
| `PATCH`                 | `/memory/threads/:threadId`                  | Firebase ID token (Bearer) | Rename a thread.                                  |
| `DELETE`                | `/memory/threads/:threadId`                  | Firebase ID token (Bearer) | Delete a thread and all of its durable state.     |
| `GET`                   | `/health`                                    | none                       | Liveness probe.                                   |

## Environment

This app reads `apps/kitchen-agent/.env`; start with `.env.example`.

| Variable                                                                                                                 | Required                 | Purpose                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`                                                                                                         | yes                      | Constructs the kitchen agent graph.                                                       |
| `FIREBASE_PROJECT_ID`                                                                                                    | yes for protected routes | Firebase project whose ID tokens are accepted.                                            |
| `AGENT_PORT`                                                                                                             | no                       | BFF port; the example sets `4100`.                                                        |
| `CORS_ORIGINS`                                                                                                           | no                       | Comma-separated frontend origins; the example sets `http://localhost:3100`.               |
| `MEMORY_WORKER_URL`                                                                                                      | no                       | Enables D1 transcript, checkpoint, and thread persistence; the example points to `:8790`. |
| `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`                                                                         | deployed worker only     | Cloudflare Access service-token pair; configure both together.                            |
| `REALTIME_WORKER_URL`, `REALTIME_PUBLISH_SECRET`                                                                         | no                       | Enables cross-session events; configure both together.                                    |
| `ALLOWED_EMAIL_DOMAINS`                                                                                                  | no                       | Comma-separated allowlist for verified user email domains.                                |
| `NODE_ENV`                                                                                                               | no                       | Runtime mode; defaults to `development`.                                                  |
| `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`, `OPENAI_MAX_OUTPUT_TOKENS`, `OPENAI_REQUEST_TIMEOUT_MS`, `OPENAI_MAX_RETRIES` | no                       | Model and request tuning; defaults match the space example.                               |
| `COPILOTKIT_LICENSE_TOKEN`, `COPILOTKIT_TELEMETRY_DISABLED`                                                              | no                       | Optional CopilotKit licensing and telemetry controls.                                     |
| `LANGSMITH_API_KEY`, `LANGSMITH_TRACING`, `LANGSMITH_PROJECT`                                                            | no                       | Optional LangSmith tracing configuration.                                                 |

See `apps/space-agent/.env.example` for the model-tuning defaults and example
values. Without `MEMORY_WORKER_URL`, transcript operations no-op and engine
state resets when the process restarts.

For local realtime sync, copy
`workers/realtime-worker/.dev.vars.sample` to
`workers/realtime-worker/.dev.vars.kitchen`, change its CORS origin to
`http://localhost:3100`, and set:

```bash
# apps/kitchen-agent/.env
REALTIME_WORKER_URL=http://localhost:8791
REALTIME_PUBLISH_SECRET=<same value as .dev.vars.kitchen>

# Start the kitchen realtime deployment
pnpm --filter @repo/realtime-worker dev:kitchen
```

The frontend uses `VITE_REALTIME_WS_URL=ws://localhost:8791/ws`.

## Validation

```bash
pnpm --filter @repo/kitchen-agent lint
pnpm --filter @repo/kitchen-agent typecheck
pnpm --filter @repo/kitchen-agent build
pnpm --filter @repo/kitchen-agent start # run the built server with .env
```

There is no app-level `test` script yet; add one when the first kitchen test
lands.

## Making it a real product

1. Point a copy of the frontend (`langchain-copilot-web` repo) at this
   server: `VITE_COPILOT_RUNTIME_URL=http://localhost:4100/copilotkit`,
   `agentId: 'kitchenAgent'` in its vendored contracts.
2. Add tools over the kitchen API: follow
   `apps/space-agent/src/{tools,middleware,services}` — schema-only tool
   definitions, execution in a middleware `wrapToolCall` using the verified
   acting identity, and the API base URL declared in
   `src/config/env.ts` (`productEnvSchema`).
3. Register extra agents by adding entries to `src/graphs/registry.ts`.
4. When the first test lands, copy the space wiring: the `test` script in
   `apps/space-agent/package.json` and its `turbo.json` (test `inputs`
   including `.env`) so the env file participates in the test cache hash.
