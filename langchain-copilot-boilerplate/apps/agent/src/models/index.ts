// Libs for third party
import { ChatOpenAI } from '@langchain/openai';

// Internal
import { env } from '@agent/config/env.js';

let cachedModel: ChatOpenAI | undefined;

/**
 * Returns a singleton ChatOpenAI instance configured from the environment.
 *
 * @throws When `OPENAI_API_KEY` is not set.
 */
export const getChatModel = (): ChatOpenAI => {
  if (cachedModel) {
    return cachedModel;
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is required to run the agent. Set it in apps/agent/.env.',
    );
  }

  cachedModel = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    streaming: true,
    // Fail promptly on a transient provider issue rather than stacking retries
    // behind an already slow chat request. Adjust these through the environment
    // if the deployment needs a different reliability/latency trade-off.
    timeout: env.OPENAI_REQUEST_TIMEOUT_MS,
    maxRetries: env.OPENAI_MAX_RETRIES,
  });

  return cachedModel;
};
