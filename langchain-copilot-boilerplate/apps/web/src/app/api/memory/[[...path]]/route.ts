import { NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME } from '@/lib/auth/constants';
import { getCurrentAuthSession } from '@/lib/auth/server-session';
import { getCopilotServerConfig } from '@/lib/copilot/server-config';

type RouteContext = {
  readonly params: Promise<{ readonly path?: readonly string[] }>;
};

const getCookieValue = (request: Request, name: string): string | undefined =>
  request.headers
    .get('cookie')
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);

/** Proxies authenticated custom-history requests to the agent memory API. */
const proxyMemoryRequest = async (
  request: Request,
  context: RouteContext,
): Promise<Response> => {
  if (!(await getCurrentAuthSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sessionCookie = getCookieValue(request, AUTH_COOKIE_NAME);
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getCopilotServerConfig();
  const target = new URL(config.COPILOT_AGENT_RUNTIME_URL);
  const { path = [] } = await context.params;
  target.pathname = `/memory/${path.join('/')}`;
  target.search = new URL(request.url).search;
  const headers = new Headers();
  headers.set('x-agent-user-token', sessionCookie);
  if (config.COPILOT_RUNTIME_SECRET) {
    headers.set('authorization', `Bearer ${config.COPILOT_RUNTIME_SECRET}`);
  }

  const response = await fetch(target, {
    method: request.method,
    headers,
    cache: 'no-store',
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

export const GET = proxyMemoryRequest;
