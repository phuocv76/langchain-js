import type { EmailStateType } from "../state.js";
import { searchDocs } from "../integrations/doc-search.js";

/** Doc Search: query the knowledge base for context relevant to the email. */
export async function docSearch(state: EmailStateType): Promise<Partial<EmailStateType>> {
  if (!state.email) throw new Error("docSearch requires an email in state.");

  const query = `${state.email.subject}\n${state.email.body || state.email.snippet}`;
  const docHits = await searchDocs(query, 3);

  return {
    docHits,
    status: [`Doc search: found ${docHits.length} relevant excerpt(s)`],
  };
}
