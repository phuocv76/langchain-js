# Feasibility: Cloudflare D1 Checkpoint Saver for LangGraph JS 1.4.4

Date: 2026-07-17. Scope: replace the LangGraph server's bundled Postgres short-term memory with a custom `BaseCheckpointSaver` backed by D1, accessed over HTTP through `apps/memory-worker`.

Verdict: **feasible, moderate effort**. The SQLite saver maps 1:1 onto D1 (its only transactional needs are batchable), the serde stays entirely in the Node agent (the worker stores opaque blobs), and the existing worker auth/migration/client patterns cover everything new. The real costs are per-turn HTTP round trips (mitigated by LangGraph's default `durability: "async"`) and D1's single-region write primary.

## 1. The exact contract (@langchain/langgraph@1.4.4 → @langchain/langgraph-checkpoint@1.1.3)

Lockfile resolution (`pnpm-lock.yaml` line 1531/1565): `@langchain/langgraph@1.4.4` resolves `@langchain/langgraph-checkpoint@1.1.3` (peer range `~0.0.16 || ^0.1.0 || ^1.0.0`).

Abstract methods to implement (from `base.d.ts` of checkpoint 1.1.3):

```ts
abstract getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined>;
abstract list(config: RunnableConfig, options?: CheckpointListOptions): AsyncGenerator<CheckpointTuple>;
abstract put(config, checkpoint: Checkpoint, metadata: CheckpointMetadata,
             newVersions: ChannelVersions): Promise<RunnableConfig>;
abstract putWrites(config, writes: PendingWrite[], taskId: string): Promise<void>;
abstract deleteThread(threadId: string): Promise<void>;   // REQUIRED (abstract in 1.1.3)
```

Non-abstract members inherited for free: `get()` (delegates to `getTuple`), `getNextVersion()` (integer increment), `getDeltaChannelHistory()` (beta; default impl walks `getTuple` + `parentConfig` — only exercised by opt-in experimental `DeltaChannel`, which `createAgent` does not use by default, confirmed in `dist/graph/messages_reducer.js` "Experimental" docs), and `serde` (defaults to `JsonPlusSerializer` when the constructor arg is omitted).

Data types:
- `Checkpoint` = `{ v: 4, id: uuid6, ts: ISO string, channel_values: Record<string, unknown>, channel_versions, versions_seen }`. `checkpoint_id`s are uuid6 → lexicographically time-ordered (this is what makes `ORDER BY checkpoint_id DESC` and `checkpoint_id < ?` pagination correct).
- `CheckpointMetadata` = `{ source: "input"|"loop"|"update"|"fork", step: number, parents: Record<string,string>, counters_since_delta_snapshot? }`.
- `PendingWrite` = `[channel, value]`; `CheckpointPendingWrite` = `[taskId, channel, value]`.
- `SerializerProtocol`: `dumpsTyped(data) → Promise<[string, Uint8Array]>`; `loadsTyped(type, data: Uint8Array | string) → Promise<any>`.
- `JsonPlusSerializer` (`serde/jsonplus.js`): returns `["bytes", raw]` for `Uint8Array` inputs, otherwise `["json", utf8-encoded JSON]`. Encoding handles `undefined`, `Set/Map/RegExp/Error/Uint8Array` (as `lc:2 constructor` envelopes), `Send`, `DeltaSnapshot`; decoding revives LangChain serializables (`lc:1 constructor`, i.e. `BaseMessage` instances) via `@langchain/core/load`. `loadsTyped` accepts a plain string for `"json"` — the SQLite saver relies on this via `CAST(value AS TEXT)`.
- Special writes: `WRITES_IDX_MAP = { [ERROR]: -1, [SCHEDULED]: -2, [INTERRUPT]: -3, [RESUME]: -4 }` — negative `idx` values so error/interrupt/resume writes never collide with task writes (indices 0..n).

Pregel call cadence (`dist/pregel/loop.js`):
- `getTuple` once at loop init (lines 255–259; a second `getTuple` only when resuming at an explicit non-head `checkpoint_id`, line 290).
- `putWrites` once per completed task per super-step (line 379), skipped entirely under `durability: "exit"`.
- `put` once per checkpoint: one `source:"input"` checkpoint, then one `source:"loop"` checkpoint per super-step (lines 464, 675–707).
- `durability` option (`"async"` default | `"sync"` | `"exit"`): under `"async"` the saver promises are tracked and awaited at the end of the run, overlapping with model/tool latency.

## 2. Porting template: @langchain/langgraph-checkpoint-sqlite@1.0.3

(latest; peer `@langchain/langgraph-checkpoint ^1.0.0` — compatible with 1.1.3. Source: scratchpad `pkg-sqlite/package/`.)

Schema:

```sql
CREATE TABLE checkpoints (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  type TEXT,                -- serde type: 'json' | 'bytes'
  checkpoint BLOB,          -- serde.dumpsTyped(checkpoint)[1]
  metadata BLOB,            -- serde.dumpsTyped(metadata)[1]
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);
CREATE TABLE writes (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  idx INTEGER NOT NULL,     -- WRITES_IDX_MAP[channel] ?? write index
  channel TEXT NOT NULL,
  type TEXT,
  value BLOB,
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);
```

Behavior worth copying exactly:
- `getTuple`: single SELECT with two correlated subqueries producing `json_group_array(json_object(...))` — `pending_writes` (writes at this checkpoint) and `pending_sends` (parent checkpoint's writes on the `TASKS` channel, `ORDER BY idx`). Values come back via `CAST(pw.value AS TEXT)` and are deserialized with `loadsTyped(type, string)`. No `checkpoint_id` in config → `ORDER BY checkpoint_id DESC LIMIT 1` (latest for thread).
- `put`: `INSERT OR REPLACE` single row; checkpoint and metadata serialized via `dumpsTyped`, both must be the same type. The `newVersions` 4th arg is ignored by the SQLite saver (it stores full `channel_values` inline in the checkpoint blob).
- `putWrites`: `INSERT OR REPLACE` when every write channel is special (in `WRITES_IDX_MAP`), else `INSERT OR IGNORE`; all rows in **one transaction** (`db.transaction(...)`). The OR IGNORE gives idempotency on task retry; OR REPLACE lets resume/interrupt markers overwrite.
- `list`: WHERE on optional `thread_id`, `checkpoint_ns`, `before.configurable.checkpoint_id` (`checkpoint_id < ?`), and metadata filter via `jsonb(CAST(metadata AS TEXT))->? = ?` per key; `ORDER BY checkpoint_id DESC`, `LIMIT n`.
- `deleteThread`: two DELETEs (checkpoints, writes) in **one transaction**.
- `migratePendingSends`: only for legacy `checkpoint.v < 4` rows — a fresh D1 deployment never stores v<4, so this can be omitted (writes are always v4 here).

Transaction dependence is minimal: only `putWrites` (multi-row insert) and `deleteThread` (two statements). Both fit `db.batch()`.

## 3. D1 constraints mapping

From https://developers.cloudflare.com/d1/platform/limits/ (fetched 2026-07-17):
- DB size: 10 GB (paid) / 500 MB (free). Queries per Worker invocation: 1000 (paid) / 50 (free) — a checkpoint endpoint uses 1–2.
- Max string/BLOB/row size: **2,000,000 bytes (2 MB)** — the whole serialized checkpoint (all channel_values incl. message history) must fit one BLOB. The repo's `summarizationMiddleware` (trigger 4 messages, keep 1) bounds message growth, so this is comfortable; a turn with a huge tool result could still hit it.
- Max SQL statement length 100 KB (statement *text*; BLOBs go through bound parameters, so unaffected). Max bound parameters per query: **100** → the `writes` insert (8 params/row) must use one statement per row inside `batch()`, not a multi-VALUES statement.
- Max 30 s query duration; 100 columns/table; LIKE pattern ≤ 50 bytes (irrelevant — the metadata filter uses json functions, not LIKE).

From https://developers.cloudflare.com/d1/worker-api/d1-database/: **no interactive transactions** (no BEGIN/COMMIT); `batch()` is the atomicity primitive — "Batched statements are SQL transactions. If a statement in the sequence fails, then an error is returned for that specific statement, and it aborts or rolls back the entire sequence." That exactly covers `putWrites` and `deleteThread`.

BLOB support: D1 supports SQLite BLOBs; over the Workers binding, `ArrayBuffer`/typed-array values bind to BLOB columns and come back as `Array`/ArrayBuffer — but since our transport is JSON over HTTP anyway, storing base64 TEXT is equally valid (see §4; BLOB + `CAST(... AS TEXT)` only works for the SQLite saver because its values are utf8 JSON — safer here to keep the base64/TEXT representation end-to-end or store BLOB and base64-encode in the worker).

## 4. Integration sketch

Keep the serializer in the Node agent; the worker never parses checkpoint content — it stores `(type, payload)` opaquely. `JsonPlusSerializer` output is `Uint8Array`; over JSON transport encode base64 (+33% size; a `"bytes"`-typed value must round-trip byte-exact, so base64 both directions — do not use the `CAST AS TEXT` trick on arbitrary bytes).

New worker endpoints (mirroring existing `POST /v1/...` + identity-in-body style of `apps/memory-worker/src/index.ts`):

| Endpoint | Body | D1 |
|---|---|---|
| `POST /v1/checkpoints/get-tuple` | `{threadId, checkpointNs, checkpointId?}` | 1 SELECT (the SQLite saver's query verbatim — `json_group_array` subqueries work in D1) |
| `POST /v1/checkpoints/put` | `{threadId, checkpointNs, checkpointId, parentCheckpointId?, type, checkpointB64, metadataB64}` | 1 INSERT OR REPLACE |
| `POST /v1/checkpoints/put-writes` | `{threadId, checkpointNs, checkpointId, taskId, allSpecial, writes: [{idx, channel, type, valueB64}]}` | `db.batch()` of per-row INSERTs |
| `POST /v1/checkpoints/list` | `{threadId?, checkpointNs?, beforeCheckpointId?, limit?, filter?}` | 1 SELECT |
| `DELETE /v1/checkpoints/threads` | `{threadId}` | `db.batch([DELETE checkpoints, DELETE writes])` |

Agent side: new `D1CheckpointSaver extends BaseCheckpointSaver` reusing the fetch pattern of `apps/agent/src/services/memory-client.ts` (CF-Access-Client-Id/Secret headers, `MEMORY_WORKER_URL`). One difference vs. the memory client: checkpoint persistence must NOT silently swallow errors (it is correctness-critical, unlike the enhancement-layer durable memory).

Wiring point already exists: `apps/agent/src/agents/workspace-agent/graph.ts` `compileWithMemory()` sets `agent.checkpointer = new MemorySaver()` for the standalone `POST /chat` path — swap in the D1 saver there. If runs stay on the self-hosted LangGraph dev server, note the server injects its own checkpointer for `graph`; the D1 saver only takes effect on the in-process path (or a custom-server setup).

### Round trips per turn (reasoned from pregel loop, §1 cadence)

Nodes per super-step in this app's `createAgent` graph: `durableMemoryMiddleware.beforeAgent`, `summarizationMiddleware.beforeModel`, `model`, `tools`, `durableMemoryMiddleware.afterAgent` are nodes; `wrapModelCall`/`wrapToolCall` (workspace-tools, copilotkit, durable-memory) add no super-steps.

- No-tool turn ≈ 4 super-steps (beforeAgent → beforeModel → model → afterAgent): 1 getTuple + 5 put (1 input + 4 loop) + 4 putWrites ≈ **10 HTTP round trips**.
- One-tool turn ≈ 7 super-steps (…model → tools → beforeModel → model → afterAgent): 1 getTuple + 8 put + 7 putWrites ≈ **16 round trips**.

(CopilotKit middleware hooks may add 1–2 node steps; treat these numbers as ±2.)

## 5. Latency budget

Measured locally (worker started via `wrangler dev --env offline --port 8788 --persist-to <scratchpad>`; it was not already running):
- Worker route without D1 (404): ~1.4–5 ms per request after warmup.
- Worker route exercising the D1 binding (`POST /v1/turns/list`; returned 500 for missing table in the fresh persist dir but fully round-trips miniflare's SQLite): **~4 ms** steady-state (first hit 30 ms cold).

Production path: Node agent region → Cloudflare edge (~5–40 ms depending on proximity) → D1. All **writes always go to the primary**, which lives "in one location in the world" (https://developers.cloudflare.com/d1/best-practices/read-replication/); read replicas (6 regions, Sessions API, sequential consistency via bookmarks) help only `getTuple`/`list`, and the checkpoint workload is write-dominated (put/putWrites are ~90% of calls). Expect **30–80 ms per round trip** same-continent, 150–300 ms cross-continent to the primary.

Per-turn added latency at ~50 ms/RT: no-tool ≈ 10 RT ≈ 500 ms if serial — but with the default `durability: "async"`, put/putWrites overlap with model streaming; the *blocking* cost is ≈ getTuple (1 RT) + end-of-run flush (~2–3 RTs not yet drained) ≈ **100–200 ms per turn**, mostly invisible next to multi-second LLM calls. `durability: "sync"` would put the full serial cost on the critical path — avoid. Worker-side, consider a combined `put-with-writes` endpoint later only if measurements justify it (YAGNI now).

## 6. Existing patterns to reuse (confirmed)

- `apps/memory-worker/src/index.ts`: plain `fetch` router (not Hono), `requireAccess()` gate — Cloudflare Access assertion header, `REQUIRE_CF_ACCESS='false'` opt-out for local dev (note: auth is CF Access service tokens, not a shared-secret header as the task statement assumed); `json()` helper; identity validation in body.
- `apps/memory-worker/wrangler.jsonc`: `MEMORY_DB` D1 binding, `offline` env for `wrangler dev` (drops Vectorize/AI). New checkpoint tables need no new bindings.
- `apps/memory-worker/migrations/`: `0001_memory.sql`–`0003_message_id.sql`, plain sequential SQL files → add `0004_checkpoints.sql`.
- `apps/agent/src/services/memory-client.ts`: `requestMemoryService(path, method, body)` with `CF-Access-Client-Id/Secret` headers and `MEMORY_WORKER_URL` from env — direct template for the saver's HTTP layer.

## 7. Effort estimate

| Item | Path | ~LOC |
|---|---|---|
| Migration (2 tables + indexes) | `apps/memory-worker/migrations/0004_checkpoints.sql` | ~30 |
| Worker routes (5 endpoints + validation) | `apps/memory-worker/src/index.ts` (or a new `checkpoints.ts` module) | ~250 |
| `D1CheckpointSaver` | `apps/agent/src/services/d1-checkpoint-saver.ts` | ~300 |
| Wiring | `apps/agent/src/agents/workspace-agent/graph.ts` (+ env var reuse) | ~15 |
| Tests (saver against local wrangler dev; putWrites idempotency; interrupt/resume round trip) | `__test__` dirs | ~250 |

Total ≈ 800–900 LOC, roughly 2–4 focused days including validation against the official `validate` behaviors (getTuple latest-vs-by-id, list pagination, pending writes on resume).

Riskiest parts:
1. **Serde fidelity for `BaseMessage`**: mitigated by keeping `JsonPlusSerializer` in the agent and treating worker payloads as opaque base64. The one hard rule: `"bytes"`-typed values must survive byte-exact (base64, never text-cast).
2. **Pending-writes semantics for interrupts/HITL resume**: must replicate `INSERT OR IGNORE` vs `OR REPLACE` (all-special detection via `WRITES_IDX_MAP`) and negative idx keys, and `putWrites` must be atomic (`db.batch()`), or a resumed run can double-apply or lose a task's writes.
3. **TTL/cleanup**: neither the contract nor the SQLite saver has any; checkpoints grow one row per super-step per thread forever. uuid6 checkpoint_ids are time-ordered, so a Worker cron trigger can prune by id prefix or keep last-N per thread — should be scoped in from day one given D1's 10 GB cap.
4. **2 MB row cap** on the checkpoint blob (large tool outputs); cheap guard: reject-and-log oversized puts in the saver before sending.

## Unresolved questions

1. Does the deployment keep the self-hosted LangGraph server (which injects its own checkpointer for `graph`) or move fully to the in-process `POST /chat` path? The D1 saver is only authoritative on paths where the app controls `agent.checkpointer`.
2. Exact node count contributed by `createCopilotkitMiddleware` (affects round-trip counts by ±1–2 per turn; doesn't change feasibility).
3. D1's SQLite build and `jsonb(...)->` operator support for the metadata filter in `list` — if unavailable, fall back to `json_extract(CAST(metadata AS TEXT), '$.key')`; verify against a real D1 during implementation. (Note: metadata is base64 in the proposed design, so metadata filtering either needs metadata stored as plain JSON TEXT — it is always `"json"`-typed in practice — or filtering client-side; recommend storing metadata as TEXT JSON to keep the filter in SQL.)
4. Tenancy: existing worker tables scope by `user_id`; the checkpoint schema is thread-scoped only. Decide whether to add a `user_id` column + auth check so one user cannot address another's `thread_id`.
5. Production RTT was not measured (only local wrangler dev, ~4 ms); the 30–80 ms figure is an estimate to validate with a deployed worker.
