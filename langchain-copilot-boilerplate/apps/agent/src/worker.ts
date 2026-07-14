import { app } from '@agent/app.js';
import { handleMemoryRequest, type MemoryBindings } from '@agent/memory/store.js';

interface WorkerEnv extends MemoryBindings {
  readonly MEMORY_INTERNAL_SECRET: string;
}

const internalPrefix = '/internal/memory';

/**
 * Cloudflare Worker entry point. Memory is deliberately handled before Hono so
 * its D1, Vectorize, and Workers AI bindings never cross a network boundary.
 */
export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === internalPrefix || url.pathname.startsWith(`${internalPrefix}/`)) {
      if (!env.MEMORY_INTERNAL_SECRET || request.headers.get('x-memory-internal-secret') !== env.MEMORY_INTERNAL_SECRET) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const pathname = url.pathname.slice(internalPrefix.length) || '/';
      return handleMemoryRequest(request, env, pathname);
    }
    return app.fetch(request, env);
  },
} satisfies ExportedHandler<WorkerEnv>;
