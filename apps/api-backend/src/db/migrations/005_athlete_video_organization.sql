BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_name VARCHAR(160) NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS organization_name VARCHAR(160) NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS athlete_video_uploads (
 id UUID PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
 session_id INTEGER UNIQUE NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 request_id UUID NOT NULL,
 stored_name TEXT NOT NULL UNIQUE,
 original_name VARCHAR(180) NOT NULL,
 mime VARCHAR(80) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'uploaded' CHECK(status IN('uploaded','processing','completed','failed')),
 error VARCHAR(300),
 process_key UUID,
 started_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS athlete_video_uploads_athlete ON athlete_video_uploads(athlete_id,created_at DESC);
COMMIT;
