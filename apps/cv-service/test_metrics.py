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


if __name__ == "__main__":
    test_calculate_angle_right_angle()
    test_calculate_angle_straight_line()
    test_compute_biomechanical_metrics()
    print("✅ Todas las pruebas de cinemática articular de cv-service han pasado exitosamente.")
