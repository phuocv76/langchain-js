import 'server-only';

import { z } from 'zod';

const serverConfigSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    COPILOT_AGENT_RUNTIME_URL: z
      .string()
      .url()
      .default('http://localhost:4000/copilotkit'),
    COPILOT_RUNTIME_SECRET: z.string().min(32).optional(),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && !value.COPILOT_RUNTIME_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COPILOT_RUNTIME_SECRET'],
        message: 'COPILOT_RUNTIME_SECRET is required in production',
      });
    }
  });

export type CopilotServerConfig = z.infer<typeof serverConfigSchema>;

/** Validates lazily so production builds do not require runtime-only secrets. */
export const getCopilotServerConfig = (): CopilotServerConfig => {
  const parsed = serverConfigSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      `Invalid @repo/web server environment: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')}`,
    );
  }

  return parsed.data;
};
