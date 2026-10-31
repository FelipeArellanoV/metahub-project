"""Benchmark reproducible del servicio de visión (criterio de rendimiento, Etapa 3).

Uso (desde la raíz del repo):
    python analysis/medir_rendimiento_cv.py RUTA_VIDEO [repeticiones]
Mide tiempo de respuesta de /api/cv/process-video en análisis completo y con el modo
anterior (paso 3, 150 cuadros), e imprime mediana, máximo y p95 (nearest-rank).
"""
import json, math, statistics as st, sys, time
sys.path.insert(0, 'apps/cv-service')
from fastapi.testclient import TestClient
import main

def p95(xs):
    xs = sorted(xs); return xs[max(0, math.ceil(0.95 * len(xs)) - 1)]

def run(client, path, data, n):
    ts, last = [], None
    for _ in range(n):
        t = time.perf_counter()
        with open(path, 'rb') as fh:
            last = client.post('/api/cv/process-video', files={'file': (path.split('/')[-1], fh, 'video/mp4')}, data=data)
        ts.append(time.perf_counter() - t)
    assert last.status_code == 200, last.text[:200]
    vi = last.json()['video_info']
    return {'config': data, 'n': n, 'mediana_s': round(st.median(ts), 2), 'max_s': round(max(ts), 2),
            'p95_s': round(p95(ts), 2), 'duracion_video_s': vi['duration_seconds'], 'resolucion': vi['resolution'],
            'cuadros_analizados': vi['analyzed_frames'], 'tasa_deteccion_pct': vi['detection_rate_pct']}

if __name__ == '__main__':
    video = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    c = TestClient(main.app)
    for cfg in ({'scan_full_video': 'true'}, {'sample_stride': '3', 'max_frames': '150'}):
        print(json.dumps(run(c, video, cfg, n), ensure_ascii=False))
