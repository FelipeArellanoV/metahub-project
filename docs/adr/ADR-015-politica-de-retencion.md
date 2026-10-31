# ADR 015: Política de retención y purga de videos vencidos

* **Estado:** Propuesto (el plazo debe fijarlo la institución y el profesor guía)
* **Fecha:** 2026-10-30

## Contexto
Los requisitos RE-05 y RE-07 y la historia HU-11 exigen una política de retención y eliminación de datos biométricos (video y pose) de menores. El diseño de la Etapa 2 la describe como un job de purga (CU-08). No existía implementación ni un plazo definido.

## Decisión
1. Se implementa `purgarVideosVencidos` (`src/services/retencion.js`): elimina el archivo de video y su `.pose.json`, borra el registro de la carga y deja la sesión sin enlace de video. Se conservan las métricas agregadas (IPT y resumen), que no son el registro audiovisual.
2. El plazo **no tiene valor por defecto**. Se define con `RETENTION_DAYS`; si falta o es inválido, la purga no se ejecuta ni se programa. Así no se elimina nada por una suposición.
3. La API programa la purga diaria solo si `RETENTION_DAYS` está definido. Existe además `scripts/purgar-retencion.js`, que por defecto simula (no borra) y requiere `--apply` para eliminar.
4. No se purgan cargas en estado `processing`.

## Consecuencias
- El mecanismo está listo y probado contra PostgreSQL real (4 pruebas). Falta que la institución defina el plazo y que se documente en el consentimiento.
- No cubre aún la eliminación por revocación de consentimiento ni de los datos de sesión; son extensiones para la Etapa 4.
- La eliminación es irreversible: se recomienda ejecutar primero en modo simulación.
