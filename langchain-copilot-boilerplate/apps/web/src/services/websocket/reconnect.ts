export type ReconnectOptions = {
  readonly initialDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly factor?: number;
};

/**
 * Exponential backoff with jitter for WebSocket reconnect attempts.
 */
export class ReconnectScheduler {
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly factor: number;

  constructor(options: ReconnectOptions = {}) {
    this.initialDelayMs = options.initialDelayMs ?? 500;
    this.maxDelayMs = options.maxDelayMs ?? 15_000;
    this.factor = options.factor ?? 1.8;
  }

  schedule(callback: () => void): void {
    this.clear();
    const exp = Math.min(
      this.maxDelayMs,
      this.initialDelayMs * this.factor ** this.attempt,
    );
    const jitter = exp * (0.2 * Math.random());
    const delay = Math.round(exp + jitter);
    this.attempt += 1;
    this.timer = setTimeout(callback, delay);
  }

  reset(): void {
    this.attempt = 0;
    this.clear();
  }

  clear(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}
