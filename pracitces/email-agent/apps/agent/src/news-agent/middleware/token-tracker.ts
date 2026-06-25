// Libs for third party
import { createMiddleware } from "langchain";

interface TokenUsageTotals {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Accumulates token usage across model calls in a single run. */
export const tokenTrackerMiddleware = createMiddleware({
  name: "TokenTracker",
  wrapModelCall: async (request, handler) => {
    const response = await handler(request);
    const usage = response.response_metadata?.usage as
      | {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        }
      | undefined;

    if (usage) {
      const prompt = usage.prompt_tokens ?? 0;
      const completion = usage.completion_tokens ?? 0;
      const total = usage.total_tokens ?? prompt + completion;
      console.log(
        `[news-agent] tokens — prompt: ${prompt}, completion: ${completion}, total: ${total}`,
      );
    }

    return response;
  },
});

/** Rough cost estimate for gpt-4o-mini (USD per 1M tokens). */
export const estimateMiniCost = (totals: TokenUsageTotals): number => {
  const inputRate = 0.15 / 1_000_000;
  const outputRate = 0.6 / 1_000_000;
  return totals.promptTokens * inputRate + totals.completionTokens * outputRate;
};
