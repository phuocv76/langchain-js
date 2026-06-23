import { z } from "zod";
import type { EmailStateType } from "../state.js";
import { getChatModel } from "../../lib/model.js";
import { CLASSIFY_SYSTEM, classifyHuman } from "../prompts.js";

const classificationSchema = z.object({
  urgency: z.enum(["low", "normal", "high", "urgent"]),
  topic: z.string().describe("A few words naming the subject of the email."),
  reason: z.string().describe("One short sentence explaining the chosen route."),
  route: z.enum(["bugTrack", "docSearch", "draftReply"]),
});

/** Classify Intent: categorize urgency + topic and decide the next action. */
export async function classifyIntent(
  state: EmailStateType,
): Promise<Partial<EmailStateType>> {
  if (!state.email) throw new Error("classifyIntent requires an email in state.");

  const model = getChatModel().withStructuredOutput(classificationSchema, {
    name: "classify_email",
  });

  const classification = await model.invoke([
    { role: "system", content: CLASSIFY_SYSTEM },
    { role: "user", content: classifyHuman(state.email) },
  ]);

  return {
    classification,
    status: [`Classified: ${classification.topic} -> ${classification.route} (${classification.urgency})`],
  };
}
