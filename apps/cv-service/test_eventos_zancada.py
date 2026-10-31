"""Pruebas del detector de eventos de zancada (T-10)."""
import math
import sys
sys.path.insert(0, '.')
from eventos_zancada import analizar_zancadas, hallar_contactos
import numpy as np


def cuadros_sinteticos(period=0.7, dur=10.0, dt=0.1, phase_r=0.5, amp_l=1.0, amp_r=1.0, noise=0.0, seed=1):
    rng = np.random.default_rng(seed)
    out = []
    for i in range(int(dur / dt)):
        t = round(i * dt, 3)
        yl = 0.80 + 0.10 * math.sin(2 * math.pi * t / period) + rng.normal(0, noise)
        yr = 0.80 + 0.10 * math.sin(2 * math.pi * (t / period - phase_r)) + rng.normal(0, noise)
        kl = 110 + 40 * amp_l * math.sin(2 * math.pi * t / period)
        kr = 110 + 40 * amp_r * math.sin(2 * math.pi * (t / period - phase_r))
        out.append({'time_sec': t, 'keypoints': {'left_ankle': [0.5, yl], 'right_ankle': [0.5, yr]},
                    'metrics': {'left_knee_angle': kl, 'right_knee_angle': kr}})
    return out


def test_detecta_zancadas_y_cadencia():
    r = analizar_zancadas(cuadros_sinteticos(period=0.7))
    assert r['valida'] is True
    assert 12 <= r['conteo_zancadas']['izquierda'] <= 14 and 12 <= r['conteo_zancadas']['derecha'] <= 14
    assert abs(r['tiempo_zancada_medio_s'] - 0.7) < 0.08
    assert abs(r['cadencia_pasos_min'] - 171) < 20


def test_simetria_por_ciclo_no_depende_de_la_fase():
    a = analizar_zancadas(cuadros_sinteticos(phase_r=0.5))
    b = analizar_zancadas(cuadros_sinteticos(phase_r=0.25))
    assert a['simetria_por_ciclo']['rodilla_max'] > 95 and b['simetria_por_ciclo']['rodilla_max'] > 95


def test_simetria_por_ciclo_detecta_asimetria_de_amplitud():
    r = analizar_zancadas(cuadros_sinteticos(amp_r=0.5))
    assert r['valida'] and r['simetria_por_ciclo']['rodilla_max'] < 90


def test_ruido_menor_a_la_prominencia_no_crea_contactos():
    t = np.arange(0, 6, 0.1)
    y = 0.8 + 0.005 * np.sin(2 * math.pi * t / 0.3)
    assert hallar_contactos(t, y) == []


def test_pocas_zancadas_no_son_evaluables():
    r = analizar_zancadas(cuadros_sinteticos(dur=1.8))
    assert r['valida'] is False and r['motivo'] == 'zancadas_insuficientes'


def test_sin_puntos_clave_no_inventa_datos():
    r = analizar_zancadas([{'time_sec': 0.0, 'keypoints': {}, 'metrics': {}}] * 5)
    assert r['valida'] is False and r['conteo_zancadas'] == {'izquierda': 0, 'derecha': 0}


if __name__ == '__main__':
    tests = [v for k, v in sorted(globals().items()) if k.startswith('test_')]
    for t in tests:
        t()
        print('OK  ', t.__name__)
    print(len(tests), 'pasadas')
