# ADR-019: Referencias publicadas, comparabilidad y calibración con revisión profesional

Estado: aceptada (2026-11-11). Complementa ADR-018.

## Contexto
Los umbrales de MetaHub (ventana 165°–175°, 92 %, severidad 75/50) son de diseño. No existe un
umbral consensuado de técnica buena/mala para escolares con video 2D de celular. La literatura
ofrece rangos de referencia, pero con otra tarea, otra población o otro método.

## Decisión
1. `referencias.py` contrasta cada métrica con la literatura solo si es comparable; si no, declara
   "no comparable" y el motivo. Ninguna métrica principal se declara plenamente comparable hoy.
2. Cada respuesta de recomendaciones incluye el error del método medido en el piloto contra Kinovea
   (MAE hasta 14,6°), para que no se atribuya al atleta una diferencia menor que ese error.
3. Las referencias son contexto, no estándar de aprobación (`referencias_contextuales_no_normativas`).
4. `concordancia.py` calcula acuerdo, kappa de Cohen, sensibilidad y especificidad entre MetaHub y la
   revisión ciega de un profesional, por sector, para calibrar los umbrales con datos reales.

5. `calidad_video.py` evalúa el video subido antes de interpretar ángulos: resolución, cuadros por
   segundo, duración, detección, nitidez, iluminación, tamaño del atleta, encuadre y plano lateral
   (indicio). Evalúa además la coherencia de los datos: cobertura y rango de rodilla por pierna,
   oclusión de la pierna lejana y zancadas detectadas.
6. Un chequeo en "falla" baja la confianza a "baja" y bloquea las recomendaciones, explicando cómo
   regrabar; un "aviso" la baja a "media". El resultado se guarda en `video_info.calidad_video` y
   `calidad_datos`. Los umbrales son de diseño y quedan "por calibrar".

## Referencias
- Matsuzaki et al., HSS Journal 2024;20(3): 53 corredores de 14–18 años, carrera en cinta, video 2D.
- Novacheck, Gait & Posture 1998: cinemática de carrera y sprint (adultos).
- Rumpf et al., Sports Biomechanics 2018: datos de sprint en niños pre-PHV, cinta no motorizada.
Citas a verificar en PubMed antes de la entrega.

## Consecuencias
- La app no emite un veredicto "bueno/malo"; informa hallazgos con su respaldo y su límite.
- Los umbrales solo dejarán de ser "por calibrar" cuando exista concordancia medida con profesionales.
