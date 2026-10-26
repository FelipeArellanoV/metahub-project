# ADR 002: Estándar de Seguridad para Autenticación (BCrypt costo 12, JWT 15 min, Control de Roles)

* **Estado:** Aprobado
* **Fecha:** 2026-09-29

## Contexto
El sistema maneja datos de atletas escolares y perfiles de entrenadores, requiriendo el cumplimiento de requisitos no funcionales de seguridad (RNF03).

## Decisión
1. **Hashing de contraseñas:** Uso de `bcryptjs` con costo de salting 12 (`BCRYPT_SALT_ROUNDS = 12`).
2. **Tokens de sesión:** Firma oficial mediante `jsonwebtoken` con clave secreta y tiempo de expiración estricto de 15 minutos (`expiresIn: '15m'`).
3. **Aislamiento y Roles:** Asignación forzada de rol `entrenador` en el registro público para prevenir escalado de privilegios no autorizados a `admin`.
4. **Respuestas a fallos:** Respuesta HTTP 401 con mensaje genérico (`"Credenciales inválidas."`) ante fallos de correo o contraseña para prevenir enumeración de usuarios.

## Consecuencias
- Mitigación contra ataques de fuerza bruta y enumeración de cuentas.
- Cumplimiento de los requisitos de auditoría de seguridad del informe del proyecto.
