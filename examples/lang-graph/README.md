# LangGraph Tools Example

A small, runnable LangChain.js / LangGraph example showing the core tool pattern:

1. Define tools with `tool()`.
2. Validate inputs with [`zod`](https://zod.dev).
3. Expose them to a model with `bindTools()` (or drive them with a graph).

The model decides which tools to call, the tools run locally, and the model uses
the results to produce a final answer.

## Project structure

Based on the
[recommended LangGraph application structure](https://langchain-ai.github.io/langgraphjs/concepts/application_structure/),
with each concern split into its own folder under `src/`. `langgraph.json`
points to the compiled graph so it can be served with the LangGraph CLI.

```
.
├── src
│   ├── tools
│   │   └── index.ts   # add / multiply / divide tools (tool() + zod)
│   ├── state
│   │   └── index.ts   # graph state definition (message list)
│   ├── models
│   │   └── index.ts   # shared ChatOpenAI instance
│   ├── nodes
│   │   └── index.ts   # node functions: callModel, toolNode, shouldContinue
│   └── agent.ts       # builds & exports the compiled StateGraph (`graph`)
├── scripts
│   ├── runAgent.ts    # invokes the graph from src/agent.ts
│   └── bindTools.ts   # manual model <-> tool loop using bindTools()
├── langgraph.json     # LangGraph deployment config (points to src/agent.ts:graph)
├── tsconfig.json
├── package.json
└── .env.example
```

## Setup

Requires Node.js `^20.16.0` or `>=22.13.0` (see `.nvmrc`). Older Node 22 patch
releases such as `22.2.0` ship an ESM loader bug that breaks `npm run dev`
schema extraction with `Cannot find package 'tsx:'`; use `nvm use` to switch to
a supported version.

```bash
cd examples/lang-graph
nvm use            # picks up .nvmrc (Node 22.13.1)
npm install
cp .env.example .env
# then edit .env and set OPENAI_API_KEY
```

## Run

Run the graph directly:

```bash
npm run agent
```

Manual `bindTools` loop (shows what the graph does under the hood):

```bash
npm run bind-tools
```

Serve the graph with LangGraph Studio (interactive UI + API):

```bash
npm run dev
```

Type-check only (no API key required):

```bash
npm run typecheck
```

## How it works

### 1. Tools (`src/tools/index.ts`)

Each tool pairs an async implementation with a name, description, and a `zod`
schema. The schema both validates the arguments and tells the model what each
parameter means:

```ts
export const multiply = tool(
  async ({ a, b }) => a * b,
  {
    name: "multiply",
    description: "Multiply two numbers.",
    schema: z.object({
      a: z.number().describe("The first number"),
      b: z.number().describe("The second number"),
    }),
  }
);
```

### 2. Graph (`src/agent.ts` + `src/nodes/index.ts`)

The tools are bound to the model and exposed through a small `StateGraph`:

```
START -> agent -> (tools -> agent)* -> END
```

The `agent` node calls the model; if the model requests a tool, the `tools` node
runs it and loops back so the model can use the result.

Given `"What is 12 multiplied by 8 and then divided by 4?"`, the model chains
calls:

```
multiply(a=12, b=8) -> 96
divide(a=96, b=4)   -> 24
```

and then replies:

```
The answer is 24.
```

### 3. Deployment config (`langgraph.json`)

`langgraph.json` registers the compiled graph so the LangGraph CLI / Studio can
serve it:

```json
{
  "dependencies": ["."],
  "graphs": { "agent": "./src/agent.ts:graph" },
  "env": "./.env"
}
```
