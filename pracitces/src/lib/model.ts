import { ChatOpenAI } from "@langchain/openai";
import { requireEnv } from "./env.js";

/**
 * Shared chat model factory so every exercise reads the key/model the same way.
 */
export function getChatModel(overrides: Partial<{ model: string; temperature: number }> = {}) {
  requireEnv("OPENAI_API_KEY");
  return new ChatOpenAI({
    model: overrides.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: overrides.temperature ?? 0,
  });
}
