// Libs for third party
import { MemorySaver } from "@langchain/langgraph";
import { copilotkitMiddleware } from "@copilotkit/sdk-js/langgraph";
import { createAgent } from "langchain";
import { z } from "zod";

// Internal
import { getChatModel } from "../lib/model";
import { guardrailMiddleware } from "./middleware/guardrail";
import { loggingMiddleware } from "./middleware/logger";
import { tokenTrackerMiddleware } from "./middleware/token-tracker";
import { NewsSummarySchema } from "./schemas/news";
import { searchNewsTool } from "./tools/news-search";

const newsStateSchema = z.object({
  summarizedArticles: z.array(z.string()).default(() => []),
});

/** ReAct agent for AI news search, summarization, and structured output. */
const buildNewsAgent = () =>
  createAgent({
    model: getChatModel(),
    tools: [searchNewsTool],
    systemPrompt: `You are an AI news analyst.
When the user asks for news, call search_news with a focused query.
Avoid duplicating articles already listed in summarizedArticles.
After searching, produce a clear summary with insights for practitioners.
Always respond in English.`,
    responseFormat: NewsSummarySchema,
    stateSchema: newsStateSchema,
    middleware: [
      copilotkitMiddleware,
      loggingMiddleware,
      tokenTrackerMiddleware,
      ...guardrailMiddleware,
    ],
  });

const newsAgent = buildNewsAgent();

/** Compiled graph for the LangGraph dev server (checkpointer provided by server). */
export const graph = newsAgent.graph;

/** Compiles with in-memory checkpointing for CLI demos. */
export const compileWithMemory = (): ReturnType<
  typeof buildNewsAgent
>["graph"] => {
  const agent = buildNewsAgent();
  agent.checkpointer = new MemorySaver();
  return agent.graph;
};
