// Libs for third party
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie } from 'hono/cookie';

// Internal
import { API_MESSAGES } from '../constants/messages.js';
import { userResponseBody, type User } from '../domain/user.js';
import {
  ensureKnowledgeBaseSeeded,
  findRelevantContent,
  ingestKnowledgeContent,
  queryUserInfoFromVectorStore,
} from '../rag/operations.js';
import type { AppStores } from '../stores/types.js';

export type CreateAppOptions = {
  stores: AppStores;
  corsOrigins: string[];
  readOpenAiKey: () => string | null;
};

/** Builds the shared user-management REST API (SQLite or D1). */
export const createApp = ({
  stores,
  corsOrigins,
  readOpenAiKey,
}: CreateAppOptions): Hono => {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );

  const resolveUser = async (c: {
    req: { header: (name: string) => string | undefined };
  }): Promise<User | null> => {
    const sessionId = getCookie(c as never, 'session');
    if (sessionId) {
      return stores.users.getUserForSession(sessionId);
    }

    const devUserId = c.req.header('x-dev-user-id');
    if (devUserId) {
      return stores.users.getUser(devUserId);
    }

    return null;
  };

  const requireAdmin = (user: User | null): user is User =>
    Boolean(user && user.role === 'admin');

  app.post('/api/auth/login', async (c) => {
    const body = (await c.req.json()) as {
      email?: string;
      password?: string;
    };
    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const record = await stores.users.getUserWithSecret(email);
    if (
      !record ||
      !(await stores.users.verifyPassword(password, record.password))
    ) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }
    if (record.status !== 'active') {
      return c.json({ error: 'Account is inactive' }, 403);
    }

    const sessionId = await stores.users.createSession(record.id);
    setCookie(c, 'session', sessionId, {
      httpOnly: true,
      path: '/',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({ user: userResponseBody(record) });
  });

  app.post('/api/auth/logout', async (c) => {
    const sessionId = getCookie(c, 'session');
    if (sessionId) {
      await stores.users.deleteSession(sessionId);
    }
    setCookie(c, 'session', '', { path: '/', maxAge: 0 });
    return c.json({ ok: true });
  });

  app.get('/api/auth/me', async (c) => {
    const user = await resolveUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    return c.json({ user: userResponseBody(user) });
  });

  app.get('/api/users', async (c) => {
    const user = await resolveUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const users = (await stores.users.listUsers()).map(userResponseBody);
    return c.json({ users });
  });

  app.get('/api/users/by-email/:email', async (c) => {
    const user = await resolveUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const target = await stores.users.getUserByEmail(c.req.param('email'));
    if (!target) {
      return c.json({ error: 'Not found' }, 404);
    }
    return c.json({ user: userResponseBody(target) });
  });

  app.get('/api/users/shared-display-name', async (c) => {
    const user = await resolveUser(c);
    if (!requireAdmin(user)) {
      return c.json({ error: API_MESSAGES.FORBIDDEN }, 403);
    }
    const name = c.req.query('name')?.trim();
    if (!name) {
      return c.json({ error: API_MESSAGES.INVALID_INPUT }, 400);
    }
    const matches = (
      await stores.users.listUsersSharingDisplayNameKey(name)
    ).map(userResponseBody);
    return c.json({ matches });
  });

  app.get('/api/users/:id', async (c) => {
    const user = await resolveUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const target = await stores.users.getUser(c.req.param('id'));
    if (!target) {
      return c.json({ error: 'Not found' }, 404);
    }
    return c.json({ user: userResponseBody(target) });
  });

  app.post('/api/users', async (c) => {
    const user = await resolveUser(c);
    if (!requireAdmin(user)) {
      return c.json({ error: API_MESSAGES.FORBIDDEN }, 403);
    }
    const body = (await c.req.json()) as {
      name?: string;
      email?: string;
      date_of_birth?: string;
      bio?: string;
    };
    if (
      !body.name?.trim() ||
      !body.email?.trim() ||
      !body.date_of_birth?.trim()
    ) {
      return c.json({ error: API_MESSAGES.INVALID_INPUT }, 400);
    }
    try {
      const created = await stores.users.createUser({
        name: body.name,
        email: body.email,
        date_of_birth: body.date_of_birth,
        bio: body.bio,
      });
      return c.json({ user: userResponseBody(created) });
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Create failed' },
        400,
      );
    }
  });

  app.patch('/api/users/me', async (c) => {
    const user = await resolveUser(c);
    if (!user) {
      return c.json({ error: API_MESSAGES.UNAUTHORIZED }, 401);
    }
    const body = (await c.req.json()) as {
      name?: string;
      date_of_birth?: string | null;
      bio?: string | null;
    };
    const updated = await stores.users.updateMemberProfile(user.id, body);
    if (!updated) {
      return c.json({ error: API_MESSAGES.USER_NOT_FOUND }, 404);
    }
    return c.json({ user: userResponseBody(updated) });
  });

  app.patch('/api/users/:id', async (c) => {
    const user = await resolveUser(c);
    if (!requireAdmin(user)) {
      return c.json({ error: API_MESSAGES.FORBIDDEN }, 403);
    }
    const body = (await c.req.json()) as {
      name?: string;
      date_of_birth?: string | null;
      bio?: string | null;
      status?: 'active' | 'inactive';
    };
    const id = c.req.param('id');
    if (body.status === 'inactive' && id === user.id) {
      return c.json(
        { error: API_MESSAGES.CANNOT_DEACTIVATE_SELF_ACCOUNT },
        400,
      );
    }
    try {
      const updated = await stores.users.updateUser({ id, ...body });
      if (!updated) {
        return c.json({ error: API_MESSAGES.USER_NOT_FOUND }, 404);
      }
      return c.json({ user: userResponseBody(updated) });
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Update failed' },
        400,
      );
    }
  });

  app.delete('/api/users/:id', async (c) => {
    const user = await resolveUser(c);
    if (!requireAdmin(user)) {
      return c.json({ error: API_MESSAGES.FORBIDDEN }, 403);
    }
    const id = c.req.param('id');
    const { deleted } = await stores.users.deleteUser(id);
    if (!deleted) {
      return c.json({ error: API_MESSAGES.USER_NOT_FOUND }, 404);
    }
    return c.json({ ok: true, id });
  });

  app.post('/api/rag/knowledge/search', async (c) => {
    const user = await resolveUser(c);
    if (!user) {
      return c.json({ error: API_MESSAGES.UNAUTHORIZED }, 401);
    }
    const apiKey = readOpenAiKey();
    if (!apiKey) {
      return c.json(
        { error: 'OPENAI_API_KEY required for knowledge search' },
        500,
      );
    }
    const body = (await c.req.json()) as { question?: string };
    if (!body.question?.trim()) {
      return c.json({ error: API_MESSAGES.INVALID_INPUT }, 400);
    }
    await ensureKnowledgeBaseSeeded(stores.knowledge, apiKey);
    const matches = await findRelevantContent(
      stores.knowledge,
      apiKey,
      body.question,
    );
    return c.json({ ok: true, matches });
  });

  app.post('/api/rag/knowledge/ingest', async (c) => {
    const user = await resolveUser(c);
    if (!requireAdmin(user)) {
      return c.json({ error: API_MESSAGES.FORBIDDEN }, 403);
    }
    const apiKey = readOpenAiKey();
    if (!apiKey) {
      return c.json({ error: 'OPENAI_API_KEY required' }, 500);
    }
    const body = (await c.req.json()) as { content?: string };
    if (!body.content?.trim()) {
      return c.json({ error: API_MESSAGES.INVALID_INPUT }, 400);
    }
    const result = await ingestKnowledgeContent(stores.knowledge, {
      apiKey,
      content: body.content,
      createdBy: user.id,
    });
    return c.json({ ok: true, ...result });
  });

  app.post('/api/rag/users/query', async (c) => {
    const user = await resolveUser(c);
    if (!requireAdmin(user)) {
      return c.json({ error: API_MESSAGES.FORBIDDEN }, 403);
    }
    const apiKey = readOpenAiKey();
    if (!apiKey) {
      return c.json({ error: 'OPENAI_API_KEY required' }, 500);
    }
    const body = (await c.req.json()) as { question?: string };
    if (!body.question?.trim()) {
      return c.json({ error: API_MESSAGES.INVALID_INPUT }, 400);
    }
    const matches = await queryUserInfoFromVectorStore(
      stores.users,
      stores.knowledge,
      apiKey,
      body.question,
    );
    return c.json({ ok: true, matches });
  });

  app.get('/health', (c) => c.json({ ok: true }));

  return app;
};
