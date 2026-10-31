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
