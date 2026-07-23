/**
 * Regression check: the verified identity claims must reach graph tools
 * through the full production chain (CopilotKit runtime → LangGraphAgent →
 * embed app). The embed server takes run config only from the request body
 * and the adapter filters custom configurable keys, so this only works via
 * the embed app's server-side claim injection — a break here surfaces as
 * `RUN_ERROR: Trusted agent context is unavailable` on any workspace tool
 * call. Run with the gateway harness up:
 *
 *   cd apps/space-agent && npx tsx --env-file=.env src/regression/trusted-context-check.ts
 *
 * Requires API_BASE_URL so workspace tools are advertised to the model. The
 * product API rejecting the regression token (401) is fine — the assertion
 * is that the tool executes and the run completes instead of crashing.
 */

// Libs for Node
import { randomUUID } from 'node:crypto';

// Libs for third party
import { HttpAgent } from '@ag-ui/client';
import { WORKSPACE_AGENT_ID } from '@agent/graphs/agent-ids.js';

const RUN_URL =
  process.env.REGRESSION_COPILOTKIT_URL ??
  `http://localhost:2200/copilotkit/agent/${WORKSPACE_AGENT_ID}/run`;

const main = async (): Promise<void> => {
  if (!process.env.API_BASE_URL) {
    console.log(
      'SKIPPED — API_BASE_URL is not set, workspace tools are not advertised',
    );
    return;
  }

  const results: Array<[string, boolean, string]> = [];
  const check = (name: string, ok: boolean, detail: string): void => {
    results.push([name, ok, detail]);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} — ${detail}`);
  };

  const threadId = randomUUID();
  console.log(`thread: ${threadId}`);
  const agent = new HttpAgent({ url: RUN_URL, threadId });

  const seenEvents = new Set<string>();
  let runErrorMessage: string | undefined;
  agent.subscribe({
    onEvent: ({ event }) => {
      seenEvents.add(event.type);
      if (event.type === 'RUN_ERROR') {
        runErrorMessage = (event as { message?: string }).message;
      }
    },
  });

  agent.messages = [
    {
      id: randomUUID(),
      role: 'user',
      content:
        'Call the search_employees tool with query "nguyen" and report the result. You must call the tool.',
    },
  ];

  let clientError: unknown;
  try {
    await agent.runAgent();
  } catch (error) {
    clientError = error;
  }

  check(
    'run-completes-without-run-error',
    !runErrorMessage && !clientError,
    runErrorMessage ?? (clientError ? String(clientError) : 'no RUN_ERROR'),
  );
  check(
    'workspace-tool-invoked',
    seenEvents.has('TOOL_CALL_START') || seenEvents.has('TOOL_CALL_END'),
    `events: ${[...seenEvents].join(', ')}`,
  );

  const toolMessage = agent.messages.find(
    (message) => message.role === 'tool',
  );
  const toolText =
    typeof toolMessage?.content === 'string' ? toolMessage.content : '';
  // Either a real API payload or the readable failure text proves the tool
  // ran with trusted context (the hard throw happens before any API call).
  check(
    'tool-executed-with-trusted-context',
    toolText.length > 0 &&
      !toolText.includes('Trusted agent context is unavailable'),
    toolText.slice(0, 120) || '(no tool message)',
  );

  const failed = results.filter(([, ok]) => !ok);
  console.log(
    failed.length === 0 ? '\nALL CHECKS PASSED' : `\n${failed.length} CHECK(S) FAILED`,
  );
  if (failed.length > 0) process.exitCode = 1;
};

void main();
