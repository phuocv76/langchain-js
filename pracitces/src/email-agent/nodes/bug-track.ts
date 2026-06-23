// Libs for third party
import { Command } from "@langchain/langgraph";

// Internal
import { createBugIssue } from "../integrations/github.js";

// Types
import type { EmailAgentStateType } from "../state.js";

/**
 * Files a GitHub issue for bug reports and routes to draftReply.
 *
 * @param state - Current graph state.
 */
export const bugTrack = async (
  state: EmailAgentStateType,
): Promise<Command<"draftReply">> => {
  const classification = state.classification;
  const title = `[Email Bug] ${classification?.topic ?? state.subject ?? "Customer report"}`;

  const body = [
    "## Reported via email agent",
    "",
    `**From:** ${state.senderEmail ?? "unknown"}`,
    `**Subject:** ${state.subject ?? "(none)"}`,
    "",
    "### Email body",
    state.emailContent ?? "(empty)",
  ].join("\n");

  let searchResults: string[];

  try {
    const issue = await createBugIssue({ title, body });
    searchResults = [`GitHub issue #${issue.number} created: ${issue.url}`];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    searchResults = [`Bug tracking unavailable: ${message}`];
  }

  return new Command({
    update: {
      searchResults,
      status: "bug_tracked",
      steps: ["Bug report filed on GitHub"],
    },
    goto: "draftReply",
  });
};
