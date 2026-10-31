# ADR 006: TimescaleDB sobre PostgreSQL

* **Estado:** En revisión
* **Fecha:** 2026-10-30

## Contexto
Se necesita almacenar métricas por sesión para tendencias longitudinales. Alternativas: PostgreSQL simple, InfluxDB, TimescaleDB.

## Decisión
Mantener TimescaleDB, una extensión del mismo motor PostgreSQL, sin servicio adicional.

## Consecuencias
- Estimación (supuestos: 100 atletas, 2 sesiones por semana, 40 semanas, 90 mediciones por sesión): unas 720.000 filas por año. PostgreSQL simple lo soporta; **TimescaleDB no responde a una necesidad de rendimiento**. Se conserva por agregación temporal y políticas de retención.
- **Estado real:** la hypertable `biomechanical_metrics` está definida en `schema.sql`, pero el backend no la usa; el análisis se guarda como JSONB en `sessions.analysis`.
- **Criterio de decisión (Etapa 4):** con métricas por evento persistidas y datos simulados de 100 atletas, si la consulta de tendencia tiene p95 < 200 ms con un índice B-tree estándar, se reemplaza por una tabla ordinaria.
