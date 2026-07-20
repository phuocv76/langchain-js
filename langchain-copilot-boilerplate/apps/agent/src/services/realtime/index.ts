import { env } from '@agent/config/env.js';
import { CloudflareRealtimePublisher } from '@agent/services/realtime/cloudflare-publisher.js';
import { NoopRealtimePublisher } from '@agent/services/realtime/noop-publisher.js';
import type {
  PublishRequest,
  RealtimeEvent,
  RealtimePublisher,
} from '@agent/services/realtime/types.js';

export type { PublishRequest, RealtimeEvent, RealtimePublisher };

const createPublisher = (): RealtimePublisher => {
  if (env.REALTIME_WORKER_URL && env.REALTIME_PUBLISH_SECRET) {
    return new CloudflareRealtimePublisher();
  }
  return new NoopRealtimePublisher();
};

const publisher: RealtimePublisher = createPublisher();

/**
 * Best-effort fan-out: never fails the calling mutation path.
 */
export const publishRealtimeEvent = async (
  request: PublishRequest,
): Promise<void> => {
  try {
    await publisher.publish(request);
  } catch (error) {
    console.warn(
      '[realtime] publish failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
  }
};

export const nowIso = (): string => new Date().toISOString();
