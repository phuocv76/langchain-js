import { NextResponse } from 'next/server';

import { getCurrentAuthSession } from '@/lib/auth/server-session';
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants';
import {
  getCopilotServerConfig,
  type CopilotServerConfig,
} from '@/lib/copilot/server-config';

type RouteContext = {
  readonly params: Promise<{ readonly path?: readonly string[] }>;
};

const BODYLESS_METHODS = new Set(['GET', 'HEAD']);
const HOP_BY_HOP_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
] as const;

const getCookieValue = (request: Request, name: string): string | undefined =>
  request.headers
    .get('cookie')
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);

const buildTargetUrl = async (
  request: Request,
  context: RouteContext,
  config: CopilotServerConfig,
): Promise<URL> => {
  const { path = [] } = await context.params;
  const base = config.COPILOT_AGENT_RUNTIME_URL.replace(/\/$/, '');
  const target = new URL(`${base}/${path.join('/')}`);
  target.search = new URL(request.url).search;
  return target;
};

const proxyCopilotKitRequest = async (
  request: Request,
  context: RouteContext,
): Promise<Response> => {
  const user = await getCurrentAuthSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getCopilotServerConfig();

  const headers = new Headers(request.headers);
  headers.delete('cookie');
  headers.delete('host');
  headers.delete('content-length');
  headers.delete('x-user-id');
  headers.delete('x-user-name');
  headers.delete('x-agent-user-token');
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));
  headers.set('x-user-id', encodeURIComponent(user.id));
  headers.set('x-user-name', encodeURIComponent(user.name));
  const sessionCookie = getCookieValue(request, AUTH_COOKIE_NAME);

  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  headers.set('x-agent-user-token', sessionCookie);

  if (config.COPILOT_RUNTIME_SECRET) {
    headers.set('authorization', `Bearer ${config.COPILOT_RUNTIME_SECRET}`);
  } else {
    headers.delete('authorization');
  }

  const response = await fetch(await buildTargetUrl(request, context, config), {
    method: request.method,
    headers,
    body: BODYLESS_METHODS.has(request.method)
      ? undefined
      : await request.arrayBuffer(),
    redirect: 'manual',
    cache: 'no-store',
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

export const GET = proxyCopilotKitRequest;
export const POST = proxyCopilotKitRequest;
export const PUT = proxyCopilotKitRequest;
export const PATCH = proxyCopilotKitRequest;
export const DELETE = proxyCopilotKitRequest;
export const OPTIONS = proxyCopilotKitRequest;
