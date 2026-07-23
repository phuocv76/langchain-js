// Libs for third party
import { z } from 'zod';

// Internal
import { env as infraEnv } from '@repo/agent-runtime';

/**
 * Product environment fragment: the workspace REST API the agent tools call.
 * Infrastructure variables (ports, Firebase, workers, model provider) are
 * owned and validated by `@repo/agent-runtime`; this file only adds the
 * product's own variables and re-exposes one merged `env`.
 */
export const productEnvSchema = z.object({
  /** Base URL of the existing product REST API that agent tools call. */
  API_BASE_URL: z.string().url().optional(),
  /** Bound external API waits so a slow endpoint cannot stall a chat run. */
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

const parsed = productEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    'Invalid environment variables:',
    parsed.error.flatten().fieldErrors,
  );
  throw new Error('Invalid environment configuration for @repo/space-agent');
}

/** Validated environment: runtime infra fragment plus product fragment. */
export const env = { ...infraEnv, ...parsed.data };

export type Env = typeof env;
