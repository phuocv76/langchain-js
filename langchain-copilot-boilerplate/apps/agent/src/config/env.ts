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
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  AGENT_PORT: z.coerce.number().int().positive().default(4000),
  LANGGRAPH_DEPLOYMENT_URL: z
    .string()
    .url()
    .default('http://localhost:2024'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  /** Server license token from https://dashboard.operations.copilotkit.ai */
  COPILOTKIT_LICENSE_TOKEN: z.string().optional(),
  /** Intelligence platform REST API (cloud or self-hosted). */
  INTELLIGENCE_API_URL: z.string().url().optional(),
  /** Intelligence platform WebSocket gateway. */
  INTELLIGENCE_GATEWAY_WS_URL: z.string().optional(),
  /** Project-scoped runtime API key (server-side only). */
  INTELLIGENCE_API_KEY: z.string().optional(),
  /** Default user id for local Intelligence dev when auth is not wired yet. */
  INTELLIGENCE_DEV_USER_ID: z.string().default('local-dev-user'),
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
