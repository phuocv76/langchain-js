// Libs for Node
import { randomUUID } from 'node:crypto';

// Libs for third party
import type { MiddlewareHandler } from 'hono';

// Internal
import {
  AGENT_HEADER_ACCESS_TOKEN,
  AGENT_HEADER_REQUEST_ID,
  AGENT_HEADER_ROLES,
  AGENT_HEADER_USER_EMAIL,
  AGENT_HEADER_USER_ID,
  type AgentRunIdentity,
  type AgentUserContext,
} from '@repo/shared';
import { allowedEmailDomains, env } from '../config/env.js';
import {
  FirebaseAuthError,
  verifyFirebaseIdToken,
} from '../services/firebase-auth.js';

export type { AgentRunIdentity, AgentUserContext };

/**
 * Reads the sanitized identity headers set by `requireAgentUser`. Throws when
 * any claim is missing — the CopilotKit factory must never invent a user.
 */
export const identityFromRequest = (request: Request): AgentRunIdentity => {
  const requestId = request.headers.get(AGENT_HEADER_REQUEST_ID);
  const userId = request.headers.get(AGENT_HEADER_USER_ID);
  const email = request.headers.get(AGENT_HEADER_USER_EMAIL);
  const rolesHeader = request.headers.get(AGENT_HEADER_ROLES);
  const accessToken = request.headers.get(AGENT_HEADER_ACCESS_TOKEN);
  if (!requestId || !userId || !email || !rolesHeader || !accessToken) {
    throw new Error('Verified agent user context is missing from the request');
  }
  let roles: unknown;
  try {
    roles = JSON.parse(decodeURIComponent(rolesHeader));
  } catch {
    throw new Error('Verified agent roles header is invalid');
  }
  const parsedRoles = readRoles(roles);
  if (!parsedRoles) {
    throw new Error('Verified agent roles header is invalid');
  }
  return { requestId, userId, email, roles: parsedRoles, accessToken };
};

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
 * `Authorization: Bearer`) and replaces it with sanitized identity headers
 * for downstream graph transport. The verified token is also forwarded as
 * `x-agent-access-token` so product-API tools can authenticate as the user.
 */
export const requireAgentUser: MiddlewareHandler = async (context, next) => {
  // Mounted on both '/x' and '/x/*', which can both match the same request.
  // The first pass verified the token and deleted the credential header, so a
  // second pass must pass through instead of failing on the missing header.
  if (context.get('agentUser')) {
    return next();
  }

  if (!env.FIREBASE_PROJECT_ID) {
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
    const decoded = await verifyFirebaseIdToken(
      idToken,
      env.FIREBASE_PROJECT_ID,
    );

    // The email also identifies the user toward the product API, so an
    // account without one cannot act anywhere downstream.
    if (
      !isAllowedEmail(
        decoded.email,
        decoded.emailVerified,
        allowedEmailDomains,
      )
    ) {
      return context.json(
        { ok: false, error: 'This account is not allowed to use the assistant' },
        403,
      );
    }

    const user: AgentUserContext = {
      requestId: context.req.header('x-request-id') ?? randomUUID(),
      userId: decoded.userId,
      email: decoded.email,
      roles: readRoles(decoded.roles) ?? [],
    };
    const headers = context.req.raw.headers;
    // Drop the inbound Authorization and replace with sanitized claims. Keep
    // the verified ID token under a dedicated header so product-API tools can
    // present it as Bearer without putting credentials into graph state.
    headers.delete('authorization');
    headers.set(AGENT_HEADER_REQUEST_ID, user.requestId);
    headers.set(AGENT_HEADER_USER_ID, user.userId);
    headers.set(AGENT_HEADER_USER_EMAIL, user.email);
    headers.set(AGENT_HEADER_ROLES, encodeURIComponent(JSON.stringify(user.roles)));
    headers.set(AGENT_HEADER_ACCESS_TOKEN, idToken);
    context.set('agentUser', user);
    await next();
  } catch (error) {
    if (error instanceof FirebaseAuthError) {
      const status = error.status === 503 ? 503 : 401;
      return context.json({ ok: false, error: error.message }, status);
    }
    // Log the verification failure reason (never the token) — otherwise a
    // misconfigured Firebase project is indistinguishable from a bad token.
    console.error(
      '[agent-user-auth] ID token verification failed:',
      error instanceof Error ? error.message : error,
    );
    return context.json({ ok: false, error: 'Unauthorized' }, 401);
  }
};
