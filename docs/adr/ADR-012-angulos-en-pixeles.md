# ADR 012: Cálculo de ángulos en píxeles

* **Estado:** Aprobado
* **Fecha:** 2026-10-30

## Contexto
`metrics_engine.calculate_angle` recibía coordenadas normalizadas de MediaPipe (x/ancho, y/alto). En una imagen no cuadrada los ejes tienen escalas distintas y el ángulo resulta distorsionado. En un video 4K 16:9 la diferencia por muestra respecto del cálculo en píxeles fue de 15,3° en promedio y 32,4° como máximo (168 comparaciones). El criterio de aceptación del protocolo es MAE <= 5°.

## Decisión
Convertir los puntos a píxeles (`to_pixel_space`) antes de calcular ángulos, en el procesamiento de video y en `/api/cv/metrics`. Este endpoint acepta `image_width` e `image_height` opcionales: si se informan, trata las coordenadas como normalizadas y las convierte; si no, las toma como coordenadas con ejes de igual escala (compatibilidad). Las coordenadas exportadas para dibujar el esqueleto siguen normalizadas.

## Consecuencias
- Ángulos independientes de la resolución y la orientación del video.
- Efecto sobre el video de prueba: flexión mínima 38,08° -> 40,88°; simetría media 68,41 -> 65,77; IPT 74,8 -> 74,4.
- Los ángulos siguen sin validarse frente a Kinovea (Etapa 4).
- Limitación aparte: el índice de simetría compara ángulos simultáneos de ambas rodillas y no distingue asimetría de fase normal; se reformulará por ciclo con T-10.
