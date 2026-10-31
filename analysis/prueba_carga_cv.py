"""Prueba de carga del servicio de visión (criterio 5, Etapa 3).

Uso: python analysis/prueba_carga_cv.py URL VIDEO [concurrencias, ej. 1,3,5]
Ejemplo: uvicorn main:app --port 8000 (en apps/cv-service) y luego
         python analysis/prueba_carga_cv.py http://localhost:8000 video.mp4 1,3,5
Lanza N análisis simultáneos de análisis completo y reporta éxito, tiempo por solicitud y tiempo total.
"""
import json, statistics as st, sys, time
from concurrent.futures import ThreadPoolExecutor
import httpx

def one(url, video):
    t = time.perf_counter()
    try:
        with open(video, 'rb') as fh:
            r = httpx.post(url + '/api/cv/process-video', files={'file': ('v.mp4', fh, 'video/mp4')},
                           data={'scan_full_video': 'true'}, timeout=600)
        return r.status_code, time.perf_counter() - t
    except Exception as e:
        return type(e).__name__, time.perf_counter() - t

if __name__ == '__main__':
    url, video = sys.argv[1], sys.argv[2]
    levels = [int(x) for x in (sys.argv[3] if len(sys.argv) > 3 else '1,3,5').split(',')]
    for n in levels:
        t0 = time.perf_counter()
        with ThreadPoolExecutor(n) as ex:
            res = list(ex.map(lambda _: one(url, video), range(n)))
        total = time.perf_counter() - t0
        ok = [t for c, t in res if c == 200]
        print(json.dumps({'concurrentes': n, 'exitosas': len(ok), 'fallidas': n - len(ok),
                          'mediana_s': round(st.median([t for _, t in res]), 2),
                          'max_s': round(max(t for _, t in res), 2), 'total_s': round(total, 2)}))
