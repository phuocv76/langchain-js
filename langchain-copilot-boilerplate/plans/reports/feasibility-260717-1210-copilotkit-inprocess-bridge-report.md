# Feasibility: In-Process LangGraph Agent Behind CopilotKit v2 Runtime (No LangGraph Server)

Date: 2026-07-17
Pinned stack: `@copilotkit/runtime@1.62.3`, `@copilotkit/sdk-js@1.62.3`, `@ag-ui/client@0.0.57`, `@ag-ui/core@0.0.57`, `@ag-ui/langgraph@0.0.42`, `@langchain/langgraph@1.4.4`, `langchain@1.5.3`.
All claims below were verified against the installed package typings/bundles under the pnpm store (paths abbreviated as `<pnpm>/<pkg>/dist/...`).

## Verdict

**Feasible.** The v2 runtime accepts any AG-UI `AbstractAgent`, and `@copilotkit/runtime` itself ships in-process agents as first-class citizens (`BuiltInAgent`). The shipped `LangGraphAgent` is HTTP-only (requires `deploymentUrl`/langgraph-sdk `Client`), so a thin custom bridge is required — but the runtime's `BuiltInAgent({ type: "custom", factory })` handles the entire run lifecycle (RUN_STARTED/RUN_FINISHED/RUN_ERROR/interrupt outcome), leaving only the LangGraph-events → AG-UI-events translation to write. HITL interrupts are supported via the transport-agnostic AG-UI standard interrupt protocol; they are NOT tied to the LangGraph-server transport.

---

## Q1 — What does v2 `CopilotRuntime({ agents })` accept?

Any AG-UI `AbstractAgent` from `@ag-ui/client`. From `@copilotkit/runtime/dist/v2/runtime/core/runtime.d.mts`:

```ts
import { AbstractAgent } from "@ag-ui/client";
type AgentsFactory = (ctx: AgentFactoryContext) => MaybePromise<NonEmptyRecord<Record<string, AbstractAgent>>>;
type AgentsConfig = MaybePromise<NonEmptyRecord<Record<string, AbstractAgent>>> | AgentsFactory;
interface BaseCopilotRuntimeOptions ... { agents: AgentsConfig; ... }
```

`LangGraphAgent` is not special-cased anywhere in the runtime; it is just one `AbstractAgent` implementation. Server-side execution goes through `AgentRunner.run({ threadId, agent, input }): Observable<BaseEvent>` (`dist/v2/runtime/runner/agent-runner.d.mts`) — the default `InMemoryAgentRunner` calls the agent inside the Node process and the handler streams the events out as SSE. So an in-process agent needs zero extra transport.

## Q2 — Does the pinned stack ship an in-process LangGraph→AG-UI bridge?

**No ready-made LangGraph bridge; yes a generic in-process harness.**

- `@copilotkit/runtime/langgraph` (`dist/langgraph.d.mts`) exports `LangGraphAgent`, `LangGraphHttpAgent`, `CustomEventNames`, `PredictStateTool`. Its `LangGraphAgent` extends `@ag-ui/langgraph`'s and takes the same `LangGraphAgentConfig`.
- `@ag-ui/langgraph@0.0.42` (`dist/index.d.ts` lines 126–158): `LangGraphAgentConfig` **requires** `deploymentUrl: string; graphId: string`; optional `client?: Client` is the `@langchain/langgraph-sdk` **REST client** (still points at a LangGraph Platform/`langgraph dev` server). The implementation (`dist/index.mjs`) is hard-wired to `client.threads.get/create/getState/updateState`, `client.assistants.search/getGraph`, `client.runs.stream/cancel`. There is **no** code path that accepts a local `CompiledStateGraph`.
- `@copilotkit/sdk-js/langgraph` exports only in-graph helpers meant to run *inside* graph code on a LangGraph server: `copilotKitInterrupt`, `copilotkitEmitMessage/State/ToolCall`, `copilotkitCustomizeConfig`, `CopilotKitStateAnnotation`, `copilotkitMiddleware` (`dist/langgraph.d.mts`). `./langgraph-middlewares` just re-exports `@ag-ui/langgraph/middlewares`. Not a bridge.
- **The harness that closes the gap**: `@copilotkit/runtime/v2` exports `BuiltInAgent` (extends `AbstractAgent`, `dist/agent/index.d.mts:339`) with a factory mode:

```ts
interface BuiltInAgentCustomFactoryConfig {
  type: "custom";
  factory: (ctx: AgentFactoryContext) => AsyncIterable<BaseEvent> | Promise<AsyncIterable<BaseEvent>>;
}
interface AgentFactoryContext {
  input: RunAgentInput;
  abortController: AbortController; abortSignal: AbortSignal;
  interrupt: (interrupts: Interrupt[]) => Promise<ResumeEntry[]>;
}
```

  `runFactory` (verified in `dist/agent/index.mjs`) emits `RUN_STARTED` before the factory, `RUN_FINISHED` after it, `RUN_ERROR` on throw, and — if the factory calls `ctx.interrupt()` on a fresh run — catches the resulting `InterruptSignal` and emits `RUN_FINISHED` with `outcome: { type: "interrupt", interrupts }`. On a resume run, `ctx.interrupt()` returns the matching `ResumeEntry[]` from `input.resume` instead of throwing. Note: for `type: "custom"` the runtime does **not** auto-inject resume tool-messages (it does for `aisdk`/`tanstack`); the factory reads `ctx.input.resume` itself.
- `@langchain/langgraph-api@1.4.2` (the `langgraph dev` embedded server) is in the lockfile via `langgraph-cli`; it is a dev-oriented server, not a supported production in-process bridge — not recommended.

**Conclusion**: wrap the compiled graph either in `BuiltInAgent({ type: "custom", factory })` (least code, lifecycle handled) or in a hand-rolled `AbstractAgent` subclass (full control). Either way you write the LangGraph→AG-UI event translation yourself; `@ag-ui/langgraph`'s `handleSingleEvent` switch (in `dist/index.mjs`) is a complete reference implementation for translating `on_chat_model_stream` / `on_custom_event` / `on_tool_end` events.

## Q3 — Contract for a custom in-process agent

`AbstractAgent` (`@ag-ui/client/dist/index.d.ts:483`) has exactly one abstract member:

```ts
abstract run(input: RunAgentInput): Observable<BaseEvent>;
```

Optional overrides: `clone()` (the runtime clones per request), `abortRun()`, `getCapabilities()` (advertise `interrupts: true`, see `AgentCapabilities` in `@ag-ui/core`).

Event ordering is enforced by `verifyEvents` inside `runAgent` (rules extracted from `@ag-ui/client/dist/index.mjs`):

- First event must be `RUN_STARTED`; nothing after `RUN_FINISHED`/`RUN_ERROR`.
- `TEXT_MESSAGE_CONTENT`/`TEXT_MESSAGE_END` require an open `TEXT_MESSAGE_START` with the same `messageId`; no nested starts for the same id.
- `TOOL_CALL_ARGS`/`TOOL_CALL_END` require an open `TOOL_CALL_START` with the same `toolCallId`.
- `RUN_FINISHED` is rejected while any text message, tool call, or step is still open.
- Convenience: `TEXT_MESSAGE_CHUNK`/`TOOL_CALL_CHUNK` are auto-expanded into START/CONTENT(ARGS)/END by a transform stage, so a bridge may emit chunks instead of managing open/close itself.

What the v2 react client needs to render:

- **Streaming text**: `TEXT_MESSAGE_START` → `TEXT_MESSAGE_CONTENT`* → `TEXT_MESSAGE_END`. `defaultApplyEvents` builds `agent.messages` incrementally from these — no snapshot required.
- **Tool calls**: `TOOL_CALL_START/ARGS/END`, plus `TOOL_CALL_RESULT` for the tool message (needed for `useRenderTool`/`useFrontendTool` complete state).
- **Optional**: `STATE_SNAPSHOT`/`STATE_DELTA` (sets `agent.state`), `MESSAGES_SNAPSHOT` (replaces `agent.messages` wholesale — the remote `LangGraphAgent` emits a final `STATE_SNAPSHOT` + `MESSAGES_SNAPSHOT` from thread state at run end via `getStateAndMessagesSnapshots`; an in-process bridge should emit an equivalent final `MESSAGES_SNAPSHOT` built from the checkpointed state to preserve the web app's MESSAGES_SNAPSHOT semantics), `STEP_STARTED/FINISHED`, `CUSTOM`, `RAW`.
- **Terminal**: `RUN_FINISHED` (optionally with `result` and/or `outcome`) or `RUN_ERROR`.

If using `BuiltInAgent({type:"custom"})`, the factory yields only the inner events (TEXT_MESSAGE_*, TOOL_CALL_*, snapshots, CUSTOM); RUN_STARTED/RUN_FINISHED/RUN_ERROR are added by the wrapper — do not yield them yourself.

## Q4 — Interrupts / HITL

**How the remote `LangGraphAgent` surfaces `interrupt()` (verified in `@ag-ui/langgraph/dist/index.mjs`):**

- After the platform stream ends, it re-reads thread state; for every `tasks[].interrupts[]` entry it dispatches
  `{ type: CUSTOM, name: "on_interrupt" /* LangGraphEventTypes.OnInterrupt */, value: string | JSON.stringify(interrupt.value), rawEvent }`, then `RUN_FINISHED` (no `outcome`).
- A new run against a thread with pending interrupts short-circuits: `RUN_STARTED` → one `CUSTOM on_interrupt` per interrupt → `RUN_FINISHED`.
- Resume travels as `forwardedProps.command.resume` (JSON-parsed if string) into `client.runs.stream`. This is the **legacy** flow.

**What the v2 react client listens for** (`@copilotkit/react-core/dist/v2/headless.d.mts`, `src/v2/hooks/use-interrupt.d.ts` region): the v2 hook is **`useInterrupt`** (there is no `useLangGraphInterrupt` in v2; that is the v1 API). Its docs state it supports **both**:

1. **AG-UI standard interrupt flow** — `RUN_FINISHED` with `outcome: { type: "interrupt", interrupts: Interrupt[] }` (`Interrupt { id, reason, message?, toolCallId?, responseSchema?, expiresAt?, metadata? }`, `@ag-ui/core/dist/index.d.ts:2267`; `RunFinishedOutcomeSchema` at :9564). Resume: client submits `RunAgentInput.resume: ResumeEntry[] { interruptId, status: "resolved"|"cancelled", payload? }`. `AbstractAgent.pendingInterrupts` is populated from this outcome, and `onInitialize` refuses the next run until every pending interrupt is addressed by `resume` (verified in `@ag-ui/client/dist/index.mjs`).
2. **Legacy flow** — `CUSTOM` event named `"on_interrupt"`; `resolve(payload)` resumes immediately via `command.resume = payload` (i.e., forwardedProps).

**Can a custom in-process agent emit the same thing?** Yes — both flows are plain AG-UI events over the same SSE channel; **nothing is tied to the LangGraph-server transport**. Recommended: use the standard flow —

- Fresh run hits `interrupt(value)` inside the graph → the in-process run returns with `state.tasks[].interrupts` (via `graph.getState`) or the `__interrupt__` sentinel → emit/throw so `RUN_FINISHED` carries `outcome: { type: "interrupt", interrupts: [{ id, reason, message: JSON.stringify(value), ... }] }`. With `BuiltInAgent({type:"custom"})` just call `await ctx.interrupt([...])`.
- Resume run: read `input.resume` (standard) or `input.forwardedProps?.command?.resume` (legacy compat) and call `graph.stream(new Command({ resume: payload }), { configurable: { thread_id } })`.

## Q5 — LangGraph 1.4.4 in-process durable threads

All confirmed in `@langchain/langgraph@1.4.4` typings:

- `StateGraph.compile({ checkpointer?: BaseCheckpointSaver | boolean, ... })` — `dist/graph/state.d.ts:410` (also `dist/graph/graph.d.ts:132`). `langchain@1.5.3` `createAgent` accepts the same: `checkpointer?: BaseCheckpointSaver | boolean` — `langchain/dist/agents/types.d.ts:599`.
- `graph.invoke/stream(input, { configurable: { thread_id } })` with the compiled-in checkpointer is the supported durable-thread path; `graph.getState(config)` / `graph.updateState(config, values, asNode?)` exist on the compiled Pregel — `dist/pregel/index.d.ts:381, 434`.
- `interrupt<I, R>(value: I): R` — `dist/interrupt.d.ts:45` — throws `GraphInterrupt` when no resume value is available; the docstring's own example resumes **in-process** with `await graph.stream(new Command({ resume: "answer 1" }))` (`Command.resume` at `dist/constants.d.ts:302`). A checkpointer + `thread_id` are required for interrupt/resume to work.

## Recommended shape for this repo

Current wiring (`apps/agent/src/config/intelligence.ts`, `apps/agent/src/copilotkit.ts`) builds `new LangGraphAgent({ deploymentUrl, graphId })` per registry entry. To go in-process, replace each with either:

- **Option A (least code)**: `new BuiltInAgent({ type: "custom", factory: async function* (ctx) { ... } })` from `@copilotkit/runtime/v2` — run the compiled graph with `{ configurable: { thread_id: ctx.input.threadId } }`, translate `graph.streamEvents(..., { version: "v2" })` into AG-UI events, call `ctx.interrupt()` for HITL, and emit a final `MESSAGES_SNAPSHOT` from `graph.getState`.
- **Option B (full control)**: a small `AbstractAgent` subclass implementing `run()` per the contract in Q3, emitting `RUN_FINISHED outcome:interrupt` itself.

Both plug directly into the existing `CopilotRuntime({ agents })` + `createCopilotRuntimeHandler` Hono setup unchanged.

## Unresolved questions

1. `BuiltInAgent` custom-factory runs emit no automatic `MESSAGES_SNAPSHOT`; whether `apps/web`'s durable-transcript restore additionally depends on end-of-run `MESSAGES_SNAPSHOT` semantics from the agent (vs. D1 transcript only) should be verified against the web app before choosing Option A vs B.
2. Legacy `command.resume` passthrough (`forwardedProps`) for a custom agent was verified at the type level only, not runtime-tested; the standard `resume[]` flow is the safer target.
3. The A2UI middleware config currently passed (`injectA2UITool`) is honored by `@ag-ui/langgraph`'s platform agent; equivalent behavior for an in-process agent (binding `getA2UITools` from `@ag-ui/langgraph` into the local graph) was not evaluated.
4. `@langchain/langgraph-api` (embedded dev server) as a zero-translation alternative was noted but not evaluated in depth — it would keep `LangGraphAgent` unchanged but embeds a dev-oriented server.
