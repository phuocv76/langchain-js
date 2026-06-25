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
import "./lib/load-env";

// Libs for third party
import { Command, isInterrupted } from "@langchain/langgraph";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

// Internal
import { CLI, PLACEHOLDERS, REVIEW } from "./constants/messages";
import { compileWithMemory } from "./email-agent/graph";

// Types
import type { ReviewDecision } from "./email-agent/types";

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
    console.log(`${CLI.STEP_PREFIX}${line}`);
  }
};

/** Prompts in the terminal for approve / edit / reject. */
const promptReviewDecision = async (
  payload: ReviewPayload,
): Promise<ReviewDecision> => {
  const rl = createInterface({ input, output });

  console.log(CLI.HUMAN_REVIEW_HEADER);
  console.log(payload.action ?? REVIEW.DEFAULT_PROMPT);
  console.log(
    `${CLI.SUBJECT_LABEL} ${payload.subject ?? PLACEHOLDERS.UNKNOWN}`,
  );
  console.log(
    `${CLI.INTENT_LABEL} ${payload.intent ?? PLACEHOLDERS.UNKNOWN_INTENT} / ${payload.urgency ?? PLACEHOLDERS.MEDIUM_URGENCY}`,
  );
  console.log(
    CLI.ORIGINAL_EMAIL_HEADER,
    payload.originalEmail ?? PLACEHOLDERS.EMPTY,
  );
  console.log(
    CLI.DRAFT_REPLY_HEADER,
    payload.draftResponse ?? PLACEHOLDERS.EMPTY,
  );
  console.log(CLI.OPTIONS);

  const answer = (await rl.question(CLI.CHOICE_PROMPT)).trim().toLowerCase();
  rl.close();

  if (answer.startsWith("r")) {
    return { action: "reject" };
  }

  if (answer.startsWith("e")) {
    const editRl = createInterface({ input, output });
    const feedback = await editRl.question(CLI.EDIT_FEEDBACK_PROMPT);
    editRl.close();
    return {
      action: "edit",
      feedback: feedback.trim() || PLACEHOLDERS.DEFAULT_EDIT_FEEDBACK,
    };
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
      console.log(CLI.STEPS_SO_FAR_HEADER);
      printSteps(result.steps);
    }

    const payload = (result.__interrupt__[0]?.value ?? {}) as ReviewPayload;
    const resume: ReviewDecision = autoApprove
      ? { action: "approve" }
      : await promptReviewDecision(payload);

    // Resume the SAME thread; MemorySaver restores the paused checkpoint.
    result = await graph.invoke(new Command({ resume }), config);
  }

  console.log(CLI.DONE_HEADER);
  console.log(CLI.STATUS_LABEL, result.status);
  console.log(CLI.SUBJECT_OUTPUT_LABEL, result.subject);
  console.log(CLI.CLASSIFICATION_LABEL, result.classification);
  console.log(CLI.REPLY_SENT_LABEL, result.responseText);

  console.log(CLI.FINAL_STEPS_HEADER);
  printSteps(result.steps);

  // Memory demo: full state is retrievable from the checkpointer by thread_id.
  const snapshot = await graph.getState(config);
  console.log(
    CLI.formatThreadMemory(
      config.configurable.thread_id,
      snapshot.values.steps?.length ?? 0,
    ),
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
