# PoC Report: LangGraph Embed Server + D1 Checkpoints (no AG-UI bridge)

Date: 2026-07-21 · Branch: `feat/agent-runtime-d1` · Status: **PoC PASSED (steps 1, 2 & 3)**

## Goal

Validate option B from the architecture consultation: replace the custom
AG-UI bridge (`agui-bridge.ts`) with LangGraph's experimental
`createEmbedServer` while keeping checkpoints in D1 via `D1CheckpointSaver`.

## Setup

- `@langchain/langgraph-api@1.4.3` exposes `./experimental/embed` (verified in
  installed package exports; source now lives in `langchain-ai/langgraphjs`
  monorepo, `libs/langgraph-api/src/experimental/`).
- New devDeps on `apps/agent`: `@langchain/langgraph-api@1.4.3`,
  `@hono/node-server`.
- PoC files (additive, production code untouched):
  - `apps/agent/src/poc/in-memory-thread-saver.ts` — RAM ThreadSaver (thread
    metadata only; checkpoints stay in D1)
  - `apps/agent/src/poc/embed-server-poc.ts` — `createEmbedServer({ graph:
    { workspaceAgent }, checkpointer: new D1CheckpointSaver(), threads })`
    on port 2100, wrapped in `runWithCheckpointUser` Hono middleware for
    tenant scoping (same ALS mechanism the bridge uses)
  - `apps/agent/src/poc/embed-client-poc.ts` — plain HTTP client speaking the
    LangGraph platform wire protocol (`POST /threads`, `POST
    /threads/:id/runs/stream` SSE, `GET /threads/:id/state`)
- Backend: memory worker via `wrangler dev --env offline` (local D1, port
  8788), real workspace graph with real OpenAI model.

## Results

All checks passed on first run:

| Check | Result | Evidence |
|---|---|---|
| Thread create (`POST /threads`) | PASS | uuid v7 returned |
| Streamed run (`runs/stream`, SSE `values` mode) | PASS | streamed answer "Teal is a great choice." |
| State read-back (`GET /threads/:id/state`) | PASS | 2 messages returned → embed server reads **through injected D1 checkpointer** (the exact thing the standard server breaks) |
| Cross-run memory on same thread | PASS | run 2 recalled "teal" from run 1 |
| D1 persistence | PASS | 18 rows in `checkpoints`, `user_id='poc-embed-user'`, matching thread id |

Full pipeline proven: HTTP client → embed server routes → workspace graph
(model + summarization + durable-memory middleware) → `D1CheckpointSaver` →
memory worker → local D1. Multi-tenant scoping worked via the ALS middleware
plus `x-agent-*` claims in run `config.configurable`.

## Step 2: CopilotKit runtime → LangGraphAgent adapter (2026-07-21 PM)

Chain: AG-UI `HttpAgent` client → CopilotKit runtime (`@copilotkit/runtime/v2`,
multi-route Hono handler, port 2200) → `@ag-ui/langgraph@0.0.42`
`LangGraphAgent` → assistants shim + embed server (port 2100) → workspace
graph → D1. Zero custom AG-UI translation code in the path.

New PoC files:

- `apps/agent/src/poc/copilotkit-embed-poc.ts` — gateway (assistants shim +
  embed app) and CopilotKit runtime with
  `LangGraphAgent({ deploymentUrl, graphId, assistantConfig })`
- `apps/agent/src/poc/copilotkit-client-poc.ts` — `HttpAgent` posting to
  `/copilotkit/agent/workspaceAgent/run`, like the React client
- `embed-server-poc.ts` refactored to export `buildEmbedApp()`
- New devDep: `@ag-ui/langgraph@0.0.42` (peers satisfied by existing
  `@ag-ui/client`/`core` 0.0.57)

### Findings

1. **Embed server lacks `/assistants/*` routes** (verified in
   `experimental/embed/protocol.mts` — only thread/run/protocol routes). The
   adapter requires `POST /assistants/search` (throws if empty), calls
   `GET /assistants/:id/graph` (node-name filtering) and
   `GET /assistants/:id/schemas` (tolerant fallback). A ~30-line static shim
   in front of the embed app satisfies all three; graph JSON served from the
   in-process compiled graph (`graph.getGraphAsync()`).
2. **`assistant.config` must be an object** in the search response: the
   adapter seeds its config merge with it and dereferences `.configurable`
   unconditionally (`mergeConfigs`, agent.ts ~1714). Missing field →
   `TypeError` → RUN_ERROR. Fixed by returning `config: {}`.
3. `ThreadSaver.get` throwing on missing thread surfaces as HTTP 500; the
   adapter tolerates it (treats as absent, creates the thread), but a proper
   404 would be cleaner in production.

### Results (all PASS, first run after shim fix)

| Check | Evidence |
|---|---|
| Assistant reply through full chain | "Teal is a lovely color." |
| Real AG-UI streaming events | RUN_STARTED, STATE_SNAPSHOT, TEXT_MESSAGE_START/CONTENT/END, MESSAGES_SNAPSHOT, RUN_FINISHED |
| Cross-run memory via D1 (same thread, 2 runs) | run 2 answered "teal" |
| D1 rows | 18 checkpoints, `user_id='poc-embed-user'`, thread `7600e534-…` |

## Step 3: HITL interrupts + frontend tools (2026-07-21 PM)

New PoC files: `approval-graph-poc.ts` (one-node graph pausing on
`interrupt()`, compiled WITHOUT a checkpointer — proves the embed server
injects D1CheckpointSaver into registered graphs), `hitl-tools-client-poc.ts`
(two scenarios via `HttpAgent`). `copilotkit-embed-poc.ts` extended: second
graph `pocApproval` registered in embed + runtime; assistants shim made
dynamic per requested `graph_id`.

Adapter mechanics confirmed from source: frontend tools flow into initial
state as `state.copilotkit.actions` (same contract `copilotkitMiddleware`
reads); interrupts surface as `CUSTOM:on_interrupt`; resume is read from
`forwardedProps.command.resume`. Note: `enableLegacyOnInterruptEvent` /
`emitInterruptOutcome` options exist on main but NOT in the published
`@ag-ui/langgraph@0.0.42` — legacy on_interrupt event is the default there.

### Results (all 5 PASS, first run)

| Check | Evidence |
|---|---|
| Frontend tool call emitted by model | `set_theme_color({"color":"teal"})` on last assistant message |
| Tool call streamed as AG-UI events | TOOL_CALL_START / TOOL_CALL_ARGS / TOOL_CALL_END |
| Tool result roundtrip (2nd run, same thread) | assistant acknowledged ("Done.") |
| Interrupt surfaced to client | `CUSTOM:on_interrupt` in event stream |
| Resume via `command.resume` completes node | reply "decision: approved-by-poc" |
| D1 persistence of interrupt state | approval thread: 3 rows `checkpoints`, 6 rows `checkpoint_writes` |

The last unknown from step 2 is resolved: HITL and frontend tools work
through the no-bridge chain with D1 holding the interrupted state between
runs.

## Gaps before production adoption

1. **ThreadSaver is in-memory.** Production needs a D1-backed ThreadSaver
   (new memory-worker endpoints + table, est. 150–300 LOC total); return
   404-shaped errors for missing threads.
2. **Assistants shim** (~30 LOC) must be kept alongside the embed app until
   upstream adds assistants routes.
3. **Auth middleware.** Replace fixed PoC user with Firebase verification
   (reuse `identityFromRequest` + `runWithCheckpointUser`), and pass claims
   via per-request `assistantConfig`/`forwardedProps.config` instead of a
   static constructor config.
4. **Experimental API.** `createEmbedServer` is marked `@experimental — does
   not follow semver`; pin the version and gate upgrades with these PoC
   scripts as regression tests.
5. ~~Frontend tool calls / interrupts (HITL) untested~~ — verified in step 3.

## Unresolved questions

- Where should thread metadata live: new D1 table vs reuse `thread_titles`?
- Per-user config injection point in CopilotKit runtime v2 for
  `LangGraphAgent` (agents-as-function returning per-request instances, as
  `intelligence.ts` does today, likely works — verify).

Status: DONE
Summary: Both PoC steps pass — CopilotKit runtime drives the embed server
through the stock LangGraphAgent adapter with D1 checkpoints and no custom
AG-UI bridge; remaining work is D1 ThreadSaver, Firebase auth wiring, HITL
validation, and accepting the experimental-API risk.
