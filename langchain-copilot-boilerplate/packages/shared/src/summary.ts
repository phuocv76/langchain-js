/**
 * Prefix langchain's summarizationMiddleware puts on its rolling summary.
 *
 * Internal langchain string, not a public API: the frontend transcript
 * filter (vendored in the langchain-copilot-web repo's
 * `src/lib/agent-contracts.ts`) hides messages carrying it, and the
 * summary-parity regression check asserts it still matches — so a langchain
 * upgrade that changes the wording fails the check instead of leaking
 * summary bubbles to users.
 */
export const SUMMARY_PREFIX = 'Here is a summary of the conversation to date:';
