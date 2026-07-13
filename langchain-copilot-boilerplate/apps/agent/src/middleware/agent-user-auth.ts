// Libs for Node
import { randomUUID } from 'node:crypto';

// Libs for third party
import type { MiddlewareHandler } from 'hono';

// Internal
import {
  getFirebaseAdminAuth,
  isFirebaseAdminConfigured,
} from '@agent/config/firebase.js';

export interface AgentUserContext {
  readonly requestId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly roles: readonly string[];
}

const readRoles = (value: unknown): readonly string[] | undefined =>
  Array.isArray(value) && value.every((role) => typeof role === 'string')
    ? value
    : undefined;

/**
 * Verifies the server-forwarded Firebase session cookie and replaces it with
 * sanitized, non-secret identity headers for downstream graph transport.
 */
export const requireAgentUser: MiddlewareHandler = async (context, next) => {
  if (!isFirebaseAdminConfigured()) {
    return context.json(
      { ok: false, error: 'Agent Firebase authentication is not configured' },
      503,
    );
  }

  const sessionCookie = context.req.header('x-agent-user-token');
  if (!sessionCookie) {
    return context.json({ ok: false, error: 'Unauthorized' }, 401);
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(
      sessionCookie,
      true,
    );
    const tenantId = decoded.tenant_id;
    const roles = readRoles(decoded.roles);

    if (typeof tenantId !== 'string' || !tenantId || !roles) {
      return context.json(
        { ok: false, error: 'Required tenant_id or roles claims are missing' },
        403,
      );
    }

    const user: AgentUserContext = {
      requestId: context.req.header('x-request-id') ?? randomUUID(),
      userId: decoded.uid,
      tenantId,
      roles,
    };
    const headers = context.req.raw.headers;
    headers.delete('x-agent-user-token');
    headers.set('x-agent-request-id', user.requestId);
    headers.set('x-agent-user-id', user.userId);
    headers.set('x-agent-tenant-id', user.tenantId);
    headers.set('x-agent-roles', encodeURIComponent(JSON.stringify(user.roles)));
    context.set('agentUser', user);
    await next();
  } catch {
    return context.json({ ok: false, error: 'Unauthorized' }, 401);
  }
};
