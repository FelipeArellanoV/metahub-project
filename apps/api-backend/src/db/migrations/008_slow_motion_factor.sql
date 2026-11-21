-- 008: factor de cámara lenta del video subido (ADR-023). Idempotente; no borra datos.
-- Un celular puede guardar la cámara lenta a 25-30 cuadros/s aunque la captó a 60-240: el factor
-- (captura / reproducción) permite que el análisis use el tiempo real. 1 = video normal.
BEGIN;
ALTER TABLE athlete_video_uploads ADD COLUMN IF NOT EXISTS slow_motion_factor REAL NOT NULL DEFAULT 1;
ALTER TABLE athlete_video_uploads DROP CONSTRAINT IF EXISTS athlete_video_uploads_slow_motion_check;
ALTER TABLE athlete_video_uploads ADD CONSTRAINT athlete_video_uploads_slow_motion_check
  CHECK (slow_motion_factor >= 1 AND slow_motion_factor <= 16);
COMMIT;
