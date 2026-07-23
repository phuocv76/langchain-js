import type { RealtimePublishRequest, RealtimePublisher } from './types.js';

/** Used when REALTIME_WORKER_URL / secret are unset (local without the worker). */
export class NoopRealtimePublisher implements RealtimePublisher {
  async publish(_request: RealtimePublishRequest): Promise<void> {
    // intentionally no-op
  }
}
