import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { model } from "../src/models/index.js";
import { tools, toolsByName } from "../src/tools/index.js";

const modelWithTools = model.bindTools(tools);

/**
 * Minimal tool-calling loop, written out by hand to show what a prebuilt agent
 * (or the StateGraph in src/agent.ts) does under the hood: invoke the model,
 * run any tool calls it requests, feed the results back, and repeat until it
 * returns a plain text answer.
 */
async function run(question: string) {
  console.log(`\nUser: ${question}`);

  const messages: BaseMessage[] = [new HumanMessage(question)];

  // Bound the loop so a misbehaving model can never spin forever.
  for (let step = 0; step < 10; step++) {
    const aiMessage = await modelWithTools.invoke(messages);
    messages.push(aiMessage);

    const toolCalls = aiMessage.tool_calls ?? [];
    if (toolCalls.length === 0) {
      console.log(`Assistant: ${aiMessage.text}`);
      return;
    }

    for (const toolCall of toolCalls) {
      const selectedTool = toolsByName[toolCall.name as keyof typeof toolsByName];
      const result = await selectedTool.invoke(toolCall);
      console.log(
        `  -> ${toolCall.name}(${JSON.stringify(toolCall.args)}) = ${result.content}`
      );
      messages.push(result);
    }
  }

  console.log("Assistant: (stopped: too many tool-calling steps)");
}

async function main() {
  await run("What is 12 multiplied by 8 and then divided by 4?");
  await run("Add 7 and 5, then multiply the result by 3.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
