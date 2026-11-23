-- 009: perfil deportivo del atleta (ADR-026). Idempotente; no borra datos.
-- Prueba principal, pierna dominante, estatura y mejor marca: contexto para el entrenador y el informe.
-- No entran al IPT.
BEGIN;
CREATE TABLE IF NOT EXISTS athlete_sport_profiles (
  athlete_id INTEGER PRIMARY KEY REFERENCES athletes(id) ON DELETE CASCADE,
  main_event VARCHAR(20) CHECK (main_event IN ('60m','80m','100m','150m','200m','400m','vallas','relevos','otra')),
  dominant_leg VARCHAR(10) CHECK (dominant_leg IN ('derecha','izquierda')),
  height_cm SMALLINT CHECK (height_cm BETWEEN 100 AND 230),
  best_mark VARCHAR(60),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMIT;
