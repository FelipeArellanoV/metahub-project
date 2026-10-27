-- =========================================================================================
-- PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
-- Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
-- 
-- Memoria / Trabajo de Título:
-- Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
-- Profesor Guía: Dr. Marcos Lévano
-- 
-- Módulo: Esquema de Base de Datos PostgreSQL + Extensión TimescaleDB (schema.sql)
-- Descripción: Modelado relacional e Hypertables para series temporales de métricas biomecánicas.
-- =========================================================================================

-- 1. Habilitar extensión TimescaleDB para análisis de series temporales
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 2. Tabla de Usuarios / Entrenadores
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'entrenador',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Atletas (Aislamiento por entrenador)
CREATE TABLE IF NOT EXISTS athletes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT,
    birth_date DATE,
    consent BOOLEAN DEFAULT FALSE,
    trainer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Cuenta de acceso del atleta (rol 'atleta'); NULL si el atleta no tiene login propio
    user_id INT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Sesiones de Carrera
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    athlete_id INT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    trainer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    video_url TEXT,
    notes TEXT,
    -- Resultado del analisis biomecanico (Indice IPT MetaHub UCT) y resumen compacto del analisis
    ipt_score DOUBLE PRECISION,
    analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4b. Migracion para bases existentes (idempotente)
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS user_id INT UNIQUE REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ipt_score DOUBLE PRECISION;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS analysis JSONB;

-- 5. Tabla de Métricas Biomecánicas (Series temporales)
CREATE TABLE IF NOT EXISTS biomechanical_metrics (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    session_id INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    athlete_id INT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- ej: 'knee_angle', 'hip_angle', 'stride_symmetry'
    value DOUBLE PRECISION NOT NULL,
    side VARCHAR(10) DEFAULT 'both',  -- 'left', 'right', 'both'
    raw_metadata JSONB
);

-- 6. Convertir la tabla de métricas en una Hypertable de TimescaleDB particionada por tiempo
SELECT create_hypertable('biomechanical_metrics', 'time', if_not_exists => TRUE);

-- 7. Tabla de Consentimientos Informados (Ley 19.628 / 21.719 - Menores de edad)
CREATE TABLE IF NOT EXISTS consents (
    id SERIAL PRIMARY KEY,
    athlete_id INT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    guardian_id INT REFERENCES users(id) ON DELETE SET NULL,
    consent_type VARCHAR(50) NOT NULL DEFAULT 'grabacion_biomecanica',
    status VARCHAR(20) NOT NULL DEFAULT 'granted', -- 'granted', 'revoked', 'pending'
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Índices optimizados para consultas longitudinales
CREATE INDEX IF NOT EXISTS idx_athletes_trainer ON athletes(trainer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_athlete ON sessions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_metrics_session ON biomechanical_metrics(session_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_consents_athlete ON consents(athlete_id);


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

BEGIN;
CREATE TABLE IF NOT EXISTS clubs (
 id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL,
 owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS club_memberships (
 club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 PRIMARY KEY (club_id,user_id)
);
CREATE TABLE IF NOT EXISTS club_invitations (
 token_hash TEXT PRIMARY KEY,
 club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
 email VARCHAR(150) NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 consumed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS club_memberships_user ON club_memberships(user_id,club_id);
COMMIT;

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
