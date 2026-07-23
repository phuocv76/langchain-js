import {
  AuthError,
  extractBearerOrQueryToken,
  verifyFirebaseIdToken,
} from './auth';
import type { Env } from './types';

/**
 * Authenticate the browser, then proxy the WebSocket upgrade into the
 * per-user Durable Object.
 */
export const handleWebSocketUpgrade = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  if (request.headers.get('Upgrade') !== 'websocket') {
    return Response.json(
      { error: 'Expected WebSocket Upgrade' },
      { status: 426 },
    );
  }

  const token = extractBearerOrQueryToken(request);
  if (!token) {
    return Response.json({ error: 'Missing authentication token' }, { status: 401 });
  }

  let userId: string;
  try {
    ({ userId } = await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID));
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.warn(
      '[realtime] firebase verify failed:',
      error instanceof Error ? error.message : 'unknown',
    );
    return Response.json({ error: 'Invalid authentication token' }, { status: 401 });
  }

  const id = env.USER_HUB.idFromName(userId);
  const stub = env.USER_HUB.get(id);
  const connectUrl = new URL(request.url);
  connectUrl.pathname = '/connect';
  // Strip the token from the DO-facing URL; auth already succeeded.
  connectUrl.searchParams.delete('token');

  return stub.fetch(
    new Request(connectUrl.toString(), {
      headers: request.headers,
    }),
  );
};
