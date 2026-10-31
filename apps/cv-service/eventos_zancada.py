"""
Detector de eventos de zancada (T-10, primera versión).

Entrada: los cuadros procesados por el servicio (processed_frames), con tiempo, puntos clave normalizados y ángulos.
Método: el contacto inicial de cada pierna se toma como un máximo local de la posición vertical del tobillo en la
imagen (el tobillo está más abajo al apoyar). Un contacto debe separarse del anterior al menos MIN_SEPARACION_S y
sobresalir del valle vecino al menos MIN_PROMINENCIA (fracción de la altura de la imagen). Entre dos contactos
consecutivos de la misma pierna hay una zancada (ciclo).

Límites declarados: no distingue apoyo medio ni despegue; depende de la frecuencia de muestreo (a menos de ~8
muestras por paso se vuelve poco fiable); asume cámara fija o con paneo horizontal. No está validado contra Kinovea.
"""
from typing import Any, Dict, List
import numpy as np

MIN_SEPARACION_S = 0.45   # una misma pierna no vuelve a apoyar antes (> ~130 ciclos/min por pierna)
MIN_PROMINENCIA = 0.04
MIN_ZANCADAS_POR_PIERNA = 3

# Piernas analizadas: (nombre, punto del tobillo, ángulo de rodilla). Los nombres de punto y de ángulo
# son los del contrato del servicio de visión.
PIERNAS = (
    ('izquierda', 'left_ankle', 'left_knee_angle'),
    ('derecha', 'right_ankle', 'right_knee_angle'),
)


def _serie(cuadros: List[Dict[str, Any]], punto_tobillo: str, clave_rodilla: str):
    """Tiempos, altura del tobillo y ángulo de rodilla de los cuadros donde el tobillo fue detectado."""
    tiempos, alturas, rodillas = [], [], []
    for cuadro in cuadros:
        puntos = cuadro.get('keypoints') or {}
        if punto_tobillo in puntos:
            tiempos.append(float(cuadro['time_sec']))
            alturas.append(float(puntos[punto_tobillo][1]))
            rodillas.append(float((cuadro.get('metrics') or {}).get(clave_rodilla, np.nan)))
    return np.array(tiempos), np.array(alturas), np.array(rodillas)


def hallar_contactos(tiempos: np.ndarray, alturas: np.ndarray) -> List[int]:
    """Índices de contacto: máximos locales con separación y prominencia mínimas."""
    if len(alturas) < 3:
        return []
    candidatos = [i for i in range(1, len(alturas) - 1)
                  if alturas[i] >= alturas[i - 1] and alturas[i] > alturas[i + 1]]
    conservados: List[int] = []
    for i in sorted(candidatos, key=lambda j: -alturas[j]):      # primero los más pronunciados
        if all(abs(tiempos[i] - tiempos[j]) >= MIN_SEPARACION_S for j in conservados):
            conservados.append(i)
    conservados.sort()
    contactos = []
    for n, i in enumerate(conservados):
        valle_izq = alturas[conservados[n - 1]:i + 1].min() if n > 0 else alturas[:i + 1].min()
        valle_der = alturas[i:conservados[n + 1] + 1].min() if n + 1 < len(conservados) else alturas[i:].min()
        if alturas[i] - max(valle_izq, valle_der) >= MIN_PROMINENCIA:
            contactos.append(i)
    return contactos


def _simetria(a: float, b: float) -> float:
    """Índice de simetría entre dos valores equivalentes de ambas piernas (0-100)."""
    return round(max(0.0, 100.0 - abs(a - b) / max(a, b, 1.0) * 100.0), 2)


def analizar_zancadas(cuadros: List[Dict[str, Any]]) -> Dict[str, Any]:
    piernas: Dict[str, Any] = {}
    for nombre, punto_tobillo, clave_rodilla in PIERNAS:
        tiempos, alturas, rodillas = _serie(cuadros, punto_tobillo, clave_rodilla)
        indices = hallar_contactos(tiempos, alturas)
        zancadas = []
        for inicio, fin in zip(indices[:-1], indices[1:]):
            tramo = rodillas[inicio:fin + 1]
            tramo = tramo[~np.isnan(tramo)]
            zancadas.append({
                't_inicio': round(float(tiempos[inicio]), 3), 't_fin': round(float(tiempos[fin]), 3),
                'duracion_s': round(float(tiempos[fin] - tiempos[inicio]), 3),
                'rodilla_min': round(float(tramo.min()), 1) if len(tramo) else None,
                'rodilla_max': round(float(tramo.max()), 1) if len(tramo) else None,
            })
        piernas[nombre] = {'contactos': [round(float(tiempos[i]), 3) for i in indices], 'zancadas': zancadas}

    resultado: Dict[str, Any] = {'metodo': 'maximo_local_tobillo_vertical', 'piernas': piernas, 'valida': False}
    n_izq, n_der = len(piernas['izquierda']['zancadas']), len(piernas['derecha']['zancadas'])
    resultado['conteo_zancadas'] = {'izquierda': n_izq, 'derecha': n_der}
    if min(n_izq, n_der) < MIN_ZANCADAS_POR_PIERNA:
        resultado['motivo'] = 'zancadas_insuficientes'
        return resultado

    duraciones = [z['duracion_s'] for p in piernas.values() for z in p['zancadas']]
    resultado['tiempo_zancada_medio_s'] = round(float(np.mean(duraciones)), 3)
    resultado['cv_tiempo_zancada_pct'] = round(float(np.std(duraciones) / np.mean(duraciones) * 100), 1)
    resultado['cadencia_pasos_min'] = round(120.0 / float(np.mean(duraciones)), 1)   # dos pasos por zancada

    def promedio(pierna: str, campo: str):
        valores = [z[campo] for z in piernas[pierna]['zancadas'] if z[campo] is not None]
        return float(np.mean(valores)) if valores else None

    minimos = {p: promedio(p, 'rodilla_min') for p in ('izquierda', 'derecha')}
    maximos = {p: promedio(p, 'rodilla_max') for p in ('izquierda', 'derecha')}
    resultado['rodilla_min_media'] = {p: (round(v, 1) if v is not None else None) for p, v in minimos.items()}
    resultado['rodilla_max_media'] = {p: (round(v, 1) if v is not None else None) for p, v in maximos.items()}
    if None in minimos.values() or None in maximos.values():
        resultado['motivo'] = 'angulos_insuficientes'
        return resultado
    # Simetría por ciclo: se comparan, pierna contra pierna, los valores equivalentes de cada zancada.
    resultado['simetria_por_ciclo'] = {'rodilla_min': _simetria(minimos['izquierda'], minimos['derecha']),
                                       'rodilla_max': _simetria(maximos['izquierda'], maximos['derecha'])}
    resultado['valida'] = True
    return resultado
