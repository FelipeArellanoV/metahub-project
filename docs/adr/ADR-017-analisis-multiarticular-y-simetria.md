# ADR 017: Análisis multiarticular (rodilla, cadera, tobillo, muslo, pierna y tronco) y simetría multiarticular

* **Estado:** Aceptada
* **Fecha:** 2026-10-31

## Contexto
El análisis usaba casi solo la rodilla (ángulo por cuadro y rango de movimiento por pierna). La cadera se informaba sin puntuar (ADR-016) y el pie y el tronco no se medían. Un análisis de carrera necesita al menos las tres articulaciones del miembro inferior (cadera, rodilla y tobillo) y la postura del tronco.

## Decisión
1. **Nuevos datos por cuadro y por lado** (`compute_biomechanical_metrics`):
   - `*_ankle_angle`: ángulo rodilla–tobillo–punta del pie (landmarks 25/27/31 y 26/28/32).
   - `*_thigh_inclination` y `*_shank_inclination`: inclinación de muslo y pierna respecto de la vertical (0°–90°, valor absoluto).
   - `*_trunk_inclination`: inclinación del tronco (hombro–cadera) respecto de la vertical.
   - Si falta la punta del pie no se calcula el ángulo de tobillo (no se inventa).
2. **Resumen por articulación** (`resumir_articulaciones`): rango de movimiento por pierna (percentil 95 − percentil 5) y simetría (menor/mayor) para rodilla, cadera, tobillo, muslo y pierna; el tronco se informa como media, p5 y p95. Una articulación con menos de 30 muestras por pierna se declara no evaluable.
3. **Simetría multiarticular:** promedio de la simetría de rodilla, cadera y tobillo evaluables. Es la que usa el sector 3 del IPT (`simetria_metodo = promedio_multiarticular_rodilla_cadera_tobillo`). Si no hay ninguna evaluable, el IPT excluye la simetría como antes (ADR-013). La simetría de rodilla se mantiene en `avg_symmetry_score` por compatibilidad.
4. **Estado del respaldo:** ángulos de rodilla y cadera tienen validación 2D publicada (VanKeersbilck et al., 2022). Tobillo, inclinaciones de muslo/pierna y tronco **no tienen referencia absoluta verificada**: se informan como datos descriptivos y no se puntúan salvo la simetría de tobillo, que entra al promedio. Se declara en la respuesta y en el informe.

## Resultado con el video 4K (`sample_stride` = 2)
| Articulación | ROM izq. | ROM der. | Simetría |
|---|---|---|---|
| Rodilla | 88,9° | 115,4° | 77,0 % |
| Cadera | 63,6° | 54,4° | 85,5 % |
| Tobillo | 63,0° | 43,8° | 69,6 % |
| Muslo (inclinación) | 60,3° | 53,6° | 88,9 % |
| Pierna (inclinación) | 80,5° | 83,0° | 96,9 % |

Simetría multiarticular 77,4 % (3 articulaciones); tronco 6,9° de media (p5 0,8°, p95 14,3°). IPT 83,4 (con solo rodilla: 83,2).

## Consecuencias
- La asimetría de rodilla contrasta con la alta simetría de las inclinaciones de muslo y pierna; puede ser un artefacto de medición 2D (perspectiva y oclusión de la pierna lejana) y no un hallazgo clínico. Debe contrastarse con Kinovea en la Etapa 4.
- Los datos nuevos son descriptivos hasta validarlos; el IPT sigue siendo experimental.
- 3 pruebas nuevas (`angulo_con_vertical`, métricas complementarias, resumen y simetría multiarticular) y sensibilidad recalculada.
