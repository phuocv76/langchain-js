// Libs for third party
import { tool } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';

// Internal
import { TOOL_MESSAGES } from '../../constants/messages.js';
import {
  apiFetch,
  parseApiJson,
  readSessionContext,
} from '../../lib/api-client.js';
import {
  addKnowledgeSchema,
  knowledgeQuestionSchema,
} from '../../lib/schemas.js';

const missingKeyResult = () => ({
  ok: false as const,
  error: 'Knowledge search requires OPENAI_API_KEY on the API server (.env).',
});

/** Searches the product knowledge base. */
export const getKnowledgeTool = tool(
  async ({ question }, config: RunnableConfig) => {
    const response = await apiFetch(config, '/api/rag/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });

    if (response.status === 500) {
      return missingKeyResult();
    }

    return parseApiJson<{ ok: true; matches: unknown[] }>(response);
  },
  {
    name: 'get_knowledge',
    description: TOOL_MESSAGES.GET_KNOWLEDGE,
    schema: knowledgeQuestionSchema,
  },
);

/** Semantic search over vectorized user-directory snapshots (admin). */
export const queryUserInfoTool = tool(
  async ({ question }, config: RunnableConfig) => {
    const session = readSessionContext(config);
    if (session.userRole !== 'admin') {
      return { ok: false as const, error: 'Admin only.' };
    }

    const response = await apiFetch(config, '/api/rag/users/query', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });

    if (response.status === 500) {
      return missingKeyResult();
    }

    return parseApiJson<{ ok: true; matches: unknown[] }>(response);
  },
  {
    name: 'query_user_info',
    description: TOOL_MESSAGES.QUERY_USER_INFO,
    schema: knowledgeQuestionSchema,
  },
);

/** Adds text to the knowledge base (admin). */
export const addKnowledgeTool = tool(
  async ({ content }, config: RunnableConfig) => {
    const session = readSessionContext(config);
    if (session.userRole !== 'admin') {
      return { ok: false as const, error: 'Admin only.' };
    }

    const response = await apiFetch(config, '/api/rag/knowledge/ingest', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });

    if (response.status === 500) {
      return missingKeyResult();
    }

    return parseApiJson<{
      ok: true;
      resourceId: string;
      chunkCount: number;
    }>(response);
  },
  {
    name: 'add_knowledge',
    description: TOOL_MESSAGES.ADD_KNOWLEDGE,
    schema: addKnowledgeSchema,
  },
);

export const ragTools = [
  getKnowledgeTool,
  queryUserInfoTool,
  addKnowledgeTool,
] as const;
