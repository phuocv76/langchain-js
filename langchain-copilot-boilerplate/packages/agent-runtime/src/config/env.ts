// Libs for third party
import { z } from 'zod';

/**
 * Environment schema for the agent app. Validated once at import time so the
 * process fails fast on misconfiguration.
 *
 * `OPENAI_API_KEY` is optional at this layer so env parsing never blocks boot;
 * the model factory in `models/chat-model.ts` throws a clear, specific error
 * if the key is missing when a graph is actually constructed.
 */
const optionalSecret = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().optional(),
);

const isValidOriginList = (value: string): boolean =>
  value.split(',').every((origin) => {
    try {
      new URL(origin.trim());
      return true;
    } catch {
      return false;
    }
  });

/**
 * Infrastructure variables: runtime ports, CORS, model provider, Firebase
 * identity, and worker persistence. Product-agnostic — this fragment moves
 * with the runtime if it is extracted into a package.
 */
const infraEnvSchema = z.object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    AGENT_PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGINS: z
      .string()
      .refine(isValidOriginList, 'Must be a comma-separated list of valid URLs')
      .default('http://localhost:3000'),
    OPENAI_API_KEY: optionalSecret,
    OPENAI_MODEL: z.string().min(1).default('gpt-5.4-mini'),
    /** Lower reasoning effort improves time-to-first-token for chat workloads. */
    OPENAI_REASONING_EFFORT: z.enum(['low', 'medium', 'high']).default('low'),
    /** Caps response length while allowing callers to opt into longer answers. */
    OPENAI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(768),
    /** Bound provider waits so a failed request does not block the chat stream. */
    OPENAI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
    /** One retry keeps transient-error recovery without multiplying latency. */
    OPENAI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(1),
    /**
     * Comma-separated email domains allowed to use the assistant
     * (e.g. "asnet.com.vn"). Empty means every verified account is allowed.
     */
    ALLOWED_EMAIL_DOMAINS: z.string().optional(),
    /**
     * Firebase project that issued the web client's ID tokens. Required for
     * `/copilotkit` and `/memory` — the BFF verifies Bearer tokens with Google
     * JWKS (no Admin private key). Must match VITE_FIREBASE_PROJECT_ID.
     */
    FIREBASE_PROJECT_ID: z.string().min(1).optional(),
    /** Memory worker endpoint; a bare URL is enough for local `wrangler dev`. */
    MEMORY_WORKER_URL: z.string().url().optional(),
    /** Cloudflare Access service token pair, required only for deployed workers. */
    CF_ACCESS_CLIENT_ID: optionalSecret,
    CF_ACCESS_CLIENT_SECRET: optionalSecret,
    /**
     * Realtime worker base URL (no trailing path). Leave unset to skip
     * cross-session push (NoopRealtimePublisher).
     */
    REALTIME_WORKER_URL: z.string().url().optional(),
    /** Shared secret for POST /publish on the realtime worker. */
    REALTIME_PUBLISH_SECRET: optionalSecret,
    /** Optional CopilotKit license token for gated runtime features. */
    COPILOTKIT_LICENSE_TOKEN: optionalSecret,
    /** Optional LangSmith API key (tracing / Studio). */
    LANGSMITH_API_KEY: optionalSecret,
});

export const envSchema = infraEnvSchema
  .superRefine((value, context) => {
    const accessValues = [value.CF_ACCESS_CLIENT_ID, value.CF_ACCESS_CLIENT_SECRET];
    const accessConfiguredCount = accessValues.filter(Boolean).length;

    if (accessConfiguredCount === 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CF_ACCESS_CLIENT_ID'],
        message:
          'CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET must be configured together',
      });
    }

    if (accessConfiguredCount > 0 && !value.MEMORY_WORKER_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MEMORY_WORKER_URL'],
        message:
          'CF_ACCESS_CLIENT_ID/CF_ACCESS_CLIENT_SECRET require MEMORY_WORKER_URL',
      });
    }

    const realtimeValues = [value.REALTIME_WORKER_URL, value.REALTIME_PUBLISH_SECRET];
    const realtimeConfiguredCount = realtimeValues.filter(Boolean).length;
    if (realtimeConfiguredCount === 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REALTIME_WORKER_URL'],
        message:
          'REALTIME_WORKER_URL and REALTIME_PUBLISH_SECRET must be configured together',
      });
    }
  });

/** Type of the validated environment. */
export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    'Invalid environment variables:',
    parsed.error.flatten().fieldErrors,
  );
  throw new Error('Invalid environment configuration for @repo/agent-runtime');
}

/** Validated, typed environment. */
export const env: Env = parsed.data;

/** Parsed list of allowed CORS origins. */
export const corsOrigins: string[] = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/** Parsed, lowercased list of email domains allowed to use the assistant. */
export const allowedEmailDomains: string[] = (env.ALLOWED_EMAIL_DOMAINS ?? '')
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);
