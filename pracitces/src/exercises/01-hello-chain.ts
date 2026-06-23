/**
 * Exercise 01 — Hello Chain
 * Goal: build the smallest useful LangChain pipeline: prompt -> model -> parser.
 *
 * Run: npm run exercise src/exercises/01-hello-chain.ts
 */
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../lib/model.js";

async function main() {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a concise assistant. Answer in one sentence."],
    ["human", "Explain what {topic} is."],
  ]);

  const model = getChatModel();
  const parser = new StringOutputParser();

  const chain = prompt.pipe(model).pipe(parser);

  const answer = await chain.invoke({ topic: "LangGraph" });
  console.log(answer);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
