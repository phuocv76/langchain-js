// Libs for third party
import type Database from 'better-sqlite3';

// Internal
import type { AppStores, KnowledgeStore, UserStore } from './types.js';
import * as ragRepo from '../rag/repository.js';
import * as userRepo from '../users/repository.js';

const createKnowledgeStore = (db: Database.Database): KnowledgeStore => ({
  countKnowledgeChunks: async () => ragRepo.countKnowledgeChunks(db),
  listKnowledgeChunks: async (createdBy) =>
    ragRepo.listKnowledgeChunks(db, createdBy),
  insertKnowledgeResource: async (input) => {
    ragRepo.insertKnowledgeResource(db, input);
  },
  insertKnowledgeChunks: async (rows) => {
    ragRepo.insertKnowledgeChunks(db, rows);
  },
  getLatestKnowledgeResourceByCreatedBy: async (createdBy) =>
    ragRepo.getLatestKnowledgeResourceByCreatedBy(db, createdBy),
  deleteKnowledgeResourcesByCreatedBy: async (createdBy, exceptId) => {
    ragRepo.deleteKnowledgeResourcesByCreatedBy(db, createdBy, exceptId);
  },
});

const createUserStore = (db: Database.Database): UserStore => ({
  listUsers: async () => userRepo.listUsers(db),
  getUser: async (id) => userRepo.getUser(db, id),
  getUserByEmail: async (email) => userRepo.getUserByEmail(db, email),
  getUserWithSecret: async (email) => userRepo.getUserWithSecret(db, email),
  verifyPassword: userRepo.verifyPassword,
  createSession: async (userId) => userRepo.createSession(db, userId),
  getUserForSession: async (sessionId) =>
    userRepo.getUserForSession(db, sessionId),
  deleteSession: async (sessionId) => {
    userRepo.deleteSession(db, sessionId);
  },
  listUsersSharingDisplayNameKey: async (name) =>
    userRepo.listUsersSharingDisplayNameKey(db, name),
  createUser: async (input) => userRepo.createUser(db, input),
  updateMemberProfile: async (userId, input) =>
    userRepo.updateMemberProfile(db, userId, input),
  updateUser: async (input) => userRepo.updateUser(db, input),
  deleteUser: async (id) => userRepo.deleteUser(db, id),
});

/** Builds async store adapters over the local SQLite database. */
export const createSqliteStores = (db: Database.Database): AppStores => ({
  users: createUserStore(db),
  knowledge: createKnowledgeStore(db),
});
