// Libs for third party
import { z } from 'zod';

// Internal
import { env as infraEnv } from '@repo/agent-runtime';

/**
 * Product environment fragment. Infrastructure variables (ports, Firebase,
 * workers, model provider) are owned and validated by `@repo/agent-runtime`;
 * this file only adds the product's own variables and re-exposes one merged
 * `env` — every product module imports from here, never from the runtime.
 *
 * Empty in the skeleton. When the kitchen API arrives, add its variables
 * the way the space product does (apps/space-agent/src/config/env.ts):
 *
 *   API_BASE_URL: z.string().url().optional(),
 *   API_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
 */
export const productEnvSchema = z.object({});

const parsed = productEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    'Invalid environment variables:',
    parsed.error.flatten().fieldErrors,
  );
  throw new Error('Invalid environment configuration for @repo/kitchen-agent');
}

/** Validated environment: runtime infra fragment plus product fragment. */
export const env = { ...infraEnv, ...parsed.data };

export type Env = typeof env;
