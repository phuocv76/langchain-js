// Libs for third party
import { Command } from "@langchain/langgraph";

// Internal
import { searchDocs } from "../integrations/doc-search.js";

// Types
import type { EmailAgentStateType } from "../state.js";

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
      searchResults = ["No matching documentation snippets were found."];
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    searchResults = [`Documentation search unavailable: ${message}`];
  }

  return new Command({
    update: { searchResults, status: "docs_searched", steps: ["Documentation search completed"] },
    goto: "draftReply",
  });
};
