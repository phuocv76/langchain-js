// Libs for third party
import { createEmbedServer } from '@langchain/langgraph-api/experimental/embed';
import { Hono } from 'hono';

// Internal
import { AGENT_CLAIM_HEADERS, AGENT_CLAIM_PREFIX } from '@repo/shared';
import { identityFromRequest } from '../middleware/agent-user-auth.js';
import { runWithCheckpointUser } from './checkpoint-user-context.js';

type EmbedServerOptions = Parameters<typeof createEmbedServer>[0];
export type EmbedGraphs = EmbedServerOptions['graph'];

export interface EmbedAppOptions {
  /** Graphs to serve, keyed by graph id. */
  readonly graphs: EmbedGraphs;
  readonly checkpointer: EmbedServerOptions['checkpointer'];
  readonly threads: EmbedServerOptions['threads'];
}

/** Structural view of a compiled graph for the assistants shim. */
type DrawableGraph = {
  getGraphAsync: () => Promise<{ toJSON: () => unknown }>;
};

/** Endpoints whose JSON body carries the config the graph will run under. */
const RUN_CREATE_PATH = /\/runs(\/(stream|wait|batch))?$/;

/**
 * Rewrites a run-creation body so its `config.configurable` carries the
 * verified identity claims — and only those.
 *
 * Two facts force this: the embed server builds the run config solely from
 * the request body and never copies request headers into configurable
 * (unlike the full LangGraph server), and the stock LangGraphAgent adapter
 * filters custom configurable keys out of its run payload. Without this
 * rewrite the graph runs with no trusted identity, so durable memory and
 * product-API tools cannot act as the user.
 *
 * Client-supplied `x-agent-*` keys are always dropped first: the run config
 * feeds tenant scoping (D1 checkpoints, transcripts), so identity must come
 * from the verified headers, never from a request body.
 *
 * @returns The rewritten JSON body, or undefined when the body is not JSON.
 */
const withVerifiedRunClaims = (
  bodyText: string,
  headers: Headers,
): string | undefined => {
  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return undefined;
  }
  if (typeof payload !== 'object' || payload === null) return undefined;

  const body = payload as {
    config?: { configurable?: Record<string, unknown> };
  };
  const configurable = { ...(body.config?.configurable ?? {}) };
  for (const key of Object.keys(configurable)) {
    if (key.startsWith(AGENT_CLAIM_PREFIX)) delete configurable[key];
  }
  for (const key of AGENT_CLAIM_HEADERS) {
    const value = headers.get(key);
    if (value) configurable[key] = value;
  }

  return JSON.stringify({
    ...body,
    config: { ...(body.config ?? {}), configurable },
  });
};

/**
 * Minimal assistants surface for the CopilotKit LangGraph adapter — the
 * embed server registers no `/assistants/*` routes. Static metadata only:
 * `config` must be an object (the adapter dereferences `.configurable` on
 * it), and the graph JSON feeds the adapter's node-name filtering.
 */
const buildAssistantsShim = (graphs: EmbedGraphs): Hono => {
  const shim = new Hono();

  shim.post('/assistants/search', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      graph_id?: string;
    };
    const ids = body.graph_id ? [body.graph_id] : Object.keys(graphs);
    return c.json(
      ids
        .filter((id) => id in graphs)
        .map((id) => ({
          assistant_id: id,
          graph_id: id,
          name: id,
          config: {},
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
        })),
    );
  });

  shim.get('/assistants/:assistant_id/graph', async (c) => {
    const target = graphs[c.req.param('assistant_id')] as
      | DrawableGraph
      | undefined;
    if (!target) return c.json({ error: 'Assistant not found' }, 404);
    const drawable = await target.getGraphAsync();
    return c.json(drawable.toJSON());
  });

  // The adapter falls back to constant schema keys when schemas are absent.
  shim.get('/assistants/:assistant_id/schemas', (c) =>
    c.json({
      graph_id: c.req.param('assistant_id'),
      input_schema: null,
      output_schema: null,
      state_schema: null,
      config_schema: null,
    }),
  );

  return shim;
};

/**
 * Builds the embedded LangGraph platform app: threads/runs routes over the
 * injected graphs and persistence. Graph wiring is the caller's job — this
 * module owns only the mechanism (see `graphs/registry.ts` for the product
 * wiring).
 *
 * Must be mounted behind `requireAgentUser`: every route runs inside the
 * verified user's AsyncLocalStorage context so the injected savers can
 * resolve the tenant even for configs LangGraph synthesizes without identity
 * claims (`getState`, resume-at-head walks), and run-creation bodies are
 * rewritten to carry the verified claims.
 */
export const createLangGraphEmbedApp = ({
  graphs,
  checkpointer,
  threads,
}: EmbedAppOptions): Hono => {
  const embed = createEmbedServer({
    graph: graphs,
    checkpointer,
    threads,
  });

  const app = new Hono();
  app.use('*', (c, next) => {
    const user = identityFromRequest(c.req.raw);
    return runWithCheckpointUser(user.userId, next);
  });
  app.route('/', buildAssistantsShim(graphs));
  // Manual dispatch into the embed app (instead of `app.route`) so the
  // request body can be rewritten with the verified claims. The mount
  // prefix (e.g. `/langgraph` on the BFF) must be stripped first — the
  // embed app routes from `/`.
  app.all('*', async (c) => {
    const raw = c.req.raw;
    const url = new URL(raw.url);
    const prefix = c.req.routePath.replace(/\/\*$/, '');
    if (prefix && url.pathname.startsWith(prefix)) {
      url.pathname = url.pathname.slice(prefix.length) || '/';
    }

    const headers = new Headers(raw.headers);
    if (raw.method === 'GET' || raw.method === 'HEAD') {
      return embed.fetch(new Request(url, { method: raw.method, headers }));
    }

    let body = await raw.text();
    if (raw.method === 'POST' && RUN_CREATE_PATH.test(url.pathname)) {
      body = withVerifiedRunClaims(body, raw.headers) ?? body;
    }
    headers.delete('content-length');
    return embed.fetch(
      new Request(url, { method: raw.method, headers, body }),
    );
  });
  return app;
};
