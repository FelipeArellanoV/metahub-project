# ADR 016: Respaldo de los parámetros del IPT y corrección del término de cadera

* **Estado:** Aceptada
* **Fecha:** 2026-10-31

## Contexto
Al revisar qué fuentes respaldan cada parámetro del IPT se encontró lo siguiente:
- **Recobro (flexión de rodilla ≤ 70° de ángulo interior):** Novacheck (1998) informa una flexión máxima de rodilla en el balanceo de unos 90° al correr, 105° al esprintar y hasta 130° en un velocista muy entrenado. Con ángulo interior = 180° − flexión, equivale a unos 90°, 75° y 50°. El umbral corresponde a un velocista entrenado: respaldo parcial.
- **Propulsión (165°–175°), simetría (≥ 92 %) y pesos (0,40/0,35/0,25):** no se halló una fuente verificable que fije estos valores. Son decisiones de diseño.
- **Error de implementación:** el término de elevación de cadera comparaba el percentil 95 del ángulo hombro–cadera–rodilla (que mide *extensión*; 174,3° en el video 4K) con un umbral de *elevación* de 85°. La condición se cumplía siempre y el término nunca penalizaba. Además solo se usaba la cadera izquierda.
- **Estimación 2D:** VanKeersbilck et al. (2022) hallaron correlaciones altas frente a captura con marcadores (rodilla r = 0,983; cadera r = 0,968; un sujeto a 6,5 m/s) pero indicaron que se subestiman o se pierden los extremos de flexión y extensión, justo lo que usa el IPT (percentiles 95 y 5).

## Decisión
1. La flexión de cadera deja de puntuarse. Se informa como `flexion_cadera_max` (180° − percentil 5 del ángulo hombro–cadera–rodilla, con ambas caderas). El recobro depende solo de la flexión de rodilla.
2. La respuesta incluye `referencias` con el estado de cada parámetro (`respaldo_parcial`, `diseno_a_calibrar`, `solo_informativo`) y su fuente.
3. La respuesta incluye `simetria_contexto` con los rangos de movimiento por pierna y la visibilidad media de cada pierna, solo como contexto.
4. Los valores sin fuente se rotulan como valores de referencia a calibrar con los datos de la validación (Kinovea y evaluación de un profesional).

## Resultado con el video 4K (análisis completo, `sample_stride` = 2, igual que la API)
- IPT 83,2; propulsión 94,1; recobro 100; simetría 42,1 (rangos de rodilla 88,9° y 115,4°; simetría 77,0 %).
- Visibilidad media: 0,92 (izquierda) y 0,97 (derecha). No respalda la hipótesis de oclusión de la pierna lejana, aunque MediaPipe puede asignar alta visibilidad a puntos ocluidos.
- Sensibilidad (5 000 simulaciones): con pesos variados el IPT va de 75,7 a 89,7 y la categoría es «Nivel II» el 92,5 % de las veces; con entradas desplazadas hasta 5°, el 98,8 %.
- **Efecto del muestreo en el mismo video:** `sample_stride` 2 → 83,2; 3 → 74,2; 5 → 87,3. La configuración de muestreo cambia el puntaje y la categoría. El resultado de ADR-014 (74,2) corresponde a `sample_stride` = 3; la API usa 2.

## Consecuencias
- El IPT no cambia en este video por el ajuste de la cadera (el recobro ya valía 100 por la flexión de rodilla); la corrección elimina un término que no discriminaba.
- El muestreo es un parámetro del método y debe fijarse y registrarse con cada resultado (RNF06).
- Los rangos sin fuente se calibran en la Etapa 4; el IPT sigue siendo experimental y de seguimiento relativo.

> Nota (2026-10-31): con la simetría multiarticular de ADR-017 el IPT del video 4K es 83,4 (simetría 77,4 %; sector 3 = 43,2). Las cifras de arriba corresponden a la simetría solo de rodilla.
