// Libs for third party
import { ChatOpenAI } from "@langchain/openai";

// Internal
import { ERRORS } from "../constants/messages";

/** Shared chat model configured from environment variables. */
let cachedModel: ChatOpenAI | undefined;

/**
 * Returns a singleton ChatOpenAI instance.
 *
 * @throws When `OPENAI_API_KEY` is missing.
 */
export const getChatModel = (): ChatOpenAI => {
  if (cachedModel) {
    return cachedModel;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(ERRORS.OPENAI_API_KEY);
  }

  cachedModel = new ChatOpenAI({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.2,
  });

  return cachedModel;
};
