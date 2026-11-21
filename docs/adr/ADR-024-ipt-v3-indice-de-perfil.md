# ADR 024: IPT v3, índice de perfil técnico con método y referencia publicados

* **Estado:** Propuesta (pendiente de revisión por los autores y el profesor guía)
* **Fecha:** 2026-11-19
* **Autoría del índice:** Felipe Arellano Vargas y Sofía Henríquez Soto (UCT, 2026)
* Reemplaza el cálculo del IPT de ADR-016 y ADR-023. La medición por paso de ADR-023 no cambia.

## Contexto
El IPT v2 (ADR-023) ya comparaba cada variable con una referencia publicada, pero agregaba con decisiones de diseño sin respaldo:
- una escala de 100 a 0 entre 1 y 4 DE;
- pesos de 35/25/25/15 por sector;
- cortes de 75 y 90.

El objetivo es un índice propio en el que cada decisión tenga respaldo bibliográfico.

En análisis clínico de la marcha existen índices validados que resumen muchas variables cinemáticas en un número, comparándolas con una población de referencia:
- **Gait Deviation Index (GDI)**, Schwartz y Rozumalski (2008): 100 es el patrón de la referencia y **cada 10 puntos menos equivalen a 1 DE** de alejamiento.
- **Gait Profile Score (GPS)** y **Movement Analysis Profile (MAP)**, Baker et al. (2009):
  - el índice global es la **media cuadrática (RMS) de las desviaciones de cada variable, sin ponderaciones**;
  - se acompaña del perfil por variable, que muestra qué explica la desviación.

## Decisión: definición del IPT v3
Para cada variable cinemática *i* comparable con la referencia (ADR-023):

    z_i = (media del atleta_i − media_ref_i) / DE_ref_i                (Miyashiro et al., 2019)
    IPT = max(0, 100 − 10 · sqrt( (1/N) · Σ z_i² ))                    (escala GDI, agregación RMS del GPS)

**Variables:** rodilla, muslo y distancia cadera-pie en el contacto y en el despegue; rodilla mínima y elevación del muslo en el recobro; y muslo libre al contacto del otro pie.
- No entran las temporales (frecuencia de paso y tiempo de apoyo), porque dependen de la velocidad y del largo de pierna (Miyashiro et al., 2019, Tabla 3).
- Tampoco entran las variables con muestreo insuficiente, apoyo inestable o pasos irregulares (ADR-023).

**Sin ponderaciones:** todas las variables pesan igual, como en el GPS.

**Mínimo:** 2 variables comparables. Si alguna fase (contacto, despegue o recobro) no tiene variables, el IPT es `provisional`.

**Perfil:** cada variable con su z y su aporte (10·|z| puntos), ordenado de mayor a menor. Es el equivalente del MAP y explica el número.

**Incertidumbre de la sesión:** IC 95 % por remuestreo de los pasos medidos (bootstrap, 1000 repeticiones; Efron y Tibshirani, 1993). Un cambio entre sesiones solo se considera real si los intervalos no se superponen.

**Simetría:** el mismo índice aplicado a la diferencia entre la pierna A y la B (pasos alternos). Se informa aparte y no entra al IPT, como el GPS por lado.

**Fases (contacto, despegue y recobro):** el mismo índice calculado solo con las variables de cada fase. Sirve para señalar qué trabajar.

**Interpretación**, derivada de la escala, no elegida:

| IPT | Lectura |
|---|---|
| ≥ 90 | Alejamiento medio menor que 1 DE ("cercano a la referencia") |
| 80 a 90 | Entre 1 y 2 DE ("desviación moderada") |
| < 80 | Más de 2 DE ("desviación marcada"). Coincide con el criterio de 2 DE usado para los hallazgos |

## Qué es de autoría propia y qué está respaldado
| Componente | Respaldo |
|---|---|
| Valores de referencia de cada variable | Miyashiro et al. (2019), publicado |
| Escala 100 − 10 por DE | Schwartz y Rozumalski (2008), publicado |
| Agregación RMS sin pesos y perfil por variable | Baker et al. (2009), publicado |
| IC 95 % por remuestreo | Efron y Tibshirani (1993), método estándar |
| Adaptación del método a sprint 2D con variables discretas por paso, medición sin rótulos de pierna, simetría por pasos alternos y selección de variables | **Aporte de MetaHub**, a validar |

## Consecuencias
- No quedan pesos ni cortes arbitrarios: los únicos parámetros son los de la escala publicada.
- **Ejemplos con el corredor sintético:**

  | Caso | IPT | IC 95 % | Lectura |
  |---|---|---|---|
  | Patrón base | 90,5 | 90,2–90,8 | Cercano a la referencia |
  | Recobro de 45° (z = 2,4) | 87,6 | — | Desviación moderada |
  | Recobro de 60° y pie al 66 % del largo de pierna | 75,5 | — | Desviación marcada |

  El patrón base no llega a 100 porque la pierna libre del corredor sintético no es realista (z = 2,85), y el perfil lo muestra.
- **No es comparable con el IPT v1 ni con el v2**: tienen otra escala. Las medallas pasan a 80 (menos de 2 DE) y 90 (menos de 1 DE).
- **Error del método:** el error sistemático frente a Kinovea (hasta 14,6°) es mayor que la DE de la referencia (4,8–5,6° en la rodilla). Por eso:
  - el IC de la sesión mide la variabilidad entre pasos, no el sesgo del método;
  - los hallazgos por variable siguen exigiendo superar ese error;
  - el IPT se recomienda para el seguimiento del mismo atleta con la misma forma de grabar.
- **Validación pendiente** (Etapa 4):
  1. Concordancia de las variables con Kinovea en sprints reales a 120–240 cuadros/s.
  2. Fiabilidad test-retest del IPT (ICC y cambio mínimo detectable).
  3. Concordancia de la lectura con la revisión ciega de profesionales (`concordancia.py`).
  4. Una referencia de escolares, que reemplazaría la de adultos sin cambiar el método.

## Referencias
- Schwartz MH, Rozumalski A. The Gait Deviation Index: a new comprehensive index of gait pathology. Gait Posture. 2008;28(3):351-357.
- Baker R, McGinley JL, Schwartz MH, et al. The Gait Profile Score and Movement Analysis Profile. Gait Posture. 2009;30(3):265-269.
- Baker R, McGinley JL, Schwartz M, et al. The minimal clinically important difference for the Gait Profile Score. Gait Posture. 2012;35(4):612-615. doi:10.1016/j.gaitpost.2011.12.008
- Miyashiro K, Nagahara R, Yamamoto K, Nishijima T. Kinematics of Maximal Speed Sprinting With Different Running Speed, Leg Length, and Step Characteristics. Front Sports Act Living. 2019;1:37. doi:10.3389/fspor.2019.00037
- Efron B, Tibshirani RJ. An Introduction to the Bootstrap. Chapman & Hall; 1993.

Las citas de 2008 y 2009 se verificaron con el resumen y fuentes secundarias. Antes de la entrega, revisar las ecuaciones en el texto completo.
