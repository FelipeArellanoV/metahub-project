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

