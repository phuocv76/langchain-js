# Embed Runtime Migration — bridge → createEmbedServer + D1

Status: done (2026-07-21); browser E2E with real Firebase sign-in passed
2026-07-22 (chat → workspace tools against the product API → reload →
thread restored from D1 → follow-up with prior context) ·
Branch: `feat/agent-runtime-d1`
Basis: PoC report `plans/reports/poc-260721-1137-langgraph-embed-server-d1-checkpoints-report.md` (3 steps passed)

Goal: remove the custom AG-UI bridge; serve the workspace graph through
`@langchain/langgraph-api/experimental/embed` behind the existing BFF, with
CopilotKit's stock `LangGraphAgent` adapter. Checkpoints stay in D1; thread
metadata moves to D1.

## Decisions

- Adapter reaches embed via loopback HTTP on the BFF itself (`/langgraph`),
  re-authenticated with the user's Firebase ID token through the existing
  `requireAgentUser` middleware — no new trust boundary, tenant comes from
  verified claims + AsyncLocalStorage.
- `@langchain/langgraph-api` pinned exactly (experimental, no semver);
  `src/regression/*` scripts serve as upgrade regression tests.
- Assistants shim stays ours (~30 LOC) until upstream adds those routes.

## Phases

1. **D1 thread store** — migration `0005_threads.sql` (`thread_store`
   table), worker endpoints `/v1/thread-store/{get,set,delete}`, agent
   `D1ThreadSaver` (+ in-memory fallback, 404 via HTTPException), tests.
2. **Production embed app + auth** — `services/langgraph-embed-app.ts`
   (assistants shim + embed + identity middleware), rewrite
   `config/intelligence.ts` to per-request `LangGraphAgent`, mount
   `/langgraph` in BFF behind `requireAgentUser`, dependency moves.
3. **Parity check** — long-conversation script: rolling summary must not
   surface in the client transcript; add FE filter only if it does.
4. **Cleanup + gates** — delete `agui-bridge.ts` (+ test) and stale
   `langgraph-entry.ts`, update docs/comments, run agent+worker+bff
   typecheck/lint/tests and PoC regression scripts.

## Acceptance — verified 2026-07-21

- Agent tests 37/37 pass (incl. 5 new thread-saver tests); typecheck + lint
  clean on agent, bff, worker, web.
- Worker thread-store endpoints smoke-tested on local D1 (put, json_patch
  merge, cross-user isolation, delete).
- PoC regression scripts pass post-migration (basic chain, HITL/tools).
- Summary parity: adapter delivers the rolling summary in raw state (1
  synthetic message at turn 9); web ThreadHydrator now filters it —
  `summary-parity-poc.ts` guards the prefix contract; compacted recall OK.
- BFF boot smoke: `/health` 200; `/copilotkit`, `/langgraph/*` 401 without a
  token.
- Bridge (`agui-bridge.ts` + test) and stale `langgraph-entry.ts` deleted;
  READMEs and comments updated.

## Post-migration fix — 2026-07-22

Browser E2E surfaced `RUN_ERROR: Trusted agent context is unavailable` on any
workspace-tool call: the LangGraphAgent adapter filters custom configurable
keys out of its run payload, and the embed server builds run config only from
the request body (it never copies headers, unlike the full server) — so the
graph ran with no verified identity, which also silently disabled durable
transcript writes. Fix: the embed app now rewrites every run-creation body
server-side (`withVerifiedRunClaims`), dropping client-supplied `x-agent-*`
keys (closes a tenant-spoofing vector via `config.configurable`) and
injecting claims from the verified headers. Gateway harness now serves the
production `createLangGraphEmbedApp` with claims via `headerFactory`;
`trusted-context-check.ts` guards the tool-context path. Re-verified:
37/37 tests, typecheck + lint clean, all regression checks pass.
