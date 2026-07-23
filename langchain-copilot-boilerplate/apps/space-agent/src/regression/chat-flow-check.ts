/**
 * Regression check: drives the CopilotKit runtime exactly like the web app
 * does — an AG-UI HttpAgent posting to the multi-route run endpoint. Run:
 *
 *   cd apps/agent && npx tsx src/regression/chat-flow-check.ts
 *
 * Chain under test: HttpAgent → CopilotKit runtime (2200) → LangGraphAgent
 * adapter → embed server (2100) → workspace graph → D1 checkpoints.
 */

// Libs for Node
import { randomUUID } from 'node:crypto';

// Libs for third party
import { HttpAgent } from '@ag-ui/client';

const RUN_URL =
  process.env.REGRESSION_COPILOTKIT_URL ??
  'http://localhost:2200/copilotkit/agent/workspaceAgent/run';

const textOf = (content: unknown): string =>
  typeof content === 'string' ? content : '';

const lastAssistantText = (
  messages: readonly { role?: string; content?: unknown }[],
): string => {
  const assistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant');
  return textOf(assistant?.content);
};

const main = async (): Promise<void> => {
  const results: Array<[string, boolean, string]> = [];
  const check = (name: string, ok: boolean, detail: string): void => {
    results.push([name, ok, detail]);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} — ${detail}`);
  };

  const threadId = randomUUID();
  console.log(`thread: ${threadId}`);
  const agent = new HttpAgent({ url: RUN_URL, threadId });

  const seenEvents = new Set<string>();
  agent.subscribe({
    onEvent: ({ event }) => {
      seenEvents.add(event.type);
    },
  });

  // Run 1: seed a fact through the full CopilotKit → adapter → embed chain.
  console.log('run 1: seeding a fact…');
  agent.messages = [
    {
      id: randomUUID(),
      role: 'user',
      content: 'My favorite color is teal. Reply with one short sentence.',
    },
  ];
  await agent.runAgent();
  const reply1 = lastAssistantText(agent.messages);
  check('run-1-assistant-reply', reply1.length > 0, JSON.stringify(reply1));
  check(
    'run-1-streamed-text-events',
    seenEvents.has('TEXT_MESSAGE_CONTENT') || seenEvents.has('TEXT_MESSAGE_CHUNK'),
    `events: ${[...seenEvents].join(', ')}`,
  );

  // Run 2 on the same thread: memory must come back through D1 checkpoints.
  console.log('run 2: recalling the fact…');
  agent.addMessage({
    id: randomUUID(),
    role: 'user',
    content: 'What is my favorite color? Answer with just the color.',
  });
  await agent.runAgent();
  const reply2 = lastAssistantText(agent.messages);
  check(
    'cross-run-memory-via-d1',
    reply2.toLowerCase().includes('teal'),
    JSON.stringify(reply2),
  );

  const failed = results.filter(([, ok]) => !ok);
  console.log(
    `\n${failed.length === 0 ? 'ALL CHECKS PASSED' : `${failed.length} CHECK(S) FAILED`}`,
  );
  console.log(`d1-verify thread id: ${threadId}`);
  process.exit(failed.length === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error('CHECK FAILED:', error);
  process.exit(1);
});
