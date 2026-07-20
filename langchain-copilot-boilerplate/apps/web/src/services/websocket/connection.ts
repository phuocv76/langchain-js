import { parseRealtimeEvent, type RealtimeEvent } from './events';
import { ReconnectScheduler } from './reconnect';

export type RealtimeConnectionOptions = {
  readonly url: string;
  readonly getToken: () => string | null;
  readonly onEvent: (event: RealtimeEvent) => void;
  readonly onStatus?: (status: 'connecting' | 'open' | 'closed') => void;
};

/**
 * Authenticated WebSocket connection with heartbeat + auto-reconnect.
 *
 * Native browser WebSockets cannot set Authorization headers, so the Firebase
 * ID token is passed as `?token=` (the worker also accepts Bearer).
 */
export class RealtimeConnection {
  private socket: WebSocket | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private readonly reconnect = new ReconnectScheduler();
  private stopped = true;

  constructor(private readonly options: RealtimeConnectionOptions) {}

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.reconnect.clear();
    this.clearHeartbeat();
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
      this.socket = undefined;
    }
    this.options.onStatus?.('closed');
  }

  /** Call when the Firebase ID token rotates so the next reconnect is fresh. */
  refreshAuth(): void {
    if (this.stopped) return;
    this.reconnect.reset();
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(4000, 'token refresh');
    } else {
      this.connect();
    }
  }

  private connect(): void {
    if (this.stopped) return;
    const token = this.options.getToken();
    if (!token) {
      this.options.onStatus?.('closed');
      return;
    }

    this.clearHeartbeat();
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = undefined;
    }

    this.options.onStatus?.('connecting');
    const url = new URL(this.options.url);
    url.searchParams.set('token', token);

    const socket = new WebSocket(url.toString());
    this.socket = socket;

    socket.onopen = () => {
      this.reconnect.reset();
      this.options.onStatus?.('open');
      this.heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send('ping');
        }
      }, 25_000);
    };

    socket.onmessage = (message) => {
      if (typeof message.data !== 'string') return;
      if (message.data === 'pong') return;
      const event = parseRealtimeEvent(message.data);
      if (event) this.options.onEvent(event);
    };

    socket.onerror = () => {
      // onclose follows; reconnect is scheduled there.
    };

    socket.onclose = () => {
      this.clearHeartbeat();
      this.socket = undefined;
      this.options.onStatus?.('closed');
      if (!this.stopped) {
        this.reconnect.schedule(() => this.connect());
      }
    };
  }

  private clearHeartbeat(): void {
    if (this.heartbeat !== undefined) {
      clearInterval(this.heartbeat);
      this.heartbeat = undefined;
    }
  }
}
