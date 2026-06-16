import { HumanMessage } from "@langchain/core/messages";
import { graph } from "../src/agent.js";

/** Invokes the compiled graph exported from src/agent.ts. */
async function run(question: string) {
  console.log(`\nUser: ${question}`);

  const result = await graph.invoke({
    messages: [new HumanMessage(question)],
  });

  const finalMessage = result.messages.at(-1);
  console.log(`Assistant: ${finalMessage?.text}`);
}

async function main() {
  await run("What is 12 multiplied by 8 and then divided by 4?");
  await run("Add 7 and 5, then multiply the result by 3.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
