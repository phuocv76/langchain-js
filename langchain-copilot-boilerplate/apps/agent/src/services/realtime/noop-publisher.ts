import type { PublishRequest, RealtimePublisher } from '@agent/services/realtime/types.js';

/** Used when REALTIME_WORKER_URL / secret are unset (local without the worker). */
export class NoopRealtimePublisher implements RealtimePublisher {
  async publish(_request: PublishRequest): Promise<void> {
    // intentionally no-op
  }
}
