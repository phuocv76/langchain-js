/**
 * Parity check for the no-bridge chain: drive a conversation past the
 * summarization trigger (16 messages). The stock adapter delivers raw engine
 * state, so the rolling summary DOES appear in the raw transcript — the web
 * ThreadHydrator filters it by prefix. This script guards that contract:
 * every synthetic message in the raw transcript must start with the exact
 * prefix the frontend filter keys on, so a langchain upgrade that changes
 * the prefix fails here instead of leaking bubbles to users. Run with the
 * regression harness up (`copilotkit-gateway-harness.ts`):
 *
 *   cd apps/agent && npx tsx src/regression/summary-parity-check.ts
 */

// Libs for Node
import { randomUUID } from 'node:crypto';

// Libs for third party
import { HttpAgent } from '@ag-ui/client';

const RUN_URL =
  process.env.REGRESSION_COPILOTKIT_URL ??
  'http://localhost:2200/copilotkit/agent/workspaceAgent/run';

/** Prefix langchain's summarizationMiddleware puts on its rolling summary. */
const SUMMARY_PREFIX = 'Here is a summary of the conversation to date:';

/** 9 exchanges = 18+ messages, past the 16-message summarization trigger. */
const TURNS = 9;

const main = async (): Promise<void> => {
  const threadId = randomUUID();
  console.log(`thread: ${threadId}`);
  const agent = new HttpAgent({ url: RUN_URL, threadId });
  const sentIds = new Set<string>();

  for (let turn = 1; turn <= TURNS; turn += 1) {
    const id = randomUUID();
    sentIds.add(id);
    agent.addMessage({
      id,
      role: 'user',
      content: `Fact #${turn}: my code word ${turn} is alpha-${turn}. Reply with just "ok".`,
    });
    await agent.runAgent();
    console.log(`turn ${turn}/${TURNS} done (${agent.messages.length} msgs in transcript)`);
  }

  // User-role messages we never sent are engine synthetics (the rolling
  // summary). Each must carry the prefix the web filter keys on.
  const synthetic = agent.messages.filter(
    (message) => message.role === 'user' && !sentIds.has(message.id),
  );
  const unfiltered = synthetic.filter(
    (message) =>
      typeof message.content !== 'string' ||
      !message.content.startsWith(SUMMARY_PREFIX),
  );
  const ok = unfiltered.length === 0;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} summary-matches-frontend-filter — ${
      synthetic.length
    } synthetic message(s), ${unfiltered.length} would escape the filter`,
  );

  // Long-thread recall through compaction: the engine may only keep the
  // summary + recent turns, so an early fact must still be answerable.
  agent.addMessage({
    id: randomUUID(),
    role: 'user',
    content: 'What was code word 2? Answer with just the code word.',
  });
  await agent.runAgent();
  const last = agent.messages.at(-1);
  const recall =
    typeof last?.content === 'string' ? last.content.toLowerCase() : '';
  const recallOk = recall.includes('alpha-2');
  console.log(
    `${recallOk ? 'PASS' : 'FAIL'} compacted-recall — ${JSON.stringify(recall)}`,
  );

  process.exit(ok && recallOk ? 0 : 1);
};

main().catch((error) => {
  console.error('CHECK FAILED:', error);
  process.exit(1);
});
