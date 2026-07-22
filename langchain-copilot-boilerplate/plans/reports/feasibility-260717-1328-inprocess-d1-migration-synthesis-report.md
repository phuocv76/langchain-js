# Feasibility synthesis: in-process LangGraph + D1 checkpoint saver

Verdict: **FEASIBLE**. Both unknowns resolved positive. Est. total effort ~1–1.5 weeks incl. E2E.

Source reports (detail + citations):

- `feasibility-260717-1210-copilotkit-inprocess-bridge-report.md`
- `feasibility-260717-1210-d1-checkpoint-saver-report.md`

## Question

Drop the self-hosted LangGraph server (:2024) + its bundled Postgres; run the graph in-process inside the agent (:4000, Hono) and move ALL persistence (short-term checkpoint, long-term memory, transcript) into Cloudflare D1 via the existing memory-worker.

## Finding 1 — CopilotKit v2 in-process bridge: feasible, no shipped bridge

- `CopilotRuntime({ agents })` (runtime@1.62.3 v2) accepts any AG-UI `AbstractAgent`; default `InMemoryAgentRunner` executes in the Node process. `LangGraphAgent` is not special-cased.
- No existing in-process LangGraph→AG-UI bridge: `@ag-ui/langgraph@0.0.42` is hard-wired to the LangGraph Platform REST client (`deploymentUrl`/`graphId`).
- Recommended path: `BuiltInAgent({ type: "custom", factory: (ctx) => AsyncIterable<BaseEvent> })` from `@copilotkit/runtime/v2` — runtime auto-wraps RUN_STARTED/RUN_FINISHED/RUN_ERROR and translates `ctx.interrupt()` to `RUN_FINISHED outcome:{type:"interrupt"}`. Only the LangGraph-stream→AG-UI event translation must be written (`handleSingleEvent` in @ag-ui/langgraph = reference impl; `chat.service.ts` already streams the graph in-process).
- Minimum event set for rendering: TEXT_MESSAGE_* + TOOL_CALL_* (+ TOOL_CALL_RESULT). MESSAGES_SNAPSHOT optional.

## Finding 2 — HITL: no rewrite, transport-agnostic

- react-core v2 hook is `useInterrupt`; supports the AG-UI standard flow `RUN_FINISHED outcome:{type:"interrupt", interrupts:[...]}` + resume via `RunAgentInput.resume` (also the legacy `on_interrupt` CUSTOM event). Custom in-process agent should emit the standard flow.
- LangGraph 1.4.4 in-process: `compile({ checkpointer })`, `interrupt()` + `new Command({ resume })` against the checkpointer confirmed in typings/docstrings. Graph-side HITL code identical regardless of transport.

## Finding 3 — D1 checkpoint saver: near-verbatim port of checkpoint-sqlite

- Contract: `@langchain/langgraph-checkpoint@1.1.3` — implement `getTuple`, `list`, `put`, `putWrites`, `deleteThread`; serde = `JsonPlusSerializer` (`[type, Uint8Array]`, revives BaseMessage).
- Template: `checkpoint-sqlite@1.0.3` — 2 tables (`checkpoints` PK thread_id/ns/checkpoint_id; `writes` PK +task_id/idx, negative idx for interrupt/resume sentinels), BLOB values.
- D1 fit: both transactional spots (putWrites, deleteThread) map to `db.batch()` (atomic w/ rollback). Limits fine: 2 MB/row (checkpoint stays small w/ summarization), 100 params, 10 GB DB, 1000 q/invocation.
- Transport: serde stays in the Node agent; worker stores opaque base64 blobs. ~5 new worker endpoints following existing memory-worker auth/env patterns; HTTP client mirrors `memory-client.ts`.
- Round trips: ~10/turn (no tool), ~16/turn (one tool). Local ~4 ms/RT; prod est. 30–80 ms/RT to single-region D1 primary, but with `durability:"async"` blocking cost ≈ 100–200 ms/turn. Acceptable.

## Repo migration surface (small)

- Replace `LangGraphAgent` in `apps/agent/src/config/intelligence.ts` with custom in-process agent.
- `memory.controller.ts` deleteThread: checkpoint DELETE proxy → worker D1 `deleteThread`.
- Drop `LANGGRAPH_DEPLOYMENT_URL` (env.ts), `Dockerfile.langgraph`, `docker-compose.langgraph.yml`, `langgraph.json`, header-forwarding config. No more image rebuilds for middleware changes.
- Identity simplification: verified Firebase identity goes straight into `configurable` at invoke — `x-agent-*` header dance and header-based `resolveTrustedContext` path collapse.
- Possible FE simplification: the remote agent's end-of-run MESSAGES_SNAPSHOT (which replaces the transcript and forced the `thread-hydrator` onRunFinalized repair) is optional for a custom agent — not emitting it may remove the need for the snapshot-repair subscriber. Verify during implementation.

## Risks / must-verify during implementation

1. Byte-exact base64 round-trip for `"bytes"` serde values.
2. `putWrites` OR IGNORE/atomicity semantics — critical for HITL resume correctness.
3. `verifyEvents` ordering rules (paired TEXT_MESSAGE_*/TOOL_CALL_* ids) in the custom translation.
4. No TTL/cleanup for checkpoints — add cron prune (D1 10 GB cap).
5. `list` metadata filtering (`jsonb`-style) behavior on real D1.
6. A2UI tool injection for in-process graph not yet evaluated.
7. Prod latency is estimated, not measured; validate with a deployed worker before committing to prod rollout.

## Effort estimate

- D1 saver (migration, worker routes, saver class, client, tests): ~800–900 LOC, 2–4 days.
- In-process AG-UI bridge (translation layer, interrupt flow, runtime wiring, FE verify): ~2–4 days.
- Cleanup (docker stack removal, env, docs, E2E incl. summarization-compaction + hydration regression): ~1–2 days.

## Unresolved questions

- Emit MESSAGES_SNAPSHOT at run end for history parity, or drop it and simplify the FE hydrator? (Decide in plan.)
- Keep `POST /chat` REST path on the same D1 saver or leave MemorySaver?
- Checkpoint prune policy (TTL vs per-thread cap).
