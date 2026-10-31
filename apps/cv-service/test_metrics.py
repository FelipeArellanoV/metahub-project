"""
=========================================================================================
PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco

Memoria / Trabajo de Título:
Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
Profesor Guía: Dr. Marcos Lévano

Módulo: Suite de Pruebas Cinemáticas (test_metrics.py)
Descripción: Valida los algoritmos de cálculo geométrico angular e índice de simetría.
=========================================================================================
"""

from metrics_engine import calculate_angle, compute_biomechanical_metrics


def test_calculate_angle_right_angle():
    """Valida el cálculo de un ángulo ortogonal de 90.0°"""
    angle = calculate_angle([1.0, 0.0], [0.0, 0.0], [0.0, 1.0])
    assert angle == 90.0, f"Se esperaba 90.0°, se obtuvo {angle}°"


def test_calculate_angle_straight_line():
    """Valida el cálculo de un segmento extendido de 180.0°"""
    angle = calculate_angle([-1.0, 0.0], [0.0, 0.0], [1.0, 0.0])
    assert angle == 180.0, f"Se esperaba 180.0°, se obtuvo {angle}°"


def test_compute_biomechanical_metrics():
    """Valida la consistencia de métricas de flexión de rodilla y simetría bilateral (100%)"""
    keypoints = {
        'left_hip': [0.5, 0.2],
        'left_knee': [0.5, 0.5],
        'left_ankle': [0.5, 0.8],
        'right_hip': [0.6, 0.2],
        'right_knee': [0.6, 0.5],
        'right_ankle': [0.6, 0.8]
    }
    metrics = compute_biomechanical_metrics(keypoints)
    assert 'left_knee_angle' in metrics, "Falta left_knee_angle en métricas"
    assert 'right_knee_angle' in metrics, "Falta right_knee_angle en métricas"
    assert metrics['left_knee_angle'] == 180.0
    assert metrics['right_knee_angle'] == 180.0
    assert metrics['symmetry_score'] == 100.0, "La simetría bilateral perfecta debe ser 100.0%"


def test_session_symmetry_independiente_de_fase():
    """Piernas simétricas pero desfasadas (como en la carrera) deben dar 100 %; el índice por cuadro no."""
    import numpy as np
    from metrics_engine import calcular_simetria_sesion
    x = np.linspace(0, 6 * np.pi, 120)
    izq = 120 + 40 * np.sin(x)
    der = 120 + 40 * np.sin(x + np.pi)
    r = calcular_simetria_sesion(izq, der)
    assert r["valid"] and r["symmetry"] == 100.0


def test_session_symmetry_detecta_asimetria_real():
    import numpy as np
    from metrics_engine import calcular_simetria_sesion
    x = np.linspace(0, 6 * np.pi, 120)
    r = calcular_simetria_sesion(120 + 40 * np.sin(x), 120 + 25 * np.sin(x + np.pi))
    assert r["valid"] and 55.0 < r["symmetry"] < 70.0


def test_session_symmetry_sin_datos_suficientes():
    from metrics_engine import calcular_simetria_sesion
    r = calcular_simetria_sesion([120.0] * 5, [130.0] * 5)
    assert r["valid"] is False and r["symmetry"] is None and r["reason"] == "muestras_insuficientes"
    r2 = calcular_simetria_sesion([120.0 + (i % 2) for i in range(30)], [130.0 + (i % 2) for i in range(30)])
    assert r2["valid"] is False and r2["reason"] == "rango_insuficiente"


def test_ipt_cadera_se_informa_pero_no_se_puntua():
    from metrics_engine import calculate_ipt_evaluation
    a = calculate_ipt_evaluation(170.0, 60.0, 95.0, 20.0)
    b = calculate_ipt_evaluation(170.0, 60.0, 95.0, 120.0)
    assert a["ipt_score"] == b["ipt_score"]            # la cadera no altera el índice
    assert a["flexion_cadera_max"] == 20.0 and b["flexion_cadera_max"] == 120.0


def test_ipt_recobro_depende_solo_de_la_rodilla():
    from metrics_engine import calculate_ipt_evaluation
    bueno = calculate_ipt_evaluation(170.0, 60.0, 95.0, 60.0)
    malo = calculate_ipt_evaluation(170.0, 100.0, 95.0, 60.0)
    assert malo["ipt_score"] < bueno["ipt_score"]
    assert bueno["desglose_sectores"]["sector_2_recobro"]["score"] == 100.0


def test_ipt_informa_estado_de_cada_parametro():
    from metrics_engine import calculate_ipt_evaluation
    r = calculate_ipt_evaluation(170.0, 60.0, 95.0, 60.0)
    estados = {x["parametro"]: x["estado"] for x in r["referencias"]}
    assert "respaldo_parcial" in estados.values() and "diseno_a_calibrar" in estados.values()
    assert len(r["referencias"]) == 5


def test_angulo_con_vertical():
    from metrics_engine import angulo_con_vertical
    assert angulo_con_vertical([0, 0], [0, 100]) == 0.0
    assert angulo_con_vertical([0, 0], [100, 100]) == 45.0
    assert angulo_con_vertical([0, 0], [100, 0]) == 90.0
    assert angulo_con_vertical([100, 0], [0, 100]) == 45.0        # valor absoluto: no distingue el sentido


def test_metricas_complementarias_por_lado():
    from metrics_engine import compute_biomechanical_metrics
    kp = {'left_shoulder': [100, 0], 'left_hip': [100, 100], 'left_knee': [160, 200], 'left_ankle': [160, 300],
          'left_foot_index': [260, 300], 'right_hip': [100, 100], 'right_knee': [100, 200], 'right_ankle': [100, 300]}
    m = compute_biomechanical_metrics(kp)
    assert m['left_ankle_angle'] == 90.0                  # pierna vertical y pie horizontal
    assert m['left_shank_inclination'] == 0.0
    assert 30.0 < m['left_thigh_inclination'] < 31.0     # atan(60/100)
    assert m['left_trunk_inclination'] == 0.0
    assert 'right_ankle_angle' not in m                   # sin punta del pie no se inventa el ángulo


def test_resumen_por_articulacion_y_simetria_multiarticular():
    import numpy as np
    from metrics_engine import resumir_articulaciones
    x = np.linspace(0, 6 * np.pi, 120)
    series = {'rodilla_izq': 120 + 40 * np.sin(x), 'rodilla_der': 120 + 40 * np.sin(x + np.pi),   # simétrica
              'cadera_izq': 120 + 30 * np.sin(x), 'cadera_der': 120 + 15 * np.sin(x + np.pi),     # 50 %
              'tobillo_izq': [90.0] * 5, 'tobillo_der': [90.0] * 5,                              # insuficiente
              'tronco_inclinacion': [5.0 + (i % 3) for i in range(30)]}
    r = resumir_articulaciones(series)
    assert r['articulaciones']['rodilla']['simetria'] > 95.0
    assert 45.0 < r['articulaciones']['cadera']['simetria'] < 55.0
    assert r['articulaciones']['tobillo']['evaluable'] is False
    assert r['articulaciones_evaluadas'] == 2
    assert 70.0 < r['simetria_multiarticular'] < 78.0    # promedio de las dos evaluables
    assert r['tronco_inclinacion']['media'] == 6.0
    assert resumir_articulaciones({})['simetria_multiarticular'] is None


def test_ipt_excluye_simetria_si_no_es_evaluable():
    from metrics_engine import calculate_ipt_evaluation
    a = calculate_ipt_evaluation(170.0, 60.0, 0.0, 90.0, symmetry_available=False)
    b = calculate_ipt_evaluation(170.0, 60.0, 0.0, 90.0, symmetry_available=True)
    assert a["ipt_score"] > b["ipt_score"]


if __name__ == "__main__":
    test_calculate_angle_right_angle()
    test_calculate_angle_straight_line()
    test_compute_biomechanical_metrics()
    print("[OK] Todas las pruebas de cinematica articular de cv-service han pasado exitosamente.")
    test_session_symmetry_independiente_de_fase()
    test_session_symmetry_detecta_asimetria_real()
    test_session_symmetry_sin_datos_suficientes()
    test_ipt_excluye_simetria_si_no_es_evaluable()
    test_angulo_con_vertical()
    test_metricas_complementarias_por_lado()
    test_resumen_por_articulacion_y_simetria_multiarticular()
    test_ipt_cadera_se_informa_pero_no_se_puntua()
    test_ipt_recobro_depende_solo_de_la_rodilla()
    test_ipt_informa_estado_de_cada_parametro()
