// Internal
import type { KnowledgeStore, UserStore } from '../stores/types.js';
import { buildKnowledgeSeedDocument } from './knowledge-seed.js';
import { generateEmbeddings, generateEmbedding } from './embedding-core.js';
import { cosineSimilarity } from './cosine.js';

let seedInFlight: Promise<void> | null = null;

const USER_INFO_VECTOR_CREATED_BY = '__rag_user_info_sync__';
const USER_INFO_QUERY_SIMILARITY_THRESHOLD = 0.35;
const USER_INFO_QUERY_MAX_RESULTS = 6;

const parseStoredEmbedding = (value: string): number[] | null => {
  try {
    return JSON.parse(value) as number[];
  } catch {
    return null;
  }
};

/** Stores a knowledge document and its derived chunk embeddings. */
export const ingestKnowledgeContent = async (
  knowledge: KnowledgeStore,
  input: {
    apiKey: string;
    content: string;
    createdBy?: string | null;
  },
): Promise<{ resourceId: string; chunkCount: number }> => {
  const trimmed = input.content.trim();
  if (!trimmed) throw new Error('Knowledge content cannot be empty');

  const resourceId = crypto.randomUUID();
  await knowledge.insertKnowledgeResource({
    id: resourceId,
    content: trimmed,
    createdBy: input.createdBy ?? null,
    createdAt: Date.now(),
  });

  const embeddings = await generateEmbeddings(input.apiKey, trimmed);
  await knowledge.insertKnowledgeChunks(
    embeddings.map((row) => ({
      id: crypto.randomUUID(),
      resourceId,
      content: row.content,
      embedding: row.embedding,
    })),
  );

  return { resourceId, chunkCount: embeddings.length };
};

/** Ingests built-in policy docs when the knowledge base is empty. */
export const ensureKnowledgeBaseSeeded = async (
  knowledge: KnowledgeStore,
  apiKey: string,
): Promise<void> => {
  if ((await knowledge.countKnowledgeChunks()) > 0) return;

  if (!seedInFlight) {
    seedInFlight = (async () => {
      if ((await knowledge.countKnowledgeChunks()) > 0) return;
      await ingestKnowledgeContent(knowledge, {
        apiKey,
        content: buildKnowledgeSeedDocument(),
        createdBy: null,
      });
    })().finally(() => {
      seedInFlight = null;
    });
  }

  await seedInFlight;
};

/** Finds top matching knowledge chunks by cosine similarity. */
export const findRelevantContent = async (
  knowledge: KnowledgeStore,
  apiKey: string,
  userQuery: string,
  options: {
    createdBy?: string | null;
    similarityThreshold?: number;
    maxResults?: number;
  } = {},
): Promise<{ content: string; similarity: number }[]> => {
  const { createdBy, similarityThreshold = 0.5, maxResults = 4 } = options;

  const queryEmbedding = await generateEmbedding(apiKey, userQuery);
  const rows = await knowledge.listKnowledgeChunks(createdBy);

  return rows
    .map((row) => {
      const stored = parseStoredEmbedding(row.embedding);
      if (!stored) return { content: row.content, similarity: -1 };
      return {
        content: row.content,
        similarity: cosineSimilarity(queryEmbedding, stored),
      };
    })
    .filter((r) => r.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
};

const digestSha256Hex = async (value: string): Promise<string> => {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const buildSerializedUsers = (
  users: Awaited<ReturnType<UserStore['listUsers']>>,
): string =>
  [...users]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((u) =>
      JSON.stringify({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        date_of_birth: u.date_of_birth,
        bio: u.bio,
        created_at: u.created_at,
      }),
    )
    .join('\n');

const buildUserLine = (
  user: Awaited<ReturnType<UserStore['listUsers']>>[number],
): string => {
  const dob = user.date_of_birth ?? 'N/A';
  const bio = user.bio?.trim() ? user.bio.trim() : 'N/A';
  return `User ID: ${user.id}. Name: ${user.name}. Email: ${user.email}. Role: ${user.role}. Status: ${user.status}. Date of birth: ${dob}. Bio: ${bio}.`;
};

const extractChecksum = (content: string): string | null => {
  const match = content.match(/^RAG_CHECKSUM:\s*(.+)$/m);
  return match?.[1]?.trim() || null;
};

/** Syncs the current user directory snapshot into the vector store. */
export const syncUserDirectoryToVectorStore = async (
  users: UserStore,
  knowledge: KnowledgeStore,
  apiKey: string,
): Promise<void> => {
  const allUsers = await users.listUsers();
  const serialized = buildSerializedUsers(allUsers);
  const checksum = await digestSha256Hex(serialized);
  const latest = await knowledge.getLatestKnowledgeResourceByCreatedBy(
    USER_INFO_VECTOR_CREATED_BY,
  );

  if (latest && extractChecksum(latest.content) === checksum) {
    return;
  }

  const header = {
    source: 'user-directory',
    checksum,
    generatedAtIso: new Date().toISOString(),
  };

  const document = [
    `RAG_SOURCE: ${header.source}`,
    `RAG_CHECKSUM: ${header.checksum}`,
    `RAG_GENERATED_AT: ${header.generatedAtIso}`,
    '',
    ...allUsers.map(buildUserLine),
  ].join('\n');

  const result = await ingestKnowledgeContent(knowledge, {
    apiKey,
    content: document,
    createdBy: USER_INFO_VECTOR_CREATED_BY,
  });

  await knowledge.deleteKnowledgeResourcesByCreatedBy(
    USER_INFO_VECTOR_CREATED_BY,
    result.resourceId,
  );
};

/** Queries the user-info vector index. */
export const queryUserInfoFromVectorStore = async (
  users: UserStore,
  knowledge: KnowledgeStore,
  apiKey: string,
  question: string,
): Promise<{ content: string; similarity: number }[]> => {
  await syncUserDirectoryToVectorStore(users, knowledge, apiKey);
  return findRelevantContent(knowledge, apiKey, question, {
    createdBy: USER_INFO_VECTOR_CREATED_BY,
    similarityThreshold: USER_INFO_QUERY_SIMILARITY_THRESHOLD,
    maxResults: USER_INFO_QUERY_MAX_RESULTS,
  });
};
