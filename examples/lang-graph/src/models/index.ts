import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "Missing OPENAI_API_KEY. Copy .env.example to .env and set your key."
  );
}

export const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  temperature: 0,
});
