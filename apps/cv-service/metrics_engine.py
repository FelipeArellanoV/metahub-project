import math

def calculate_angle(a, b, c):
    """
    Calcula el ángulo en grados formado por tres puntos 2D (A, B, C) donde B es el vértice.
    a: (x, y), b: (x, y) [vértice], c: (x, y)
    """
    radians = math.atan2(c[1] - b[1], c[0] - b[0]) - math.atan2(a[1] - b[1], a[0] - b[0])
    angle = abs(math.degrees(radians))
    if angle > 180.0:
        angle = 360.0 - angle
    return round(angle, 2)

def compute_biomechanical_metrics(keypoints):
    """
    Calcula ángulos articulares clave para análisis de técnica de carrera.
    keypoints dict: {'left_hip', 'left_knee', 'left_ankle', 'right_hip', 'right_knee', 'right_ankle'}
    """
    metrics = {}
    
    # Ángulo de rodilla izquierda (Hip -> Knee -> Ankle)
    if all(k in keypoints for k in ['left_hip', 'left_knee', 'left_ankle']):
        metrics['left_knee_angle'] = calculate_angle(
            keypoints['left_hip'], keypoints['left_knee'], keypoints['left_ankle']
        )

    # Ángulo de rodilla derecha (Hip -> Knee -> Ankle)
    if all(k in keypoints for k in ['right_hip', 'right_knee', 'right_ankle']):
        metrics['right_knee_angle'] = calculate_angle(
            keypoints['right_hip'], keypoints['right_knee'], keypoints['right_ankle']
        )

    # Puntuación de simetría de extensión de rodilla
    if 'left_knee_angle' in metrics and 'right_knee_angle' in metrics:
        left = metrics['left_knee_angle']
        right = metrics['right_knee_angle']
        diff = abs(left - right)
        symmetry_score = max(0.0, round(100.0 - (diff / max(left, right, 1.0) * 100.0), 2))
        metrics['symmetry_score'] = symmetry_score

    return metrics
