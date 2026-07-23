// Libs for third party
import { ChatOpenAI } from '@langchain/openai';

// Internal
import { env } from '../config/env.js';

const cachedModels = new Map<string, ChatOpenAI>();

/**
 * Returns a memoized ChatOpenAI instance configured from the environment.
 *
 * @param promptCacheKey Provider prompt-cache key. The system prompt and tool
 *   definitions are stable across conversations, so each agent should pass a
 *   key of its own (e.g. "workspace-agent-v1") to let the provider reuse
 *   that prefix when prompt caching applies.
 * @throws When `OPENAI_API_KEY` is not set.
 */
export const getChatModel = (promptCacheKey = 'agent-v1'): ChatOpenAI => {
  const cached = cachedModels.get(promptCacheKey);
  if (cached) {
    return cached;
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required to run the agent. Set it in the server's .env.",
    );
  }

  const model = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    streaming: true,
    // GPT-5.4 mini supports function tools with reasoning through the
    // Responses API, not Chat Completions.
    useResponsesApi: true,
    // GPT-5 models can spend significant time reasoning before streaming. This
    // is deliberately configurable for tasks where deeper reasoning matters.
    reasoning: { effort: env.OPENAI_REASONING_EFFORT },
    maxTokens: env.OPENAI_MAX_OUTPUT_TOKENS,
    promptCacheKey,
    // Fail promptly on a transient provider issue rather than stacking retries
    // behind an already slow chat request. Adjust these through the environment
    // if the deployment needs a different reliability/latency trade-off.
    timeout: env.OPENAI_REQUEST_TIMEOUT_MS,
    maxRetries: env.OPENAI_MAX_RETRIES,
  });
  cachedModels.set(promptCacheKey, model);

  return model;
};
