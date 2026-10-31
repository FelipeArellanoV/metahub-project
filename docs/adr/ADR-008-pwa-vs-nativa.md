# ADR 008: Aplicación web progresiva (PWA) en lugar de aplicación nativa

* **Estado:** Aprobado
* **Fecha:** 2026-10-30

## Contexto
Los entrenadores usan dispositivos y sistemas operativos diversos, sin garantía de acceso a tiendas de aplicaciones.

## Decisión
Frontend React con Vite como PWA: una base de código, instalable, con acceso a cámara desde el navegador.

## Consecuencias
- Un solo desarrollo y despliegue.
- Acceso a la cámara y rendimiento sujetos al navegador del dispositivo.
- La captura en vivo conserva un modo de simulación que debe rotularse para no confundirlo con medición real.
