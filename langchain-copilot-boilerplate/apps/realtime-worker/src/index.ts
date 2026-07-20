import { handlePublish } from './publish';
import type { Env } from './types';
import { handleWebSocketUpgrade } from './websocket';

export { UserHub } from './durable-object';

const corsHeaders = (request: Request, env: Env): HeadersInit => {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = (env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] ?? '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, X-Realtime-Publish-Secret',
    'Access-Control-Max-Age': '86400',
  };
};

const withCors = (response: Response, request: Request, env: Env): Response => {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return withCors(
        Response.json({ status: 'ok', service: 'agent-realtime' }),
        request,
        env,
      );
    }

    if (url.pathname === '/ws' && request.method === 'GET') {
      // WebSocket upgrade responses must not wrap the body with CORS helpers.
      return handleWebSocketUpgrade(request, env);
    }

    if (url.pathname === '/publish' && request.method === 'POST') {
      return withCors(await handlePublish(request, env), request, env);
    }

    return withCors(
      Response.json({ error: 'Not found' }, { status: 404 }),
      request,
      env,
    );
  },
};
