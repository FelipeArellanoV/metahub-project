-- Ejecutar después del schema.sql de main. No borra datos.
BEGIN;
CREATE TABLE IF NOT EXISTS collaboration_tasks (
  id TEXT PRIMARY KEY,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  details VARCHAR(2000) NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS collaboration_appointments (
  id TEXT PRIMARY KEY,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  location VARCHAR(200) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  attendance VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (attendance IN ('pending','confirmed','declined')),
  cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (ends_at > starts_at)
);
CREATE TABLE IF NOT EXISTS collaboration_messages (
  id TEXT PRIMARY KEY,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_role VARCHAR(20) NOT NULL,
  body VARCHAR(2000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS collaboration_receipts (
  actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id VARCHAR(80) NOT NULL,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  result JSONB NOT NULL,
  PRIMARY KEY (actor_id, request_id)
);
CREATE TABLE IF NOT EXISTS collaboration_events (
  id TEXT PRIMARY KEY,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(80) NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS collaboration_tasks_athlete ON collaboration_tasks(athlete_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS collaboration_appointments_athlete ON collaboration_appointments(athlete_id, starts_at);
CREATE INDEX IF NOT EXISTS collaboration_messages_athlete ON collaboration_messages(athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS collaboration_events_athlete ON collaboration_events(athlete_id, created_at DESC);
COMMIT;
