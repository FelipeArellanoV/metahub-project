# ADR 013: Simetría de sesión por pierna en lugar de diferencia instantánea

* **Estado:** Aceptada (implementa T-10 en su primera versión)
* **Fecha:** 2026-10-30

## Contexto
El índice de simetría original compara, en cada cuadro, el ángulo de la rodilla izquierda con el de la derecha (`100 − |L−R| / max(L,R) · 100`). En la carrera las piernas están desfasadas casi media zancada, de modo que esa diferencia mide la fase del ciclo y no la asimetría. Una persona perfectamente simétrica puede obtener valores bajos. La medición con un video 4K (`docs/` del informe, sección 5.2) y una serie sintética lo confirmaron. El índice alimenta el 25 % del IPT.

## Decisión
1. El resumen de simetría se calcula por sesión y por pierna: rango de movimiento de la rodilla (percentil 95 − percentil 5) de cada pierna, y luego `SI = 100 − |ROM_izq − ROM_der| / max · 100`.
2. Si hay menos de 12 muestras por pierna o un rango menor a 15°, la simetría se declara **no evaluable**: no se muestra un valor, se emite el aviso "SIMETRÍA NO EVALUABLE" y se excluye del IPT, que queda ponderado solo por propulsión y recobro.
3. El valor instantáneo por cuadro se conserva como dato (`instant_symmetry_mean`) y ya no determina el IPT ni los avisos.
4. Se agregan pruebas: desfase puro → 100 %; asimetría de amplitud → valor bajo; datos insuficientes → no evaluable.

## Consecuencias
- El indicador es independiente de la fase y exige varias zancadas por pierna.
- Es una versión preliminar de amplitud: no distingue apoyo de vuelo ni analiza ciclo a ciclo. La detección de eventos de zancada y la simetría por ciclo siguen planificadas (T-10, Etapa 4).
- Tampoco está validada contra una referencia: los umbrales de 92 % siguen siendo criterio de diseño (ver `docs/FUNDAMENTACION_CIENTIFICA_IPT.md`).
- En el video 4K de prueba, la pierna lejana puede estar sobreestimada por el modelo, por lo que el valor obtenido (67,3 %) no debe leerse como asimetría real sin contrastarlo con Kinovea.
