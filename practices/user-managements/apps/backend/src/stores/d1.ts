// Internal
import type { AppStores, KnowledgeStore, UserStore } from './types.js';
import * as ragRepo from '../rag/repository-d1.js';
import * as userRepo from '../users/repository-d1.js';

const createKnowledgeStore = (db: D1Database): KnowledgeStore => ({
  countKnowledgeChunks: () => ragRepo.countKnowledgeChunks(db),
  listKnowledgeChunks: (createdBy) =>
    ragRepo.listKnowledgeChunks(db, createdBy),
  insertKnowledgeResource: (input) =>
    ragRepo.insertKnowledgeResource(db, input),
  insertKnowledgeChunks: (rows) => ragRepo.insertKnowledgeChunks(db, rows),
  getLatestKnowledgeResourceByCreatedBy: (createdBy) =>
    ragRepo.getLatestKnowledgeResourceByCreatedBy(db, createdBy),
  deleteKnowledgeResourcesByCreatedBy: (createdBy, exceptId) =>
    ragRepo.deleteKnowledgeResourcesByCreatedBy(db, createdBy, exceptId),
});

const createUserStore = (db: D1Database): UserStore => ({
  listUsers: () => userRepo.listUsers(db),
  getUser: (id) => userRepo.getUser(db, id),
  getUserByEmail: (email) => userRepo.getUserByEmail(db, email),
  getUserWithSecret: (email) => userRepo.getUserWithSecret(db, email),
  verifyPassword: userRepo.verifyPassword,
  createSession: (userId) => userRepo.createSession(db, userId),
  getUserForSession: (sessionId) => userRepo.getUserForSession(db, sessionId),
  deleteSession: (sessionId) => userRepo.deleteSession(db, sessionId),
  listUsersSharingDisplayNameKey: (name) =>
    userRepo.listUsersSharingDisplayNameKey(db, name),
  createUser: (input) => userRepo.createUser(db, input),
  updateMemberProfile: (userId, input) =>
    userRepo.updateMemberProfile(db, userId, input),
  updateUser: (input) => userRepo.updateUser(db, input),
  deleteUser: (id) => userRepo.deleteUser(db, id),
});

/** Builds async store adapters over a Cloudflare D1 database. */
export const createD1Stores = (db: D1Database): AppStores => ({
  users: createUserStore(db),
  knowledge: createKnowledgeStore(db),
});
