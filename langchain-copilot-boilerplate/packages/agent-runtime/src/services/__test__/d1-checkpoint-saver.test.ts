import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { Checkpoint, CheckpointMetadata } from '@langchain/langgraph-checkpoint';

import { D1CheckpointSaver } from '../d1-checkpoint-saver.js';
import {
  CHECKPOINT_USER_ID_KEY,
  runWithCheckpointUser,
} from '../checkpoint-user-context.js';

type StoredCheckpoint = {
  userId: string;
  threadId: string;
  checkpointNs: string;
  checkpointId: string;
  parentCheckpointId: string | null;
  type: string | null;
  checkpoint: string;
  metadata: string;
};

type StoredWrite = {
  userId: string;
  threadId: string;
  checkpointNs: string;
  checkpointId: string;
  taskId: string;
  idx: number;
  channel: string;
  type: string | null;
  value: string;
};

/**
 * In-memory stand-in for the memory worker's checkpoint endpoints. It mirrors
 * the worker's response shapes and its INSERT OR IGNORE / OR REPLACE write
 * semantics so the saver's HTTP mapping and serde round-trips are exercised
 * against realistic behavior; SQL-level behavior itself is covered by the
 * worker smoke tests and E2E.
 */
const createStubService = () => {
  const checkpoints: StoredCheckpoint[] = [];
  const writes = new Map<string, StoredWrite>();
  const requests: Array<{ path: string; body: Record<string, unknown> }> = [];

  const latestFor = (body: Record<string, unknown>): StoredCheckpoint | undefined =>
    checkpoints
      .filter(
        (row) =>
          row.userId === body.userId &&
          row.threadId === body.threadId &&
          row.checkpointNs === body.checkpointNs &&
          (body.checkpointId === undefined || row.checkpointId === body.checkpointId),
      )
      .sort((a, b) => (a.checkpointId < b.checkpointId ? 1 : -1))[0];

  const handle = (path: string, body: Record<string, unknown>): unknown => {
    if (path === '/v1/checkpoints/put') {
      checkpoints.push(body as unknown as StoredCheckpoint);
      return { ok: true };
    }
    if (path === '/v1/checkpoints/get-tuple') {
      const row = latestFor(body);
      if (!row) return { tuple: null };
      const pendingWrites = [...writes.values()]
        .filter(
          (write) =>
            write.userId === body.userId &&
            write.threadId === body.threadId &&
            write.checkpointId === row.checkpointId,
        )
        .sort((a, b) => a.taskId.localeCompare(b.taskId) || a.idx - b.idx)
        .map(({ taskId, channel, type, value }) => ({ taskId, channel, type, value }));
      const { userId: _u, threadId: _t, checkpointNs: _n, ...tuple } = row;
      return { tuple: { ...tuple, pendingWrites } };
    }
    if (path === '/v1/checkpoints/put-writes') {
      for (const write of body.writes as Array<Omit<StoredWrite, 'userId' | 'threadId' | 'checkpointNs' | 'checkpointId' | 'taskId'>>) {
        const key = [body.threadId, body.checkpointNs, body.checkpointId, body.taskId, write.idx].join('|');
        if (!body.replace && writes.has(key)) continue;
        writes.set(key, {
          ...(body as { userId: string; threadId: string; checkpointNs: string; checkpointId: string; taskId: string }),
          ...write,
        });
      }
      return { ok: true };
    }
    if (path === '/v1/checkpoints/list') {
      const rows = checkpoints
        .filter(
          (row) =>
            row.userId === body.userId &&
            row.threadId === body.threadId &&
            (body.beforeCheckpointId === undefined ||
              row.checkpointId < (body.beforeCheckpointId as string)),
        )
        .sort((a, b) => (a.checkpointId < b.checkpointId ? 1 : -1))
        .slice(0, (body.limit as number | undefined) ?? 100)
        .map(({ userId: _u, threadId: _t, checkpointNs: _n, ...row }) => row);
      return { checkpoints: rows };
    }
    if (path === '/v1/checkpoints/delete-thread') {
      for (let index = checkpoints.length - 1; index >= 0; index -= 1) {
        if (checkpoints[index]?.threadId === body.threadId) checkpoints.splice(index, 1);
      }
      return { ok: true };
    }
    return undefined;
  };

  const server: Server = createServer((request, response) => {
    let raw = '';
    request.on('data', (chunk: string) => (raw += chunk));
    request.on('end', () => {
      const body = JSON.parse(raw) as Record<string, unknown>;
      requests.push({ path: request.url ?? '', body });
      const result = handle(request.url ?? '', body);
      response.statusCode = result === undefined ? 404 : 200;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(result ?? { error: 'Not found' }));
    });
  });

  return { server, requests, reset: () => { checkpoints.length = 0; writes.clear(); requests.length = 0; } };
};

const config = (overrides: Record<string, unknown> = {}) => ({
  configurable: {
    thread_id: 'thread-1',
    'x-agent-user-id': 'user-1',
    ...overrides,
  },
});

const checkpointFixture = (id: string): Checkpoint => ({
  v: 4,
  id,
  ts: '2026-07-17T00:00:00.000Z',
  channel_values: {
    messages: [
      new HumanMessage({ id: 'msg-1', content: 'hello' }),
      new AIMessage({ id: 'msg-2', content: 'hi there' }),
    ],
  },
  channel_versions: { messages: 2 },
  versions_seen: { agent: { messages: 1 } },
});

const metadataFixture: CheckpointMetadata = { source: 'loop', step: 1, parents: {} };

describe('d1 checkpoint saver', () => {
  const stub = createStubService();
  let saver: D1CheckpointSaver;

  before(async () => {
    await new Promise<void>((resolve) => stub.server.listen(0, '127.0.0.1', resolve));
    const address = stub.server.address();
    assert.ok(address && typeof address === 'object');
    saver = new D1CheckpointSaver({
      baseUrl: `http://127.0.0.1:${address.port}`,
      headers: {},
    });
  });
  after(() => stub.server.close());
  beforeEach(() => stub.reset());

  it('round-trips a checkpoint with message instances through base64', async () => {
    const checkpoint = checkpointFixture('1efa0001-0000-6000-8000-00000000000a');
    const returnedConfig = await saver.put(
      config(),
      checkpoint,
      metadataFixture,
      {},
    );
    assert.equal(
      returnedConfig.configurable?.checkpoint_id,
      checkpoint.id,
    );

    const tuple = await saver.getTuple(config());
    assert.ok(tuple);
    assert.equal(tuple.checkpoint.id, checkpoint.id);
    assert.deepEqual(tuple.metadata, metadataFixture);
    const messages = tuple.checkpoint.channel_values.messages as unknown[];
    assert.equal(messages.length, 2);
    // Serde revival must produce real message instances, not plain objects.
    assert.ok(messages[0] instanceof HumanMessage);
    assert.ok(messages[1] instanceof AIMessage);
    assert.equal((messages[0] as HumanMessage).content, 'hello');
  });

  it('links the parent checkpoint from the incoming config', async () => {
    const parent = checkpointFixture('1efa0001-0000-6000-8000-00000000000a');
    const child = checkpointFixture('1efa0001-0000-6000-8000-00000000000b');
    await saver.put(config(), parent, metadataFixture, {});
    await saver.put(
      config({ checkpoint_id: parent.id }),
      child,
      { ...metadataFixture, step: 2 },
      {},
    );

    const tuple = await saver.getTuple(config());
    assert.equal(tuple?.checkpoint.id, child.id);
    assert.equal(tuple?.parentConfig?.configurable?.checkpoint_id, parent.id);
    // Returned configs keep the verified user so parent walks / getState reuse
    // work without AsyncLocalStorage.
    assert.equal(
      tuple?.parentConfig?.configurable?.[CHECKPOINT_USER_ID_KEY],
      'user-1',
    );

    const byId = await saver.getTuple(config({ checkpoint_id: parent.id }));
    assert.equal(byId?.checkpoint.id, parent.id);

    // LangGraph walks parentConfig with only the keys the saver returned.
    const viaParent = await saver.getTuple(tuple!.parentConfig!);
    assert.equal(viaParent?.checkpoint.id, parent.id);
  });

  it('stores task writes idempotently and sentinel writes with replace', async () => {
    const checkpoint = checkpointFixture('1efa0001-0000-6000-8000-00000000000a');
    await saver.put(config(), checkpoint, metadataFixture, {});
    const writeConfig = config({ checkpoint_id: checkpoint.id });

    await saver.putWrites(writeConfig, [['messages', ['first']]], 'task-1');
    // A retried task must not clobber the original write.
    await saver.putWrites(writeConfig, [['messages', ['retry']]], 'task-1');
    await saver.putWrites(writeConfig, [['__interrupt__', { value: 'ask' }]], 'task-1');

    const taskRequest = stub.requests.find(
      (entry) => entry.path === '/v1/checkpoints/put-writes',
    );
    assert.equal(taskRequest?.body.replace, false);
    const writeRequests = stub.requests.filter(
      (entry) => entry.path === '/v1/checkpoints/put-writes',
    );
    const sentinelRequest = writeRequests[writeRequests.length - 1];
    assert.equal(sentinelRequest?.body.replace, true);
    const sentinelRow = (sentinelRequest?.body.writes as Array<{ idx: number }>)[0];
    assert.equal(sentinelRow?.idx, -3);

    const tuple = await saver.getTuple(config());
    const pending = tuple?.pendingWrites ?? [];
    const messagesWrite = pending.find(([, channel]) => channel === 'messages');
    assert.deepEqual(messagesWrite?.[2], ['first']);
    const interruptWrite = pending.find(([, channel]) => channel === '__interrupt__');
    assert.deepEqual(interruptWrite?.[2], { value: 'ask' });
  });

  it('lists checkpoints newest-first honoring before and limit', async () => {
    for (const suffix of ['a', 'b', 'c']) {
      await saver.put(
        config(),
        checkpointFixture(`1efa0001-0000-6000-8000-00000000000${suffix}`),
        metadataFixture,
        {},
      );
    }
    const tuples: string[] = [];
    for await (const tuple of saver.list(config(), {
      before: config({ checkpoint_id: '1efa0001-0000-6000-8000-00000000000c' }),
      limit: 2,
    })) {
      tuples.push(tuple.checkpoint.id);
    }
    assert.deepEqual(tuples, [
      '1efa0001-0000-6000-8000-00000000000b',
      '1efa0001-0000-6000-8000-00000000000a',
    ]);
  });

  it('refuses to operate without the verified user context', async () => {
    await assert.rejects(
      saver.getTuple({ configurable: { thread_id: 'thread-1' } }),
      /verified user context/,
    );
  });

  it('echoes the verified user into put/getTuple returned configs', async () => {
    const checkpoint = checkpointFixture('1efa0001-0000-6000-8000-00000000000a');
    const returned = await saver.put(config(), checkpoint, metadataFixture, {});
    assert.equal(returned.configurable?.[CHECKPOINT_USER_ID_KEY], 'user-1');

    const tuple = await saver.getTuple(config());
    assert.equal(tuple?.config.configurable?.[CHECKPOINT_USER_ID_KEY], 'user-1');
  });

  it('falls back to AsyncLocalStorage when LangGraph strips the user key', async () => {
    const checkpoint = checkpointFixture('1efa0001-0000-6000-8000-00000000000a');
    await saver.put(config(), checkpoint, metadataFixture, {});

    // Mimics LangGraph's resume-at-head getTuple: only thread_id + checkpoint_ns.
    const stripped = { configurable: { thread_id: 'thread-1', checkpoint_ns: '' } };
    await assert.rejects(saver.getTuple(stripped), /verified user context/);

    const tuple = await runWithCheckpointUser('user-1', () =>
      saver.getTuple(stripped),
    );
    assert.ok(tuple);
    assert.equal(tuple.checkpoint.id, checkpoint.id);
    assert.equal(
      stub.requests.at(-1)?.body.userId,
      'user-1',
    );
  });
});
