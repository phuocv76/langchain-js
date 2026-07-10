// Libs for third party
import { z } from 'zod';

/**
 * Environment schema for the agent app. Validated once at import time so the
 * process fails fast on misconfiguration.
 *
 * `OPENAI_API_KEY` is optional at this layer so env parsing never blocks boot;
 * the model factory in `models/index.ts` throws a clear, specific error if the
 * key is missing when a graph is actually constructed.
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

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    AGENT_PORT: z.coerce.number().int().positive().default(4000),
    LANGGRAPH_DEPLOYMENT_URL: z.string().url().default('http://localhost:2024'),
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
    /** Shared server-to-server secret used by the Next.js CopilotKit proxy. */
    COPILOT_RUNTIME_SECRET: optionalSecret.pipe(z.string().min(32).optional()),
    /** Server license token from https://dashboard.operations.copilotkit.ai */
    COPILOTKIT_LICENSE_TOKEN: optionalSecret,
    /** Intelligence platform REST API (cloud or self-hosted). */
    INTELLIGENCE_API_URL: z.string().url().optional(),
    /** Intelligence platform WebSocket gateway. */
    INTELLIGENCE_GATEWAY_WS_URL: z.string().url().optional(),
    /** Project-scoped runtime API key (server-side only). */
    INTELLIGENCE_API_KEY: optionalSecret,
    /** Default user id for local Intelligence dev when auth is not wired yet. */
    INTELLIGENCE_DEV_USER_ID: z.string().default('local-dev-user'),
  })
  .superRefine((value, context) => {
    const intelligenceValues = [
      value.INTELLIGENCE_API_URL,
      value.INTELLIGENCE_GATEWAY_WS_URL,
      value.INTELLIGENCE_API_KEY,
    ];
    const configuredCount = intelligenceValues.filter(Boolean).length;

    if (configuredCount > 0 && configuredCount < intelligenceValues.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['INTELLIGENCE_API_URL'],
        message: 'All INTELLIGENCE_* variables must be configured together',
      });
    }

    if (value.NODE_ENV === 'production' && !value.COPILOT_RUNTIME_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COPILOT_RUNTIME_SECRET'],
        message: 'COPILOT_RUNTIME_SECRET is required in production',
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
  throw new Error('Invalid environment configuration for @repo/agent');
}

/** Validated, typed environment. */
export const env: Env = parsed.data;

/** Parsed list of allowed CORS origins. */
export const corsOrigins: string[] = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
