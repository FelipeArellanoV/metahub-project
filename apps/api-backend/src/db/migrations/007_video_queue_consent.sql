-- 007: cola de análisis de video en segundo plano y datos del apoderado en el consentimiento.
-- Idempotente; no borra datos. Ejecutar después de 006.
BEGIN;

-- Cola de análisis: estados queued (en cola) -> processing (analizando) -> completed (listo) | failed (falló).
-- 'uploaded' se mantiene solo por compatibilidad con filas anteriores y se convierte en 'queued'.
ALTER TABLE athlete_video_uploads DROP CONSTRAINT IF EXISTS athlete_video_uploads_status_check;
ALTER TABLE athlete_video_uploads ADD CONSTRAINT athlete_video_uploads_status_check
  CHECK (status IN ('uploaded','queued','processing','completed','failed'));
ALTER TABLE athlete_video_uploads ALTER COLUMN status SET DEFAULT 'queued';
ALTER TABLE athlete_video_uploads ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE athlete_video_uploads ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE athlete_video_uploads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Quién pidió el análisis (subida o reintento); el trabajo se autoriza con esa identidad.
ALTER TABLE athlete_video_uploads ADD COLUMN IF NOT EXISTS requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
UPDATE athlete_video_uploads SET status = 'queued', next_attempt_at = CURRENT_TIMESTAMP WHERE status = 'uploaded';
CREATE INDEX IF NOT EXISTS athlete_video_uploads_queue
  ON athlete_video_uploads (next_attempt_at) WHERE status IN ('queued','processing');

-- Consentimiento informado: identificación del apoderado y de quien lo registró.
ALTER TABLE consents ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(120);
ALTER TABLE consents ADD COLUMN IF NOT EXISTS guardian_relationship VARCHAR(60);
ALTER TABLE consents ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(30);
ALTER TABLE consents ADD COLUMN IF NOT EXISTS recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
-- Antes no se validaba el estado: cualquier valor distinto se deja como 'pending' (no habilita captura).
UPDATE consents SET status = 'pending' WHERE status NOT IN ('granted','revoked','pending');
ALTER TABLE consents DROP CONSTRAINT IF EXISTS consents_status_check;
ALTER TABLE consents ADD CONSTRAINT consents_status_check CHECK (status IN ('granted','revoked','pending'));

COMMIT;
