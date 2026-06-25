// Libs for third party
import { Command } from "@langchain/langgraph";

// Internal
import {
  INTEGRATIONS,
  PLACEHOLDERS,
  STATUS,
  STEPS,
} from "../../constants/messages";
import { createBugIssue } from "../integrations/github";

// Types
import type { EmailAgentStateType } from "../state";

/**
 * Files a GitHub issue for bug reports and routes to draftReply.
 *
 * @param state - Current graph state.
 */
export const bugTrack = async (
  state: EmailAgentStateType,
): Promise<Command<"draftReply">> => {
  const classification = state.classification;
  const title = `${INTEGRATIONS.BUG_ISSUE_TITLE_PREFIX} ${classification?.topic ?? state.subject ?? PLACEHOLDERS.CUSTOMER_REPORT}`;

  const body = [
    INTEGRATIONS.BUG_ISSUE_BODY_HEADER,
    "",
    `${INTEGRATIONS.BUG_ISSUE_FROM_LABEL} ${state.senderEmail ?? PLACEHOLDERS.UNKNOWN_VALUE}`,
    `${INTEGRATIONS.BUG_ISSUE_SUBJECT_LABEL} ${state.subject ?? PLACEHOLDERS.NONE}`,
    "",
    INTEGRATIONS.BUG_ISSUE_BODY_SECTION,
    state.emailContent ?? PLACEHOLDERS.EMPTY,
  ].join("\n");

  let searchResults: string[];

  try {
    const issue = await createBugIssue({ title, body });
    searchResults = [
      INTEGRATIONS.formatGitHubIssueCreated(issue.number, issue.url),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    searchResults = [INTEGRATIONS.formatBugTrackingUnavailable(message)];
  }

  return new Command({
    update: {
      searchResults,
      status: STATUS.BUG_TRACKED,
      steps: [STEPS.BUG_TRACK_FILED],
    },
    goto: "draftReply",
  });
};
