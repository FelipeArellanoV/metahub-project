# ADR 018: Funcionamiento real: sin datos simulados y recomendaciones basadas solo en lo medido

* **Estado:** Aceptada
* **Fecha:** 2026-11-11

## Contexto
La revisión del código de la pantalla de ejercicios (`Drills.jsx`) mostró que el diagnóstico no dependía del video:
- leía `avg_knee_angle`, `cadence_hz` y `trunk_lean_angle`, métricas que el servicio de visión no entrega; para la rodilla usaba `min_knee_flexion` (otra magnitud) y para cadencia y tronco, valores por defecto escritos en el código (3,05 Hz y −5,5°), con lo que todo atleta recibía ejercicios de cadencia;
- los umbrales (rodilla < 26°, simetría < 90 %, cadencia < 3,10 Hz) no tenían fuente y estaban en una escala distinta de la medida;
- el listado de sesiones del entrenador (PostgreSQL) no devolvía el campo `analysis`, de modo que la pantalla nunca recibía datos reales;
- existían perfiles de demostración, un botón que analizaba un video de muestra y lo guardaba a nombre del atleta, un acceso `?demo=1` en el login y, sin PostgreSQL, un entrenador de demostración con contraseña conocida;
- el texto de las prescripciones afirmaba causas (por ejemplo, "overstriding" a partir de la asimetría) que los datos no permiten determinar.

## Decisión
1. **Sin caminos simulados.** El servicio de visión rechaza `use_sample` salvo con `ALLOW_SAMPLE_VIDEO=true` (solo desarrollo y pruebas) y exige un archivo. El frontend elimina el análisis de muestra, el acceso `?demo=1` (requiere `VITE_ENABLE_DEMO=true` al compilar) y los perfiles ficticios. La API solo crea datos de demostración con `ALLOW_DEMO_SEED=true`.
2. **Trazabilidad.** Cada análisis registra el nombre, el tamaño y el SHA-256 del archivo analizado, el origen (`video_subido`) y los indicadores de calidad (cuadros válidos, porcentaje válido, baja confianza). La API los persiste.
3. **Motor de recomendaciones** (`apps/cv-service/recomendaciones.py`), con una sola fuente de verdad en el servicio:
   - usa únicamente `ipt_evaluation`, `analisis_articular` y `video_info` del video analizado;
   - si no hay métricas o la confianza es baja (menos de 60 % de cuadros válidos, menos de 30 cuadros válidos o marcada por el servicio), **no recomienda** y explica el motivo;
   - cada hallazgo informa el valor medido, la referencia de diseño, la métrica de origen, el estado de respaldo (`respaldo_parcial` o `diseno_a_calibrar`) y la fuente;
   - solo se generan hallazgos de propulsión, recobro y simetría; cadencia, tronco, tobillo, muslo y pierna se informan pero no generan recomendaciones (sin referencia o sin validar);
   - la edad define una banda de trabajo (Sub-14: 10 a 13 años; Sub-16: 14 y 15; Sub-18: 16 y 17). Fuera de ese rango, o sin edad, no se dosifica y se declara. La banda es cronológica y no sustituye la maduración biológica.
4. **Lenguaje.** Las prescripciones pasan de "causa" a "hipótesis a verificar por el entrenador"; la asimetría incluye la advertencia de artefactos de la medición 2D. Se retira el rótulo "Categoría Oficial FEDACHI" mientras no se verifique.
5. **Datos completos hasta la pantalla.** La API envía la edad del atleta al servicio, persiste `analisis_articular`, `recomendaciones` y los indicadores de calidad, y el listado de sesiones del entrenador incluye `analysis` sin los cuadros de vista previa.

## Consecuencias
- Un video real de 15 años (4K de prueba) genera: IPT 83,4, banda Sub-16, confianza alta y un hallazgo de simetría (77,4 %, a calibrar), con el SHA-256 del archivo.
- Las recomendaciones son apoyo al entrenador, no diagnóstico. Los umbrales de severidad (puntaje de sector < 75 y < 50) y las dosis por banda siguen siendo de diseño y requieren revisión profesional y calibración con la validación de la Etapa 4.
- La exactitud de las medidas sigue sin demostrarse: en el piloto frente a Kinovea el error fue de unos 14°.
- 9 pruebas del motor, 2 de integración (muestra deshabilitada y trazabilidad del archivo subido) y 1 de la API; el CI las ejecuta.
