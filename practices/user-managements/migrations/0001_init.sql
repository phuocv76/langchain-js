-- Migration number: 0001 	 2026-05-04T15:45:38.811Z

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  password TEXT,
  date_of_birth TEXT,
  bio TEXT
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

-- Default admin (development): admin@admin.com / Abcd@123
-- Password: bcrypt (12 rounds), same algorithm as hashPassword in src/server/auth/password.ts.
INSERT INTO users (
  id,
  name,
  email,
  role,
  created_at,
  password,
  date_of_birth,
  bio
) VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Admin',
  'admin@admin.com',
  'admin',
  1767225600000,
  '$2b$12$O/BqcLakFcZ4epekHzCvzeVEgzodRJ4d1QlnKMYJhNYA9sibqks/2',
  NULL,
  NULL
);
