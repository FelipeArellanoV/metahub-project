"""
=========================================================================================
PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco

Memoria / Trabajo de Título:
Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
Profesor Guía: Dr. Marcos Lévano

Módulo: Motor de Métricas Biomecánicas (metrics_engine.py)
Descripción: Calcula cinemática 2D a partir de puntos de referencia corporales (Landmarks)
             estimados por MediaPipe BlazePose:
             1. Ángulo articular de rodilla (Flexión/Extensión: Cadera-Rodilla-Tobillo).
             2. Ángulo articular de cadera (Hombro-Cadera-Rodilla).
             3. Índice de Simetría de Extensión de Zancada entre extremidades inferiores.
=========================================================================================
"""

import math
from typing import Dict, List, Any


def calculate_angle(punto_a: List[float], punto_b: List[float], punto_c: List[float]) -> float:
    """
    Calcula el ángulo en grados formado por tres coordenadas 2D (A, B, C),
    donde el punto B representa la articulación o vértice central.

    Fundamento matemático:
    Utiliza la función arcotangente de dos argumentos (atan2) para calcular el ángulo
    entre los vectores BA y BC en el plano sagital de carrera.

    Parámetros:
        punto_a: Coordenada [x, y] del segmento proximal (ej. cadera)
        punto_b: Coordenada [x, y] de la articulación vértice (ej. rodilla)
        punto_c: Coordenada [x, y] del segmento distal (ej. tobillo)

    Retorna:
        Ángulo articular en grados sexagesimales [0.0° - 180.0°] redondeado a dos decimales.
    """
    radianes = math.atan2(punto_c[1] - punto_b[1], punto_c[0] - punto_b[0]) - \
               math.atan2(punto_a[1] - punto_b[1], punto_a[0] - punto_b[0])
    
    angulo = abs(math.degrees(radianes))
    if angulo > 180.0:
        angulo = 360.0 - angulo
        
    return round(angulo, 2)


def compute_biomechanical_metrics(keypoints: Dict[str, List[float]]) -> Dict[str, Any]:
    """
    Procesa un conjunto de puntos clave corporales y calcula el set de métricas
    biomecánicas longitudinales para el seguimiento de la técnica de carrera escolar.

    Parámetros:
        keypoints: Diccionario con coordenadas 2D normalizadas de puntos anatómicos:
                   'left_hip', 'left_knee', 'left_ankle',
                   'right_hip', 'right_knee', 'right_ankle',
                   y opcionalmente 'left_shoulder', 'right_shoulder'.

    Retorna:
        Diccionario con las métricas cinemáticas calculadas:
        - left_knee_angle: Ángulo de flexión/extensión de rodilla izquierda (grados)
        - right_knee_angle: Ángulo de flexión/extensión de rodilla derecha (grados)
        - left_hip_angle: Ángulo de flexión de cadera izquierda (si existen hombros)
        - right_hip_angle: Ángulo de flexión de cadera derecha (si existen hombros)
        - symmetry_score: Porcentaje de simetría bilateral de extensión [0% - 100%]
    """
    metrics: Dict[str, Any] = {}

    # 1. Ángulo de Rodilla Izquierda (Cadera -> Rodilla -> Tobillo)
    if all(k in keypoints for k in ['left_hip', 'left_knee', 'left_ankle']):
        metrics['left_knee_angle'] = calculate_angle(
            keypoints['left_hip'],
            keypoints['left_knee'],
            keypoints['left_ankle']
        )

    # 2. Ángulo de Rodilla Derecha (Cadera -> Rodilla -> Tobillo)
    if all(k in keypoints for k in ['right_hip', 'right_knee', 'right_ankle']):
        metrics['right_knee_angle'] = calculate_angle(
            keypoints['right_hip'],
            keypoints['right_knee'],
            keypoints['right_ankle']
        )

    # 3. Ángulo de Cadera Izquierda (Hombro -> Cadera -> Rodilla) si están disponibles
    if all(k in keypoints for k in ['left_shoulder', 'left_hip', 'left_knee']):
        metrics['left_hip_angle'] = calculate_angle(
            keypoints['left_shoulder'],
            keypoints['left_hip'],
            keypoints['left_knee']
        )

    # 4. Ángulo de Cadera Derecha (Hombro -> Cadera -> Rodilla) si están disponibles
    if all(k in keypoints for k in ['right_shoulder', 'right_hip', 'right_knee']):
        metrics['right_hip_angle'] = calculate_angle(
            keypoints['right_shoulder'],
            keypoints['right_hip'],
            keypoints['right_knee']
        )

    # 5. Índice de Simetría Bilateral de Extensión de Rodilla
    # Evalúa la discrepancia porcentual entre ambos miembros inferiores
    if 'left_knee_angle' in metrics and 'right_knee_angle' in metrics:
        izq = metrics['left_knee_angle']
        der = metrics['right_knee_angle']
        diferencia = abs(izq - der)
        denominador = max(izq, der, 1.0)
        simetria = max(0.0, round(100.0 - (diferencia / denominador * 100.0), 2))
        metrics['symmetry_score'] = simetria

    return metrics
