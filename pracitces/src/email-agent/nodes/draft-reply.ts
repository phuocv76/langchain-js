import { StringOutputParser } from "@langchain/core/output_parsers";
import type { EmailStateType } from "../state.js";
import { getChatModel } from "../../lib/model.js";
import { DRAFT_SYSTEM, draftHuman } from "../prompts.js";

/** Draft Reply: generate (or revise) the reply using context + reviewer feedback. */
export async function draftReply(state: EmailStateType): Promise<Partial<EmailStateType>> {
  if (!state.email) throw new Error("draftReply requires an email in state.");

  const model = getChatModel({ temperature: 0.3 });
  const parser = new StringOutputParser();

  const human = draftHuman({
    email: state.email,
    classification: state.classification,
    docHits: state.docHits,
    issueRef: state.issueRef,
    feedback: state.decision?.action === "edit" ? state.decision.feedback : undefined,
  });

  const draft = await model
    .pipe(parser)
    .invoke([
      { role: "system", content: DRAFT_SYSTEM },
      { role: "user", content: human },
    ]);

  const revised = state.decision?.action === "edit";
  return {
    draft,
    // Clear the prior decision so the next review starts fresh.
    decision: null,
    status: [revised ? "Draft reply: revised per feedback" : "Draft reply: generated"],
  };
}
