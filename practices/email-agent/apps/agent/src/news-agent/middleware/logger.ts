// Libs for third party
import { createMiddleware } from "langchain";

/** Logs message count before and after each model call. */
export const loggingMiddleware = createMiddleware({
  name: "NewsLogger",
  beforeModel: async (state) => {
    const count = state.messages?.length ?? 0;
    console.log(`[news-agent] beforeModel — ${count} message(s)`);
  },
  afterModel: async (state) => {
    const last = state.messages?.at(-1);
    const preview =
      typeof last?.content === "string"
        ? last.content.slice(0, 120)
        : JSON.stringify(last?.content ?? "").slice(0, 120);
    console.log(`[news-agent] afterModel — last message preview: ${preview}`);
  },
});
