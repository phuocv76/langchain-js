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
    temperature: 0.2,
    streaming: true,
  });

  return cachedModel;
};
