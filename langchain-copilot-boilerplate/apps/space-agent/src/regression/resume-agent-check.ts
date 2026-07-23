/**
 * Regression check: drives the hand-built resume StateGraph end to end
 * through the CopilotKit runtime (gateway harness on 2200) — the same wire
 * path as the web app. Proves a raw StateGraph (no copilotkit middleware)
 * streams and replies through the embed platform, and that the conditional
 * routing always lands in a node that answers the user:
 *
 * - product API reachable + resume found  → LLM review reply
 * - API down / auth rejected / no resume  → deterministic explanation reply
 *
 * Both are correct outcomes here; the check asserts the run finishes
 * without RUN_ERROR and the assistant says something non-empty.
 *
 * Run: pnpm regression:harness:gateway (plus memory worker), then
 *      pnpm regression:resume-agent
 */

// Libs for Node
import { randomUUID } from 'node:crypto';

// Libs for third party
import { HttpAgent } from '@ag-ui/client';

// Internal
import { RESUME_AGENT_ID } from '@agent/graphs/agent-ids.js';

const RUN_URL =
  process.env.REGRESSION_COPILOTKIT_URL ??
  `http://localhost:2200/copilotkit/agent/${RESUME_AGENT_ID}/run`;

const textOf = (content: unknown): string =>
  typeof content === 'string' ? content : '';

const main = async (): Promise<void> => {
  const results: Array<[string, boolean, string]> = [];
  const check = (name: string, ok: boolean, detail: string): void => {
    results.push([name, ok, detail]);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} — ${detail}`);
  };

  const threadId = randomUUID();
  console.log(`thread: ${threadId}`);

  const agent = new HttpAgent({ url: RUN_URL, threadId });
  agent.messages = [
    { id: randomUUID(), role: 'user', content: 'Please review my resume.' },
  ];

  const events: string[] = [];
  await agent.runAgent(undefined, {
    onEvent: ({ event }) => {
      events.push(event.type);
    },
  });

  check(
    'run-finishes-without-error',
    events.includes('RUN_FINISHED') && !events.includes('RUN_ERROR'),
    `events: ${[...new Set(events)].join(', ')}`,
  );

  const assistant = [...agent.messages]
    .reverse()
    .find((message) => message.role === 'assistant');
  const reply = textOf(assistant?.content);
  check(
    'conditional-branch-produced-a-reply',
    reply.trim().length > 0,
    JSON.stringify(reply.slice(0, 120)),
  );

  const failed = results.filter(([, ok]) => !ok);
  console.log(failed.length === 0 ? '\nALL CHECKS PASSED' : `\n${failed.length} CHECK(S) FAILED`);
  if (failed.length > 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error('resume-agent-check crashed:', error);
  process.exitCode = 1;
});
