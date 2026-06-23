/**
 * Exercise 04 - Interrupts + Memory (human-in-the-loop email review)
 *
 * Same email graph as exercise 03, but human review PAUSES the run via
 * interrupt(). The graph state is persisted by a MemorySaver checkpointer keyed
 * on thread_id, so we can resume exactly where we left off with a decision.
 *
 * Flow:
 *   invoke -> graph runs until humanReview -> interrupt surfaces the draft
 *   -> you choose approve / edit / reject
 *   -> resume with new Command({ resume }) on the SAME thread_id
 *   -> edit loops back to draftReply (and interrupts again); approve sends.
 *
 * Run: npm run exercise src/exercises/04-email-interrupts-memory.ts
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Command } from "@langchain/langgraph";
import { compileWithMemory } from "../email-agent/graph.js";
import type { ReviewDecision } from "../email-agent/types.js";

const rl = createInterface({ input: stdin, output: stdout });

function printSteps(status: string[] | undefined) {
  for (const line of status ?? []) console.log(`- ${line}`);
}

async function askDecision(draft: string): Promise<ReviewDecision> {
  console.log("\n=== Draft awaiting review ===\n");
  console.log(draft);
  const choice = (await rl.question("\nApprove / Edit / Reject? [a/e/r] ")).trim().toLowerCase();

  if (choice.startsWith("e")) {
    const feedback = await rl.question("What should change? ");
    return { action: "edit", feedback };
  }
  if (choice.startsWith("r")) return { action: "reject" };
  return { action: "approve" };
}

async function main() {
  const graph = compileWithMemory();
  const config = { configurable: { thread_id: `hitl-${Date.now()}` } };

  // Initial run: proceeds until the humanReview interrupt.
  let result = await graph.invoke({}, config);

  while (true) {
    const interrupts = (result as { __interrupt__?: { value: { draft: string } }[] }).__interrupt__;
    if (!interrupts?.length) break;

    console.log("\n=== Steps so far ===");
    printSteps(result.status);

    const decision = await askDecision(interrupts[0].value.draft);
    // Resume the SAME thread; the checkpointer restores the paused state.
    result = await graph.invoke(new Command({ resume: decision }), config);
  }

  console.log("\n=== Final steps ===");
  printSteps(result.status);
  console.log(`\nSent: ${result.sent}`);

  // Memory demo: the full final state is retrievable from the checkpointer.
  const snapshot = await graph.getState(config);
  console.log(`\nThread "${config.configurable.thread_id}" remembers ${snapshot.values.status.length} step(s).`);

  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
