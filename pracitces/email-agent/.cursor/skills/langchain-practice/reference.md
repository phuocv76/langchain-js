# LangChain.js / LangGraph.js Pattern Reference

Canonical TypeScript snippets for this repo. All assume `getChatModel()` from `../lib/model.js`.

## Structured output (Zod)

```ts
import { z } from "zod";
import { getChatModel } from "../lib/model.js";

const schema = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  summary: z.string(),
});

const model = getChatModel().withStructuredOutput(schema);
const result = await model.invoke("I love this product!");
console.log(result); // { sentiment: "positive", summary: "..." }
```

## Tool calling

```ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getChatModel } from "../lib/model.js";

const getWeather = tool(
  async ({ city }) => `It is sunny in ${city}.`,
  {
    name: "get_weather",
    description: "Get the weather for a city.",
    schema: z.object({ city: z.string() }),
  },
);

const model = getChatModel().bindTools([getWeather]);
const res = await model.invoke("What's the weather in Hanoi?");
console.log(res.tool_calls);
```

## Prebuilt ReAct agent (LangGraph)

```ts
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { getChatModel } from "../lib/model.js";

const agent = createReactAgent({ llm: getChatModel(), tools: [getWeather] });
const out = await agent.invoke({
  messages: [{ role: "user", content: "Weather in Tokyo?" }],
});
console.log(out.messages.at(-1)?.content);
```

## Conditional edges (branching graph)

```ts
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";

const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const last = state.messages.at(-1);
  return (last as any)?.tool_calls?.length ? "tools" : "__end__";
};

const graph = new StateGraph(MessagesAnnotation)
  .addNode("model", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "model")
  .addConditionalEdges("model", shouldContinue, ["tools", "__end__"])
  .addEdge("tools", "model")
  .compile();
```

## Custom state with Annotation

```ts
import { Annotation } from "@langchain/langgraph";

const State = Annotation.Root({
  topic: Annotation<string>,
  drafts: Annotation<string[]>({
    reducer: (curr, next) => curr.concat(next),
    default: () => [],
  }),
});
```

## Memory / checkpointing (multi-turn)

```ts
import { MemorySaver } from "@langchain/langgraph";

const graph = builder.compile({ checkpointer: new MemorySaver() });
const config = { configurable: { thread_id: "user-1" } };

await graph.invoke({ messages: [/* ... */] }, config);
await graph.invoke({ messages: [/* follow-up */] }, config); // remembers prior turn
```

## Streaming tokens

```ts
const stream = await chain.stream({ input: "Tell me a joke." });
for await (const chunk of stream) {
  process.stdout.write(typeof chunk === "string" ? chunk : String(chunk.content ?? ""));
}
```

## Interrupts (human-in-the-loop)

Requires a checkpointer and a `thread_id`. `interrupt()` pauses the run; resume
with `new Command({ resume })` on the SAME thread.

```ts
import { interrupt, Command, MemorySaver } from "@langchain/langgraph";

// inside a node:
const decision = interrupt({ draft: state.draft }); // pauses here
return { decision };

// driver:
const graph = builder.compile({ checkpointer: new MemorySaver() });
const config = { configurable: { thread_id: "t1" } };

let result = await graph.invoke(input, config);
if (result.__interrupt__?.length) {
  const payload = result.__interrupt__[0].value;
  result = await graph.invoke(new Command({ resume: { action: "approve" } }), config);
}
```

Use `graph.invoke`/`graph.stream` for interrupts, NOT `streamEvents` (it does not
commit checkpoints for resume).

## CopilotKit + LangGraph dev server

Backend graph is served by `langgraphjs dev` (port 2024) via `langgraph.json`.
Merge CopilotKit channels into the graph state:

```ts
import { CopilotKitStateAnnotation } from "@copilotkit/sdk-js/langgraph";
export const State = Annotation.Root({ ...CopilotKitStateAnnotation.spec, /* domain fields */ });
```

Next.js bridge route (`web/app/api/copilotkit/route.ts`):

```ts
import { CopilotRuntime, ExperimentalEmptyAdapter, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";

const runtime = new CopilotRuntime({
  agents: { emailAgent: new LangGraphAgent({ deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL!, graphId: "emailAgent" }) },
});
export const POST = (req) =>
  copilotRuntimeNextJSAppRouterEndpoint({ runtime, serviceAdapter: new ExperimentalEmptyAdapter(), endpoint: "/api/copilotkit" }).handleRequest(req);
```

Frontend: wrap in `<CopilotKit runtimeUrl="/api/copilotkit" agent="emailAgent">`,
read live state with `useCoAgent`, and render graph interrupts with
`useLangGraphInterrupt({ render: ({ event, resolve }) => ... })`. `resolve()` takes
a string, so send `JSON.stringify(decision)` and parse it in the node.
