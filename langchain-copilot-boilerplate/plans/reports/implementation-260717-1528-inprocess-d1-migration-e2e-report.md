# In-process + D1 migration — implementation & E2E report

Status: DONE. 7 commits on `feat/agent-runtime-durable-memory` (local, not pushed). Old Docker LangGraph stack fully removed; all persistence now in D1.

## Commits

- dc1af9d feat(memory-worker): checkpoint store in D1 (migration 0004, 5 endpoints, per-user scoping, prune keep-20 inline in put)
- f72474f feat(agent): `D1CheckpointSaver` over the memory worker (+5 unit tests vs HTTP stub)
- d9b8ddf feat(agent): in-process AG-UI bridge (`BuiltInAgent` custom factory), per-request agent w/ verified identity, memory.controller delete via worker
- 639ff2c refactor(agent): drop langgraph server stack (Dockerfile/compose/langgraph.json/env/scripts/deps) + dead `POST /chat` path; docs/README updated
- 98c36a5 fix(agent): end-of-run MESSAGES_SNAPSHOT from engine state (id alignment, see below)
- 0535f8c refactor(web): thread-hydrator = single change-driven repair (`onMessagesChanged`)
- 523a1b1 chore(agent): summarization 16/8 (was test config 4/1)

## Decisions changed vs plan (with evidence)

1. **MESSAGES_SNAPSHOT IS emitted** (plan said no). Streaming chunks carry a provisional id (`run-…`); the engine's final state id is `resp_…` and that is what D1 records. Without the snapshot, replay/live ids never match D1 ids → duplicate assistant bubbles on reopen (observed). Snapshot (filtered: no system msgs, no summary) renames ids to engine ids at run end; hydrator merges the compacted history back.
2. **Hydrator**: not fill-when-empty; a `known` map of every message seen (D1 history first, then live), re-adding whatever disappears, with rename detection (missing id whose role+content exists in current = renamed → forgotten). Loop-free by construction.
3. **MemorySaver fallback** when `MEMORY_WORKER_URL` unset (boilerplate DX) instead of hard requirement.
4. **Summarization restored to 16/8** — with 4/1 the model answered the summary/system context instead of the user ("Got it — I'll use this condensed context"), matching the code comment's intent (8 turns / keep 4 turns).

## E2E verified (browser, web :3000 + agent :4000 + wrangler :8788, no Docker)

- Streaming chat via in-process bridge; multi-turn recall (teal/42) from D1 checkpoints.
- Summarization compaction: FE transcript complete (12 msgs), engine state compact (6), zero summary bubbles, zero duplicates.
- Agent process restart: thread reopens fully from D1; engine still recalls facts (durable checkpoint) — the key capability Postgres-in-Docker didn't survive volume loss for.
- Engine never re-inflated from FE merged history (6 engine msgs vs 12 displayed).
- Prune: exactly 20 checkpoints/thread retained; max checkpoint blob ~194 KB « 2 MB D1 cap.
- Tool call: TOOL_CALL_CHUNK stream → renderer ("📄 Employee profile") → TOOL_CALL_RESULT (product API was down; tool degraded readably).
- Thread delete: memory_turns + checkpoints + checkpoint_writes all 0 after sidebar delete.
- Cross-user isolation: get-tuple under another userId returns null (worker smoke test).

## Quality gates

agent 34/34 tests; typecheck+lint+build green for agent, memory-worker, web.

## Unresolved / follow-ups

- 400 "Invalid JSON payload" POSTs to /copilotkit with empty bodies (FE unload beacons?) — harmless, pre-existing pattern, worth a look someday.
- Browser-automation `type`/click flakiness during E2E was environmental (extension), not app behavior.
- Production D1 latency still estimated (~100–200 ms/turn blocking) — measure against a deployed worker before prod rollout.
- A2UI "App Context" system message accumulates per run in engine state (copilotkitMiddleware behavior) — bounded by summarization; not addressed here.
- HITL: door open via AG-UI standard interrupt (`ctx.interrupt()`/`RUN_FINISHED outcome:interrupt`); not implemented.
