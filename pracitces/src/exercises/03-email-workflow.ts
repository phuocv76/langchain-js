/**
 * Exercise 03 - Read and Reply Email (full workflow)
 *
 * Runs the LangGraph email agent end-to-end against the latest unread Gmail
 * message: read -> classify -> (doc search | bug track) -> draft -> review -> send.
 * Human review is auto-approved here (Phase 1). See exercise 04 for interrupts.
 *
 * Requires Gmail + GitHub + OpenAI credentials in .env.
 * Run: npm run exercise src/exercises/03-email-workflow.ts
 */
import { compileWithMemory } from "../email-agent/graph.js";

async function main() {
  const graph = compileWithMemory();

  const config = {
    configurable: { thread_id: `cli-${Date.now()}`, autoApprove: true },
  };

  const result = await graph.invoke({}, config);

  console.log("\n=== Workflow steps ===");
  for (const line of result.status) console.log(`- ${line}`);

  console.log("\n=== Classification ===");
  console.log(result.classification);

  if (result.issueRef) {
    console.log("\n=== Filed issue ===");
    console.log(`#${result.issueRef.number} ${result.issueRef.url}`);
  }

  console.log("\n=== Draft reply ===");
  console.log(result.draft);

  console.log(`\nSent: ${result.sent}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
