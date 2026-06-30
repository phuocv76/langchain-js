// Internal
import type { User, UserStatus } from '../domain/user.js';
import type { KnowledgeChunkRow } from '../rag/store-types.js';

/** Async user persistence used by the shared Hono app. */
export type UserStore = {
  listUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserWithSecret(
    email: string,
  ): Promise<(User & { password: string | null }) | null>;
  verifyPassword(password: string, hash: string | null): Promise<boolean>;
  createSession(userId: string): Promise<string>;
  getUserForSession(sessionId: string): Promise<User | null>;
  deleteSession(sessionId: string): Promise<void>;
  listUsersSharingDisplayNameKey(name: string): Promise<User[]>;
  createUser(input: {
    name: string;
    email: string;
    date_of_birth: string;
    bio?: string;
  }): Promise<User>;
  updateMemberProfile(
    userId: string,
    input: {
      name?: string;
      date_of_birth?: string | null;
      bio?: string | null;
    },
  ): Promise<User | null>;
  updateUser(input: {
    id: string;
    name?: string;
    date_of_birth?: string | null;
    bio?: string | null;
    status?: UserStatus;
  }): Promise<User | null>;
  deleteUser(id: string): Promise<{ deleted: boolean }>;
};

/** Async knowledge persistence used by RAG operations. */
export type KnowledgeStore = {
  countKnowledgeChunks(): Promise<number>;
  listKnowledgeChunks(createdBy?: string | null): Promise<KnowledgeChunkRow[]>;
  insertKnowledgeResource(input: {
    id: string;
    content: string;
    createdBy: string | null;
    createdAt: number;
  }): Promise<void>;
  insertKnowledgeChunks(
    rows: {
      id: string;
      resourceId: string;
      content: string;
      embedding: number[];
    }[],
  ): Promise<void>;
  getLatestKnowledgeResourceByCreatedBy(
    createdBy: string | null,
  ): Promise<{ id: string; content: string } | null>;
  deleteKnowledgeResourcesByCreatedBy(
    createdBy: string | null,
    exceptId?: string,
  ): Promise<void>;
};

export type AppStores = {
  users: UserStore;
  knowledge: KnowledgeStore;
};
