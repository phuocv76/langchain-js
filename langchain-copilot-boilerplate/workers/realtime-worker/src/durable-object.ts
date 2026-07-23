import type { RealtimeEvent } from './types';

/**
 * Durable Object: one instance per authenticated user (idFromName(userId)).
 * Holds all live WebSocket sessions for that user and fan-outs publish events.
 */
export class UserHub implements DurableObject {
  private readonly sessions = new Set<WebSocket>();

  constructor(
    private readonly ctx: DurableObjectState,
    _env: unknown,
  ) {
    // Restore hibernated sockets after the DO wakes.
    for (const socket of this.ctx.getWebSockets()) {
      this.sessions.add(socket);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/connect' && request.headers.get('Upgrade') === 'websocket') {
      return this.handleConnect();
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      return this.handleBroadcast(request);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  private handleConnect(): Response {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);
    this.sessions.add(server);

    server.send(
      JSON.stringify({
        type: 'CONNECTED',
        updatedAt: new Date().toISOString(),
      }),
    );

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'websocket_connected',
        sessions: this.sessions.size,
      }),
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const body: unknown = await request.json().catch(() => undefined);
    if (!body || typeof body !== 'object' || !('event' in body)) {
      return Response.json({ error: 'Invalid broadcast payload' }, { status: 400 });
    }

    const event = (body as { event: RealtimeEvent }).event;
    const payload = JSON.stringify(event);
    let delivered = 0;
    const sockets = this.ctx.getWebSockets();

    for (const socket of sockets) {
      try {
        socket.send(payload);
        delivered += 1;
        this.sessions.add(socket);
      } catch {
        this.sessions.delete(socket);
        try {
          socket.close(1011, 'send failed');
        } catch {
          // already closed
        }
      }
    }

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'broadcast',
        type: event.type,
        threadId: event.threadId,
        delivered,
        sessions: sockets.length,
      }),
    );

    return Response.json({ ok: true, delivered });
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): void {
    // Client heartbeat: respond to ping frames / text "ping".
    if (typeof message === 'string' && message === 'ping') {
      try {
        socket.send('pong');
      } catch {
        this.sessions.delete(socket);
      }
    }
  }

  webSocketClose(
    socket: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): void {
    this.sessions.delete(socket);
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'websocket_closed',
        code,
        reason,
        wasClean,
        sessions: this.sessions.size,
      }),
    );
  }

  webSocketError(socket: WebSocket, error: unknown): void {
    this.sessions.delete(socket);
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'websocket_error',
        error: error instanceof Error ? error.message : 'unknown',
        sessions: this.sessions.size,
      }),
    );
  }
}
