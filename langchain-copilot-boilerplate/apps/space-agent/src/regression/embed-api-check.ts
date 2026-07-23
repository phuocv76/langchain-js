/**
 * Regression check: drives the embed server directly with plain LangGraph-platform HTTP
 * calls — the same wire protocol the LangGraph SDK (and therefore
 * CopilotKit's LangGraph adapter) speaks. Run with:
 *
 *   cd apps/space-agent && npx tsx src/regression/embed-api-check.ts
 *
 * Verifies: thread creation, streamed runs, state read-back through the
 * injected D1 checkpointer, and cross-run memory on the same thread.
 */

// Internal
import {
  AGENT_HEADER_ACCESS_TOKEN,
  AGENT_HEADER_REQUEST_ID,
  AGENT_HEADER_ROLES,
  AGENT_HEADER_USER_EMAIL,
  AGENT_HEADER_USER_ID,
} from '@repo/shared';
import { WORKSPACE_AGENT_ID } from '@agent/graphs/agent-ids.js';

const BASE = process.env.REGRESSION_EMBED_URL ?? 'http://localhost:2100';
const GRAPH_ID = WORKSPACE_AGENT_ID;

/** Same sanitized claim keys the embed app injects from verified auth. */
const configurable = {
  [AGENT_HEADER_REQUEST_ID]: 'regression-request',
  [AGENT_HEADER_USER_ID]: 'regression-user',
  [AGENT_HEADER_USER_EMAIL]: 'regression@example.com',
  [AGENT_HEADER_ROLES]: encodeURIComponent(JSON.stringify(['user'])),
  [AGENT_HEADER_ACCESS_TOKEN]: 'regression-token',
};

interface SseEvent {
  readonly event: string;
  readonly data: unknown;
}

const request = async (
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<Response> => {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new Error(
      `${method} ${path} -> ${response.status}: ${await response.text()}`,
    );
  }
  return response;
};

/** Minimal SSE reader: collects `event:`/`data:` pairs until stream end. */
const readSse = async (response: Response): Promise<SseEvent[]> => {
  const text = await response.text();
  return text
    .split('\n\n')
    .map((block) => {
      const event =
        block.match(/^event: (.*)$/m)?.[1] ?? 'message';
      const raw = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      if (!raw) return undefined;
      let data: unknown = raw;
      try {
        data = JSON.parse(raw);
      } catch {
        /* keep raw string */
      }
      return { event, data };
    })
    .filter((entry): entry is SseEvent => entry !== undefined);
};

type StateMessage = { type?: string; content?: unknown };

const textOf = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((block) =>
      typeof (block as { text?: unknown }).text === 'string'
        ? (block as { text: string }).text
        : '',
    )
    .join('');
};

const lastAiText = (messages: readonly StateMessage[]): string => {
  const ai = [...messages].reverse().find((m) => m.type === 'ai');
  return textOf(ai?.content);
};

const streamRun = async (
  threadId: string,
  content: string,
): Promise<StateMessage[]> => {
  const response = await request(
    'POST',
    `/threads/${threadId}/runs/stream`,
    {
      assistant_id: GRAPH_ID,
      input: {
        messages: [{ role: 'user', content }],
        copilotkit: { actions: [], context: [], interceptedToolCalls: [] },
      },
      config: { configurable },
      stream_mode: ['values'],
    },
  );
  const events = await readSse(response);
  const firstError = events.find((e) => e.event === 'error');
  if (firstError) {
    throw new Error(`run stream error: ${JSON.stringify(firstError.data)}`);
  }
  const values = events.filter((e) => e.event.startsWith('values'));
  const final = values.at(-1)?.data as { messages?: StateMessage[] } | undefined;
  console.log(
    `  stream events: ${events.map((e) => e.event).join(', ')}`,
  );
  return final?.messages ?? [];
};

const main = async (): Promise<void> => {
  const results: Array<[string, boolean, string]> = [];
  const check = (name: string, ok: boolean, detail: string): void => {
    results.push([name, ok, detail]);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} — ${detail}`);
  };

  // 1. Create a thread.
  const created = (await (
    await request('POST', '/threads', { metadata: { graph_id: GRAPH_ID } })
  ).json()) as { thread_id: string };
  check('thread-create', Boolean(created.thread_id), created.thread_id);
  const threadId = created.thread_id;

  // 2. First run: seed a fact, expect a streamed answer.
  console.log('run 1: seeding a fact…');
  const run1 = await streamRun(
    threadId,
    'My favorite color is teal. Reply with one short sentence.',
  );
  check(
    'run-1-streams-answer',
    lastAiText(run1).length > 0,
    JSON.stringify(lastAiText(run1)),
  );

  // 3. State read-back must go through the injected D1 checkpointer.
  const state = (await (
    await request('GET', `/threads/${threadId}/state`)
  ).json()) as { values?: { messages?: StateMessage[] } };
  const stateMessages = state.values?.messages ?? [];
  check(
    'state-read-back',
    stateMessages.length >= 2,
    `${stateMessages.length} messages in thread state`,
  );

  // 4. Second run on the same thread: memory must survive via D1.
  console.log('run 2: recalling the fact…');
  const run2 = await streamRun(
    threadId,
    'What is my favorite color? Answer with just the color.',
  );
  const recall = lastAiText(run2);
  check(
    'cross-run-memory',
    recall.toLowerCase().includes('teal'),
    JSON.stringify(recall),
  );

  const failed = results.filter(([, ok]) => !ok);
  console.log(
    `\n${failed.length === 0 ? 'ALL CHECKS PASSED' : `${failed.length} CHECK(S) FAILED`}`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error('CHECK FAILED:', error);
  process.exit(1);
});
