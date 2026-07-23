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

## Run

```bash
cp .env.example .env   # set OPENAI_API_KEY + FIREBASE_PROJECT_ID
pnpm --filter @repo/memory-worker dev:kitchen   # kitchen-only local D1 (:8790)
pnpm --filter @repo/kitchen-agent dev           # server on :4100
```

Kitchen uses its **own memory-worker deployment** (own D1 database), so its
threads and checkpoints never mix with the space product. For production,
deploy the memory worker with `wrangler deploy --env kitchen` after creating
a `kitchen-agent-memory` D1 database and filling its `database_id` in
`workers/memory-worker/wrangler.jsonc`.

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
