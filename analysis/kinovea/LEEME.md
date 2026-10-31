# Anotación manual en Kinovea (T-07, preliminar)

Video: el archivo 4K de prueba (3840x2160, 25 fps). Cuadros elegidos: 10, entre 0 y 8,2 s, con las dos piernas y la cadera detectadas.

## Reglas (para que la comparación sea válida)
1. **Cada observador anota por separado**, sin ver los valores del sistema ni los del otro observador. El archivo `sistema_4k.csv` es solo para el análisis: no lo abran antes de terminar.
2. Usen la herramienta **Ángulo** de Kinovea con **zoom ≥ 200 %** y coloquen los tres puntos sobre el centro de cada articulación.
3. Mida el **ángulo interno** (entre 0° y 180°; 180° = pierna extendida):
   - **rodilla**: cadera – rodilla – tobillo;
   - **cadera**: hombro – cadera – rodilla.
4. Ubiquen el cuadro por el **tiempo** (`tiempo_s`). El número de cuadro del CSV empieza en 0; si Kinovea muestra otro número, guíense por el tiempo (error máximo de 1 cuadro = 0,04 s).
5. Si una articulación **no se ve** (por ejemplo la pierna lejana oculta), dejen la celda **vacía**; ese dato se excluye del análisis.
6. Anoten **decimales con punto o coma**, con un decimal basta.

## Pasos
1. Observador A completa `planilla_observador_A.csv`; observador B completa `planilla_observador_B.csv`.
2. Para obtener los valores del sistema de otro video, o para repetir con este, use `python analysis/medir_rendimiento_cv.py` y el JSON del servicio (`processed_frames`).
3. Calculen:
   ```
   python analysis/validar_kinovea.py analysis/kinovea/sistema_4k.csv \
       analysis/kinovea/planilla_observador_A.csv analysis/kinovea/planilla_observador_B.csv resultados.json
   ```
4. Criterio del protocolo: MAE del sistema ≤ 5° por articulación. Con 10 cuadros el resultado es **preliminar** y de **un solo video**.
