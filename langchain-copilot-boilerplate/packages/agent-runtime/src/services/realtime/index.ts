import { env } from '../../config/env.js';
import { CloudflareRealtimePublisher } from './cloudflare-publisher.js';
import { NoopRealtimePublisher } from './noop-publisher.js';
import type {
  RealtimePublishRequest,
  RealtimeEvent,
  RealtimePublisher,
} from './types.js';

export type { RealtimePublishRequest, RealtimeEvent, RealtimePublisher };

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
  request: RealtimePublishRequest,
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
