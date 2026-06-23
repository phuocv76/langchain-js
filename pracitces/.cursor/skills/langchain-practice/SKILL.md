---
name: langchain-practice
description: >-
  Scaffold, run, and review LangChain.js and LangGraph.js practice exercises in
  this TypeScript repo, including the email agent (Gmail + GitHub + doc search)
  with interrupts/memory and its CopilotKit web UI. Use when the user wants to
  add a practice exercise, build a chain or StateGraph, work on the email agent
  in src/email-agent/, run the langgraph dev server, or touch the CopilotKit app
  in web/.
disable-model-invocation: true
---

# LangChain + LangGraph Practice

This repo is a TypeScript playground for practicing LangChain.js and LangGraph.js with OpenAI.
Use this skill to create new exercises and run them consistently.

## Conventions

- Exercises live in `src/exercises/` named `NN-title.ts` (zero-padded number, kebab title).
- Every exercise is a standalone script with an async `main()` that ends with:

```ts
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- Get the model via the shared factory, never construct `ChatOpenAI` directly:

```ts
import { getChatModel } from "../lib/model.js";
const model = getChatModel(); // reads OPENAI_API_KEY + OPENAI_MODEL from .env
```

- Use `.js` extensions on relative imports (ESM + Bundler resolution).
- Default model is `gpt-4o-mini`; do not hardcode keys or models in exercises.

## Creating a new exercise

Prefer the scaffold script over writing files by hand:

```bash
npm run new -- chain "structured output"   # LangChain chain
npm run new -- graph "tool calling agent"   # LangGraph StateGraph
```

It picks the next number, writes `src/exercises/NN-title.ts`, and prints the run command.
After scaffolding, edit the generated file to implement the exercise's goal.

## Running an exercise

```bash
npm run exercise src/exercises/NN-title.ts
```

## Choosing chain vs graph

- **chain**: linear/composed flow — prompt → model → parser, RAG retrieval, structured output, simple tool use.
- **graph**: anything with state, branching, loops, multiple nodes, agents, human-in-the-loop, or cycles.

## Workflow checklist

```
- [ ] Confirm chain vs graph (see above)
- [ ] Scaffold with `npm run new -- <kind> "<title>"`
- [ ] Implement main() using getChatModel()
- [ ] Run with `npm run exercise <file>`
- [ ] If it fails on a missing key, tell the user to set OPENAI_API_KEY in .env
- [ ] `npm run typecheck` if adding non-trivial types
```

## Email Agent project

A complete "Read and Reply Email" workflow built in three phases. It reads Gmail,
classifies intent, searches a local doc index or files a GitHub issue, drafts a
reply, pauses for human review, then sends.

Layout:

- `src/email-agent/state.ts` graph state (domain fields + CopilotKit channels)
- `src/email-agent/graph.ts` exports `graph` (for the dev server) and `compileWithMemory()` (CLI)
- `src/email-agent/nodes/` one file per node: readEmail, classifyIntent, docSearch, bugTrack, draftReply, humanReview, sendReply
- `src/email-agent/integrations/` `gmail.ts`, `github.ts`, `doc-search.ts`
- `docs/` knowledge-base files indexed by doc search
- `langgraph.json` exposes the graph as `emailAgent`
- `web/` Next.js + CopilotKit UI

Run modes:

```bash
# Phase 1 - full workflow, human review auto-approved
npm run exercise src/exercises/03-email-workflow.ts

# Phase 2 - interrupt() at review + MemorySaver; resume with a decision
npm run exercise src/exercises/04-email-interrupts-memory.ts

# Phase 3 - langgraph dev server + CopilotKit web app (two processes)
npm run dev          # runs dev:agent (port 2024) + dev:web (port 3000)
npm run gmail:token  # one-time: mint GOOGLE_REFRESH_TOKEN
```

Required env (`.env`, see `.env.example`): `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GITHUB_TOKEN`, `GITHUB_REPO`.

Conventions specific to the email agent:

- Integration clients are lazy (constructed on first call) so loading the graph
  never requires credentials. Keep it that way.
- The same `humanReview` node serves all phases: it auto-approves when
  `configurable.autoApprove` is true, otherwise calls `interrupt()`.
- The CopilotKit UI resolves interrupts with a JSON string; the node parses
  string-or-object. Keep `ReviewDecision` JSON-serializable.
- The dev server uses the checkpointer it provides; `graph` is compiled WITHOUT
  a checkpointer. Only the CLI uses `compileWithMemory()`.

## Pattern reference

For canonical LangChain.js / LangGraph.js snippets (structured output, tool calling,
RAG, conditional edges, interrupts, memory/checkpointing, CopilotKit), see
[reference.md](reference.md).
