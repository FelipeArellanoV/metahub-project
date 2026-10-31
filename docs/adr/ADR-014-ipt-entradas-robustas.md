# ADR 014: IPT con entradas robustas, simetría de sesión y estado experimental explícito

* **Estado:** Aceptada
* **Fecha:** 2026-10-30

## Contexto
El IPT combina propulsión (40 %), recobro (35 %) y simetría (25 %). En la medición con el video 4K se detectaron tres problemas de coherencia: (1) la propulsión y el recobro usaban el máximo y el mínimo del ángulo de rodilla de toda la sesión, es decir, un solo cuadro (179,0° y 40,9°; una rodilla casi totalmente extendida en plena carrera no es plausible); (2) la simetría comparaba ángulos simultáneos (ADR-013); (3) la categoría se presentaba como diagnóstico aunque ni los pesos ni los umbrales tienen validación externa.

## Decisión
1. El IPT usa el percentil 95 del ángulo de rodilla (propulsión), el percentil 5 (recobro) y el percentil 95 del ángulo de cadera. Los máximos y mínimos absolutos se siguen informando, pero no determinan el índice.
2. La simetría proviene del resumen por pierna (ADR-013) y se excluye si no es evaluable.
3. La respuesta incluye `estado_validacion = experimental_no_validado`, una advertencia y la marca `cerca_de_umbral` cuando el puntaje está a menos de 5 puntos de un límite de categoría.
4. Se agrega `analysis/sensibilidad_ipt.py`, que mide cuánto cambia la categoría al variar los pesos y las entradas.

## Resultado del análisis de sensibilidad (video 4K, 5000 simulaciones)
- IPT base: 74,2. Con pesos variados (desviación cercana a 0,07), el puntaje va de 64,4 a 83,0 (percentiles 5 a 95) y la categoría cae en "Nivel II" el 46,8 % de las veces y en "Nivel III" el 53,2 %.
- Con entradas desplazadas hasta 5°, el intervalo es 69,3 a 79,5 y la división es 45,7 % / 54,3 %.
- Conclusión: en este video la categoría no es robusta, porque el puntaje queda sobre el umbral de 75. El valor numérico del IPT es más informativo que su categoría.

## Consecuencias
- El IPT se usa como indicador de seguimiento relativo (comparar sesiones del mismo atleta), no como diagnóstico.
- Su validación (correlación con la evaluación de un profesional, y calibración de pesos y umbrales con datos propios) queda para la Etapa 4.
- Los pesos y umbrales siguen siendo decisiones de diseño. La literatura respalda los principios, no estos valores.
