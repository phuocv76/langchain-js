// Libs for Node
import { randomUUID } from 'node:crypto';

// Libs for third party
import type { MiddlewareHandler } from 'hono';

// Internal
import { allowedEmailDomains } from '@agent/config/env.js';
import {
  getFirebaseAdminAuth,
  isFirebaseAdminConfigured,
} from '@agent/config/firebase.js';

export interface AgentUserContext {
  readonly requestId: string;
  readonly userId: string;
  /** Verified email — the product API keys users by it. */
  readonly email: string;
  readonly roles: readonly string[];
}

/** Extracts the token from an `Authorization: Bearer <token>` header value. */
export const readBearerToken = (
  authorization: string | undefined,
): string | undefined => {
  if (!authorization) return undefined;
  const [scheme, token, ...rest] = authorization.trim().split(/\s+/);
  return scheme?.toLowerCase() === 'bearer' && token && rest.length === 0
    ? token
    : undefined;
};

export const readRoles = (value: unknown): readonly string[] | undefined =>
  Array.isArray(value) && value.every((role) => typeof role === 'string')
    ? value
    : undefined;

/**
 * Restricts access to the configured email domains.
 *
 * The email must be verified: with providers like email/password anyone can
 * register an address on an allowed domain without owning it, so an
 * unverified email proves nothing.
 */
export const isAllowedEmail = (
  email: string | undefined,
  emailVerified: boolean | undefined,
  domains: readonly string[],
): boolean => {
  if (domains.length === 0) return true;
  if (!email || emailVerified !== true) return false;
  const domain = email.split('@').pop()?.toLowerCase();
  return Boolean(domain && domains.includes(domain));
};

/**
 * Verifies the caller's Firebase ID token (sent by the chat frontend as
 * `Authorization: Bearer`) and replaces it with sanitized, non-secret identity
 * headers for downstream graph transport. The raw credential never travels
 * past this middleware.
 */
export const requireAgentUser: MiddlewareHandler = async (context, next) => {
  // Mounted on both '/x' and '/x/*', which can both match the same request.
  // The first pass verified the token and deleted the credential header, so a
  // second pass must pass through instead of failing on the missing header.
  if (context.get('agentUser')) {
    return next();
  }

  if (!isFirebaseAdminConfigured()) {
    return context.json(
      { ok: false, error: 'Agent Firebase authentication is not configured' },
      503,
    );
  }

  const idToken = readBearerToken(context.req.header('authorization'));
  if (!idToken) {
    return context.json({ ok: false, error: 'Unauthorized' }, 401);
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken, true);

    // The email also identifies the user toward the product API, so an
    // account without one cannot act anywhere downstream.
    if (
      !decoded.email ||
      !isAllowedEmail(decoded.email, decoded.email_verified, allowedEmailDomains)
    ) {
      return context.json(
        { ok: false, error: 'This account is not allowed to use the assistant' },
        403,
      );
    }

    const user: AgentUserContext = {
      requestId: context.req.header('x-request-id') ?? randomUUID(),
      userId: decoded.uid,
      email: decoded.email,
      roles: readRoles(decoded.roles) ?? [],
    };
    const headers = context.req.raw.headers;
    headers.delete('authorization');
    headers.set('x-agent-request-id', user.requestId);
    headers.set('x-agent-user-id', user.userId);
    headers.set('x-agent-user-email', user.email);
    headers.set('x-agent-roles', encodeURIComponent(JSON.stringify(user.roles)));
    context.set('agentUser', user);
    await next();
  } catch (error) {
    // Log the verification failure reason (never the token) — otherwise a
    // misconfigured Firebase project is indistinguishable from a bad token.
    console.error(
      '[agent-user-auth] ID token verification failed:',
      error instanceof Error ? error.message : error,
    );
    return context.json({ ok: false, error: 'Unauthorized' }, 401);
  }
};
