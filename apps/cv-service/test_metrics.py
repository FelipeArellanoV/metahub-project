from metrics_engine import calculate_angle, compute_biomechanical_metrics

def test_calculate_angle_right_angle():
    # Ángulo recto de 90 grados (1,0) - (0,0) - (0,1)
    angle = calculate_angle([1.0, 0.0], [0.0, 0.0], [0.0, 1.0])
    assert angle == 90.0

def test_calculate_angle_straight_line():
    # Línea recta de 180 grados
    angle = calculate_angle([-1.0, 0.0], [0.0, 0.0], [1.0, 0.0])
    assert angle == 180.0

def test_compute_biomechanical_metrics():
    keypoints = {
        'left_hip': [0.5, 0.2],
        'left_knee': [0.5, 0.5],
        'left_ankle': [0.5, 0.8],
        'right_hip': [0.6, 0.2],
        'right_knee': [0.6, 0.5],
        'right_ankle': [0.6, 0.8]
    }
    metrics = compute_biomechanical_metrics(keypoints)
    assert 'left_knee_angle' in metrics
    assert 'right_knee_angle' in metrics
    assert metrics['left_knee_angle'] == 180.0
    assert metrics['right_knee_angle'] == 180.0
    assert metrics['symmetry_score'] == 100.0

if __name__ == "__main__":
    test_calculate_angle_right_angle()
    test_calculate_angle_straight_line()
    test_compute_biomechanical_metrics()
    print("✅ Todas las pruebas de cv-service han pasado correctamente.")
