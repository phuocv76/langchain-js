import { publishBodySchema } from './events';
import type { Env } from './types';

const timingSafeEqual = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a[i]! ^ b[i]!;
  }
  return mismatch === 0;
};

const extractPublishSecret = (request: Request): string | undefined => {
  const header = request.headers.get('Authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    if (token) return token;
  }
  const custom = request.headers.get('X-Realtime-Publish-Secret')?.trim();
  return custom || undefined;
};

/**
 * Internal publish endpoint used by the BFF agent runtime after durable writes succeed.
 */
export const handlePublish = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  if (!env.REALTIME_PUBLISH_SECRET) {
    return Response.json(
      { error: 'REALTIME_PUBLISH_SECRET is not configured' },
      { status: 503 },
    );
  }

  const secret = extractPublishSecret(request);
  if (!secret || !timingSafeEqual(secret, env.REALTIME_PUBLISH_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => undefined);
  const parsed = publishBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid publish payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { userId, event } = parsed.data;
  const id = env.USER_HUB.idFromName(userId);
  const stub = env.USER_HUB.get(id);

  const response = await stub.fetch(
    new Request('https://user-hub/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    }),
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'publish_broadcast_failed',
        status: response.status,
        body: text.slice(0, 200),
      }),
    );
    return Response.json({ error: 'Broadcast failed' }, { status: 502 });
  }

  const result = (await response.json()) as { ok: boolean; delivered: number };
  return Response.json({ ok: true, delivered: result.delivered });
};
