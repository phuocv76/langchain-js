/** Minimal structured logger; swap for pino/winston as the app grows. */
export const logger = {
  info: (message: string, meta?: unknown): void => {
    console.log(`[info] ${message}`, meta ?? '');
  },
  warn: (message: string, meta?: unknown): void => {
    console.warn(`[warn] ${message}`, meta ?? '');
  },
  error: (message: string, meta?: unknown): void => {
    console.error(`[error] ${message}`, meta ?? '');
  },
};
