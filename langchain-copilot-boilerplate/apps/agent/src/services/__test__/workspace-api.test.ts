import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.API_BASE_URL = 'https://api.test.local';

const { executeWorkspaceTool } = await import('../workspace-api.js');

const identity = {
  requestId: 'req-1',
  userId: 'uid-1',
  email: 'bao.nguyen@asnet.com.vn',
  accessToken: 'firebase-id-token',
};

const originalFetch = globalThis.fetch;

const stubFetch = (payload: unknown, status = 200) => {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: Object.fromEntries(
        Object.entries((init?.headers ?? {}) as Record<string, string>),
      ),
    });
    return new Response(JSON.stringify(payload), { status });
  }) as typeof fetch;
  return calls;
};

describe('workspace API tool execution', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('reads the acting user own data when email is omitted', async () => {
    const calls = stubFetch({ timeOffs: [] });

    const result = await executeWorkspaceTool('get_employee_time_off', { year: 2026 }, identity);

    assert.equal(
      calls[0]?.url,
      'https://api.test.local/api/v1/employees/bao.nguyen%40asnet.com.vn/time-offs/2026',
    );
    assert.equal(result, JSON.stringify({ timeOffs: [] }));
  });

  it('sends the signed-in user Firebase Bearer token', async () => {
    const calls = stubFetch({ ok: true });

    await executeWorkspaceTool('get_workspace_stats', {}, identity);

    const headers = calls[0]?.headers ?? {};
    assert.equal(headers.Authorization, 'Bearer firebase-id-token');
    assert.equal(headers['X-Request-Id'], 'req-1');
    assert.equal(headers['X-Acting-User-Id'], undefined);
    assert.equal(headers['X-Acting-User-Email'], undefined);
  });

  it('applies search defaults and forwards the query', async () => {
    const calls = stubFetch([]);

    await executeWorkspaceTool('search_employees', { query: 'bao' }, identity);

    const url = new URL(calls[0]!.url);
    assert.equal(url.pathname, '/api/v1/employees');
    assert.equal(url.searchParams.get('simple'), 'true');
    assert.equal(url.searchParams.get('limit'), '10');
    assert.equal(url.searchParams.get('query'), 'bao');
  });

  it('turns API failures into readable tool output instead of throwing', async () => {
    stubFetch({ code: 'FORBIDDEN' }, 403);

    const result = await executeWorkspaceTool('get_workspace_stats', {}, identity);

    assert.match(result, /failed \(403\)/);
  });
});
