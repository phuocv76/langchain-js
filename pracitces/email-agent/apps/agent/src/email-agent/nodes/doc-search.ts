// Libs for third party
import { Command } from "@langchain/langgraph";

// Internal
import { INTEGRATIONS, STATUS, STEPS } from "../../constants/messages";
import { searchDocs } from "../integrations/doc-search";

// Types
import type { EmailAgentStateType } from "../state";

/**
 * Searches the local knowledge base and routes to draftReply.
 *
 * @param state - Current graph state.
 */
export const docSearch = async (
  state: EmailAgentStateType,
): Promise<Command<"draftReply">> => {
  const classification = state.classification;
  const query = classification
    ? `${classification.intent} ${classification.topic} ${classification.summary}`
    : (state.emailContent ?? "");

  let searchResults: string[];

  try {
    searchResults = await searchDocs(query);
    if (searchResults.length === 0) {
      searchResults = [INTEGRATIONS.DOC_SEARCH_NO_MATCHES];
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    searchResults = [INTEGRATIONS.formatDocSearchUnavailable(message)];
  }

  return new Command({
    update: {
      searchResults,
      status: STATUS.DOCS_SEARCHED,
      steps: [STEPS.DOC_SEARCH_COMPLETED],
    },
    goto: "draftReply",
  });
};
