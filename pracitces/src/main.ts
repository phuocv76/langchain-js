/**
 * Email Agent — single practice entry point (CLI).
 *
 * Reads Gmail, classifies, drafts a reply, pauses for human review via
 * LangGraph `interrupt()`, then sends. Uses MemorySaver + thread_id so the
 * checkpointer restores state on resume (see LangGraph interrupts docs).
 *
 * Set AUTO_APPROVE=true to skip the terminal review prompt.
 *
 * Run: pnpm cli
 */
// Internal
import "./lib/load-env.js";

// Libs for third party
import { Command, isInterrupted } from "@langchain/langgraph";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

// Internal
import { compileWithMemory } from "./email-agent/graph.js";

// Types
import type { ReviewDecision } from "./email-agent/types.js";

interface ReviewPayload {
  subject?: string;
  originalEmail?: string;
  draftResponse?: string;
  urgency?: string;
  intent?: string;
  action?: string;
}

/** Prints the persisted step trail from graph state. */
const printSteps = (steps: string[] | undefined): void => {
  for (const line of steps ?? []) {
    console.log(`- ${line}`);
  }
};

/** Prompts in the terminal for approve / edit / reject. */
const promptReviewDecision = async (
  payload: ReviewPayload,
): Promise<ReviewDecision> => {
  const rl = createInterface({ input, output });

  console.log("\n--- Human review (interrupt) ---");
  console.log(payload.action ?? "Review this draft reply.");
  console.log(`Subject: ${payload.subject ?? "(unknown)"}`);
  console.log(
    `Intent: ${payload.intent ?? "unknown"} / ${payload.urgency ?? "medium"}`,
  );
  console.log("\nOriginal email:\n", payload.originalEmail ?? "(empty)");
  console.log("\nDraft reply:\n", payload.draftResponse ?? "(empty)");
  console.log("\nOptions: [a]pprove  [e]dit  [r]eject");

  const answer = (await rl.question("Choice (a/e/r): ")).trim().toLowerCase();
  rl.close();

  if (answer.startsWith("r")) {
    return { action: "reject" };
  }

  if (answer.startsWith("e")) {
    const editRl = createInterface({ input, output });
    const feedback = await editRl.question(
      "What should change? (draft will be regenerated)\n",
    );
    editRl.close();
    return { action: "edit", feedback: feedback.trim() || "Please improve the draft." };
  }

  return { action: "approve" };
};

/** Runs the full email agent from the terminal. */
const main = async (): Promise<void> => {
  const autoApprove = process.env.AUTO_APPROVE === "true";
  const graph = compileWithMemory();
  const config = {
    configurable: {
      thread_id: `cli-${Date.now()}`,
      autoApprove,
    },
  };

  // Initial run: proceeds until humanReview calls interrupt().
  let result = await graph.invoke({}, config);

  while (isInterrupted(result)) {
    if (result.steps?.length) {
      console.log("\n--- Steps so far ---");
      printSteps(result.steps);
    }

    const payload = (result.__interrupt__[0]?.value ?? {}) as ReviewPayload;
    const resume: ReviewDecision = autoApprove
      ? { action: "approve" }
      : await promptReviewDecision(payload);

    // Resume the SAME thread; MemorySaver restores the paused checkpoint.
    result = await graph.invoke(new Command({ resume }), config);
  }

  console.log("\n--- Done ---");
  console.log("Status:", result.status);
  console.log("Subject:", result.subject);
  console.log("Classification:", result.classification);
  console.log("Reply sent:", result.responseText);

  console.log("\n--- Final steps ---");
  printSteps(result.steps);

  // Memory demo: full state is retrievable from the checkpointer by thread_id.
  const snapshot = await graph.getState(config);
  console.log(
    `\nThread "${config.configurable.thread_id}" remembers ${snapshot.values.steps?.length ?? 0} step(s).`,
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
