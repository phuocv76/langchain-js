import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';

import { HTTPException } from 'hono/http-exception';

import {
  D1ThreadSaver,
  createInMemoryThreadSaver,
} from '../d1-thread-saver.js';
import { runWithCheckpointUser } from '../checkpoint-user-context.js';

type StoredRow = { userId: string; threadId: string; metadata: string };

/**
 * In-memory stand-in for the memory worker's thread-store endpoints,
 * mirroring its put/patch merge semantics so the saver's HTTP mapping is
 * exercised against realistic behavior.
 */
const createStubService = () => {
  const rows: StoredRow[] = [];
  const requests: Array<{ path: string; body: Record<string, unknown> }> = [];

  const findRow = (body: Record<string, unknown>): StoredRow | undefined =>
    rows.find(
      (row) => row.userId === body.userId && row.threadId === body.threadId,
    );

  const handle = (path: string, body: Record<string, unknown>): unknown => {
    if (path === '/v1/thread-store/get') {
      const row = findRow(body);
      return {
        thread: row ? { threadId: row.threadId, metadata: row.metadata } : null,
      };
    }
    if (path === '/v1/thread-store/set') {
      const existing = findRow(body);
      const incoming = body.metadata as string;
      const metadata =
        body.kind === 'patch' && existing
          ? JSON.stringify({
              ...JSON.parse(existing.metadata),
              ...JSON.parse(incoming),
            })
          : incoming;
      if (existing) {
        existing.metadata = metadata;
      } else {
        rows.push({
          userId: body.userId as string,
          threadId: body.threadId as string,
          metadata,
        });
      }
      const row = findRow(body);
      return { thread: { threadId: row?.threadId, metadata: row?.metadata } };
    }
    if (path === '/v1/thread-store/delete') {
      const index = rows.findIndex(
        (row) => row.userId === body.userId && row.threadId === body.threadId,
      );
      if (index >= 0) rows.splice(index, 1);
      return { ok: true };
    }
    return undefined;
  };

  const server = createServer((request, response) => {
    let raw = '';
    request.on('data', (chunk: Buffer) => {
      raw += chunk.toString();
    });
    request.on('end', () => {
      const body = JSON.parse(raw) as Record<string, unknown>;
      requests.push({ path: request.url ?? '', body });
      const payload = handle(request.url ?? '', body);
      response.setHeader('Content-Type', 'application/json');
      if (!payload) {
        response.statusCode = 404;
        response.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
      response.end(JSON.stringify(payload));
    });
  });

  return { server, rows, requests };
};

describe('D1ThreadSaver', () => {
  let stub: ReturnType<typeof createStubService>;
  let server: Server;
  let saver: D1ThreadSaver;

  before(async () => {
    stub = createStubService();
    server = stub.server;
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    saver = new D1ThreadSaver({
      baseUrl: `http://127.0.0.1:${address.port}`,
      headers: {},
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    stub.rows.length = 0;
    stub.requests.length = 0;
  });

  const asUser = <T>(fn: () => Promise<T>): Promise<T> =>
    runWithCheckpointUser('user-a', fn);

  it('round-trips put, patch merge, and get through the worker contract', async () => {
    await asUser(async () => {
      const created = await saver.set('t-1', {
        kind: 'put',
        metadata: { graph_id: 'example-graph' },
      });
      assert.deepEqual(created.metadata, { graph_id: 'example-graph' });

      const patched = await saver.set('t-1', {
        kind: 'patch',
        metadata: { label: 'demo' },
      });
      assert.deepEqual(patched.metadata, {
        graph_id: 'example-graph',
        label: 'demo',
      });

      const fetched = await saver.get('t-1');
      assert.equal(fetched.thread_id, 't-1');
      assert.deepEqual(fetched.metadata, {
        graph_id: 'example-graph',
        label: 'demo',
      });
    });
    assert.ok(
      stub.requests.every((request) => request.body.userId === 'user-a'),
      'every worker call carries the verified user id',
    );
  });

  it('surfaces a missing thread as HTTP 404 for the embed routes', async () => {
    await asUser(async () => {
      await assert.rejects(
        () => saver.get('missing'),
        (error: unknown) =>
          error instanceof HTTPException && error.status === 404,
      );
    });
  });

  it('deletes only within the verified user scope', async () => {
    stub.rows.push(
      { userId: 'user-a', threadId: 't-1', metadata: '{}' },
      { userId: 'user-b', threadId: 't-1', metadata: '{}' },
    );
    await asUser(() => saver.delete('t-1'));
    assert.deepEqual(
      stub.rows.map((row) => row.userId),
      ['user-b'],
    );
  });

  it('refuses to operate without a verified user in context', async () => {
    await assert.rejects(
      () => saver.get('t-1'),
      /requires a verified user/,
    );
  });
});

describe('createInMemoryThreadSaver', () => {
  it('scopes threads per user and 404s on misses', async () => {
    const saver = createInMemoryThreadSaver();
    await runWithCheckpointUser('user-a', () =>
      saver.set('t-1', { kind: 'put', metadata: { graph_id: 'g' } }),
    );
    const forOtherUser = runWithCheckpointUser('user-b', () =>
      saver.get('t-1'),
    );
    await assert.rejects(
      () => forOtherUser,
      (error: unknown) => error instanceof HTTPException && error.status === 404,
    );
    const patched = await runWithCheckpointUser('user-a', () =>
      saver.set('t-1', { kind: 'patch', metadata: { label: 'x' } }),
    );
    assert.deepEqual(patched.metadata, { graph_id: 'g', label: 'x' });
  });
});
