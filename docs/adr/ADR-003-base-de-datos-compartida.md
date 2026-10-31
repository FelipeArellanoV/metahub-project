# ADR 003: Base de datos compartida con responsabilidades delimitadas

* **Estado:** Aprobado (implementación parcial)
* **Fecha:** 2026-10-30

## Contexto
La API transaccional (Node.js) y el servicio de visión (Python) necesitan datos coherentes de atletas, sesiones y videos. La Etapa 2 evaluó una base por servicio frente a una base compartida.

## Decisión
Una sola instancia PostgreSQL. La API es la única que escribe entidades de negocio (usuarios, atletas, sesiones, consentimientos). El servicio de visión no accede a la base: recibe el video y devuelve resultados por HTTP; la API los persiste.

## Consecuencias
- Un solo punto de verdad y transacciones simples.
- El servicio de visión queda sin estado y es fácil de probar.
- **Estado real:** el esquema está en `apps/api-backend/schema.sql`. En desarrollo se usa un respaldo en archivo JSON (`data/database.json`). Los IDs de usuarios, atletas y sesiones aún son numéricos (SERIAL).
