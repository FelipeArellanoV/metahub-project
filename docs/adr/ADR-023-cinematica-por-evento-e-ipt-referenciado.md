# ADR 023: Medición por paso sin rótulos de pierna e IPT v2 referenciado

* **Estado:** Propuesta (pendiente de revisión por los autores)
* **Fecha:** 2026-11-19
* Complementa ADR-018 y ADR-019. Reemplaza las ventanas de diseño del IPT de ADR-016.

## Contexto
1. **El IPT v1 usaba ventanas de diseño sin fuente.** Comparaba percentiles de todo el video (rodilla p95 y p5) con 165°–175° en el empuje, ≤ 70° en el recobro y simetría ≥ 92 %.
   - La literatura de máxima velocidad en video 2D contradice la ventana del empuje. Miyashiro et al. (2019) midieron 79 velocistas varones con 11,08 s en 100 m:
     - la rodilla en el despegue fue de **155,4 ± 4,8°**;
     - la mínima en el recobro fue de **31,6 ± 5,6°**.
2. **El percentil de todo el video no corresponde a ningún instante de la zancada.** La referencia mide en el contacto inicial y en el despegue.
3. **El video se submuestreaba a 15 cuadros/s.** A esa frecuencia, un apoyo de unos 0,10 s cabe en 1,5 cuadros.
4. **MediaPipe no distingue bien la pierna izquierda de la derecha en vista lateral.** En un video real de trote de 317 cuadros, la rodilla rotulada "izquierda" quedó delante de la cadera en todos los cuadros, lo que es físicamente imposible. Además:
   - Un seguimiento por continuidad y otro por mínima aceleración no lo corrigieron: en los cruces, el modelo colapsa o intercambia las piernas.
   - Toda medida "por pierna izquierda/derecha" con una cámara es, por lo tanto, poco fiable. Esto incluye la simetría por rango de movimiento de ADR-013 y ADR-017.

## Decisión

### 1. Medición sin rótulos de pierna (`cinematica_eventos.py`)
- **Contacto:** un apoyo es un tramo en que el punto más bajo de los pies (talón, tobillo o punta, de cualquiera de las dos piernas) está a nivel del suelo.
  - El nivel del suelo es el percentil 90 del pie más bajo en una ventana de 0,6 s, lo que admite una cámara que acompaña al atleta.
  - La tolerancia es el 3 % del largo de la pierna.
- **Pierna de apoyo:** la que tiene el pie más bajo en ese instante. **Pierna en recobro:** la otra durante el apoyo y, en el vuelo, la que va por delante.
- **Reglas físicas:**
  - Un contacto inicial ocurre con el pie al menos un 5 % del largo de pierna por delante de la cadera.
  - Si dos apoyos se juntan sin vuelo, se separan cuando el pie de apoyo salta hacia adelante (un pie apoyado solo retrocede respecto de la cadera).
- **Limpieza de la secuencia:**
  - Se estima el paso dominante T como una mediana robusta.
  - Una programación dinámica elige los contactos más coherentes con T: un intervalo de 0,75 a 1,35 T es un paso.
  - Un intervalo de 1,6 T o más indica pasos perdidos y corta la secuencia en tramos, sin inventar contactos.
- **Variables por paso:**
  - en el contacto y en el despegue: rodilla, muslo respecto de la vertical y distancia cadera-pie relativa al largo de pierna;
  - en el recobro: rodilla mínima y elevación máxima del muslo;
  - tiempos de paso, de apoyo y de vuelo.
- **Simetría por pasos alternos:** al correr, los pasos se alternan, así que los pares son de una pierna (A) y los impares de la otra (B). Se compara A con B dentro del tramo continuo más largo, con al menos 5 contactos. No se afirma cuál pierna es la izquierda.
- **Estadística por variable:** n, media, DE, CV, IC 95 % (t de Student), mínimo y máximo.
- **Cámara lenta:** `factor_camara_lenta` (×2, ×4 u ×8 en la interfaz) lleva los tiempos al tiempo real. El video y el esqueleto conservan el tiempo del archivo.

### 2. Comparación con la referencia (`referencias.REFERENCIA_MAXIMA_VELOCIDAD`, Tabla 1 de Miyashiro et al.)
Para cada variable, z = (media − media_ref) / DE_ref. La variable se clasifica así:
- `dentro_de_referencia` si |z| ≤ 2;
- `dentro_del_error_del_metodo` si |z| > 2 pero la diferencia no supera el error del piloto frente a Kinovea (14,6°);
- `alteracion` si |z| > 2 y la diferencia supera ese error;
- `no_comparable` o `insuficiente`, siempre con el motivo, en estos casos:
  - **No es sprint:** menos de 3,5 pasos/s. El mínimo publicado en velocistas es 4,17; se deja margen para escolares. Valor de diseño.
  - **Pasos irregulares:** menos de 3 pasos medidos, menos del 75 % plausibles (0,15–0,50 s) o un CV mayor que 15 %.
  - **Apoyo inestable:** la mediana del apoyo es menor que 0,06 s (el mínimo publicado es 0,087 s). Afecta solo a las variables del instante de contacto y de despegue.
  - **Muestreo insuficiente:** menos de 60 cuadros/s reales para los instantes y menos de 240 para el tiempo de apoyo.
  - **Pocos pasos:** menos de 3 pasos válidos.

### 3. IPT v2 (`calculate_ipt_referenciado`)
- Cada variable se puntúa por su z: 100 dentro de ±1 DE, 0 desde ±4 DE, lineal entre ambos.
- Los sectores son:
  - Propulsión (0,35): rodilla, muslo y distancia al despegue.
  - Recobro (0,25): rodilla mínima y elevación del muslo.
  - Contacto (0,25): distancia, rodilla y muslo al contacto.
  - Simetría (0,15): diferencia entre las piernas A y B, en DE de la referencia.
- Los sectores no evaluables se excluyen y el IPT queda `provisional`.
- **Si ninguna variable es comparable, no hay IPT** (`ipt_score: null`) y se informa el motivo más frecuente. La sesión se guarda igual con la estadística medida. El IPT v1 se conserva solo como `ipt_v1_diseno`.

### 4. Hallazgos
- Se genera uno por cada `alteracion` y por cada asimetría A/B que cumpla el mismo criterio, con su valor, z, n, referencia, fuente y una lectura según el sentido de la diferencia, como hipótesis para el entrenador.
- Las variables no comparadas se listan agrupadas por motivo.

### 5. Simetría por rótulos
La simetría por rango de movimiento sigue calculándose, pero se marca como no válida: `symmetry_valid: false` y `simetria_fiable: false`. No alimenta alertas ni el IPT, y el dato crudo queda en `symmetry_rom_rotulos_crudo`.

## Consecuencias
- **Pruebas sintéticas (18):** un corredor de valores conocidos se recupera dentro de ±4°. El resultado es el mismo con los rótulos intercambiados al azar en el 30 % de los cuadros, o con "izquierda" siempre adelante como hace MediaPipe. También se prueban la cámara lenta ×8, el trote, los contactos falsos, los pasos perdidos y el apoyo inestable.
- **Videos reales**, ninguno de ellos un sprint lateral apto. En todos el sistema declaró por qué no comparaba y no inventó IPT ni hallazgos:
  - **Trote de maratón**: cámara que acompaña al atleta, 898×506, cámara lenta ×2,4 estimada a partir de los propios cuadros.
    - Mide 11 contactos, 3,18 ± 0,29 pasos/s, recobro de 80 ± 9° y muslo de 43 ± 3°, valores creíbles para un trote.
    - Reconoce que no es un sprint y que el apoyo no se detecta estable, porque los pies quedan en el borde de la imagen.
  - **Sprint de Pexels 8533913**: solo se ven unos 3 pasos.
  - **El resto** (19 clips de Pexels y el trote en la playa): frontales, el atleta pequeño en la imagen o la cámara en movimiento.
- **Falta la validación con un sprint real:** lateral, cámara fija, 6 a 8 pasos visibles y 120–240 cuadros/s, comparado contra Kinovea. Siguen siendo de diseño, a calibrar con la revisión profesional (`concordancia.py`):
  - los umbrales;
  - la escala del puntaje;
  - los pesos de los sectores.
- La referencia es de velocistas adultos varones. **Falta una referencia de escolares**, por ejemplo Applied Sciences 2024;14(14):6057, que no se pudo descargar.
- El análisis cuadro a cuadro tarda unos 9–15 s por cada 10 s de video en el equipo de desarrollo.
- **Migración 008:** `athlete_video_uploads.slow_motion_factor`. En una base existente hay que aplicarla a mano, porque Docker solo ejecuta `schema.sql` al crear la base.
