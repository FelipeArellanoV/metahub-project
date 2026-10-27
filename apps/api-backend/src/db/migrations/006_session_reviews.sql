BEGIN;
CREATE TABLE IF NOT EXISTS session_reviews (
 session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
 athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
 reviewer_id INTEGER NOT NULL REFERENCES users(id),
 status VARCHAR(30) NOT NULL CHECK(status IN('pending','reviewed','requires_new_video')),
 observations VARCHAR(3000) NOT NULL DEFAULT '',
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE collaboration_tasks ADD COLUMN IF NOT EXISTS source_session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE collaboration_tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS session_reviews_athlete ON session_reviews(athlete_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS tasks_source_session ON collaboration_tasks(source_session_id);
COMMIT;
