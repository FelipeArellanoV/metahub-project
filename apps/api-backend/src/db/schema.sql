-- MetaHub PostgreSQL + TimescaleDB Schema (T-09)
-- Esquema para gestión de usuarios, atletas, sesiones y métricas biomecánicas en series temporales.

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
    age INT NOT NULL,
    consent BOOLEAN DEFAULT FALSE,
    trainer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- 7. Índices optimizados para consultas longitudinales
CREATE INDEX IF NOT EXISTS idx_athletes_trainer ON athletes(trainer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_athlete ON sessions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_metrics_session ON biomechanical_metrics(session_id, time DESC);
