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
import numpy as np
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


def angulo_con_vertical(p_superior: List[float], p_inferior: List[float]) -> float:
    """Inclinación (0-90°) del segmento p_superior -> p_inferior respecto a la vertical de la imagen.

    Se informa en valor absoluto: desde una sola vista lateral no se conoce el sentido de avance,
    de modo que no se distingue inclinar hacia adelante o hacia atrás.
    """
    dx = abs(float(p_inferior[0]) - float(p_superior[0]))
    dy = abs(float(p_inferior[1]) - float(p_superior[1]))
    return round(math.degrees(math.atan2(dx, dy)), 2) if (dx or dy) else 0.0


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

    # 4b. Mediciones complementarias por lado (ADR-017): tobillo, inclinación de muslo, pierna y tronco.
    for lado in ('left', 'right'):
        if all(k in keypoints for k in (f'{lado}_knee', f'{lado}_ankle', f'{lado}_foot_index')):
            metrics[f'{lado}_ankle_angle'] = calculate_angle(
                keypoints[f'{lado}_knee'], keypoints[f'{lado}_ankle'], keypoints[f'{lado}_foot_index'])
        if all(k in keypoints for k in (f'{lado}_hip', f'{lado}_knee')):
            metrics[f'{lado}_thigh_inclination'] = angulo_con_vertical(keypoints[f'{lado}_hip'], keypoints[f'{lado}_knee'])
        if all(k in keypoints for k in (f'{lado}_knee', f'{lado}_ankle')):
            metrics[f'{lado}_shank_inclination'] = angulo_con_vertical(keypoints[f'{lado}_knee'], keypoints[f'{lado}_ankle'])
        if all(k in keypoints for k in (f'{lado}_shoulder', f'{lado}_hip')):
            metrics[f'{lado}_trunk_inclination'] = angulo_con_vertical(keypoints[f'{lado}_shoulder'], keypoints[f'{lado}_hip'])

    # 5. Índice de Simetría Bilateral de Extensión de Rodilla
    # Evalúa la discrepancia porcentual entre ambos miembros inferiores
    if 'left_knee_angle' in metrics and 'right_knee_angle' in metrics:
        izq = metrics['left_knee_angle']
        der = metrics['right_knee_angle']
        diferencia = abs(izq - der)
        denominador = max(izq, der, 1.0)
        simetria = max(0.0, round(100.0 - (diferencia / denominador * 100.0), 2))
        metrics['symmetry_score'] = simetria

    # 6. Clasificación de Sector / Fase Cinemática (Metodología UCT Arellano & Henríquez)
    metrics['phase_sector'] = classify_kinematic_sector(keypoints, metrics)

    return metrics


def classify_kinematic_sector(keypoints: Dict[str, List[float]], metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clasifica el fotograma en uno de los 3 Sectores Cinemáticos del modelo de la tesis:
    - Sector 1: PROPULSIÓN (Triple extensión de despegue)
    - Sector 2: VUELO / RECOBRO (Péndulo corto de rodilla al glúteo)
    - Sector 3: CONTACTO ACTIVO (Impacto de metatarso y amortiguación activa)
    """
    knee_left = metrics.get('left_knee_angle', 140.0)
    knee_right = metrics.get('right_knee_angle', 140.0)
    max_knee = max(knee_left, knee_right)
    min_knee = min(knee_left, knee_right)

    # Sector 1: Propulsión (Apertura mayor a 155° en pierna de empuje)
    if max_knee >= 155.0:
        return {
            "id": 1,
            "name": "Sector 1: Propulsión",
            "tag": "PROPULSIÓN",
            "color": "#ffaa00",
            "focus": "Triple Extensión (Cadera-Rodilla-Tobillo)",
            "target": "165° - 175°"
        }
    # Sector 2: Vuelo / Recobro (Flexión aguda menor a 115° en pierna libre)
    elif min_knee <= 115.0:
        return {
            "id": 2,
            "name": "Sector 2: Vuelo / Recobro",
            "tag": "VUELO / RECOBRO",
            "color": "#00c2ff",
            "focus": "Péndulo Corto de Rodilla (Talón al Glúteo)",
            "target": "Flexión < 65° / Elevación > 85°"
        }
    # Sector 3: Contacto Activo (Fase de transición / aterrizaje)
    else:
        return {
            "id": 3,
            "name": "Sector 3: Contacto Activo",
            "tag": "CONTACTO ACTIVO",
            "color": "#00f5a0",
            "focus": "Impacto de Metatarso bajo Centro de Masa",
            "target": "Alineación vertical sin frenado"
        }


MIN_MUESTRAS_POR_PIERNA = 12      # muestras mínimas por pierna para estimar su rango
MIN_ROM_GRADOS = 15.0            # rango mínimo: por debajo no hay zancada observable


def calcular_simetria_sesion(left_knee_series, right_knee_series):
    """
    Índice de simetría de SESIÓN (ADR-013).

    El índice por cuadro compara el ángulo de ambas rodillas en el mismo instante. En la
    carrera las piernas están desfasadas, de modo que esa diferencia mide la fase de la
    zancada y no la asimetría. Aquí se resume cada pierna por separado en toda la sesión
    (rango de movimiento = percentil 95 - percentil 5 del ángulo de rodilla, robusto a
    valores atípicos) y luego se comparan los resúmenes de ambas piernas:

        SI = 100 - |ROM_izq - ROM_der| / max(ROM_izq, ROM_der) * 100

    Es independiente de la fase. Requiere varias zancadas por pierna; si no hay datos
    suficientes devuelve valid=False y no un valor engañoso. Es un indicador preliminar
    de la amplitud: no distingue el apoyo del vuelo ni sustituye a un análisis por ciclo.
    """
    def rom(series):
        s = [float(v) for v in series]
        if len(s) < MIN_MUESTRAS_POR_PIERNA:
            return None
        lo, hi = np.percentile(s, [5, 95])
        return float(hi - lo)

    r_l, r_r = rom(left_knee_series), rom(right_knee_series)
    out = {"left_rom": r_l, "right_rom": r_r, "symmetry": None, "valid": False,
           "method": "rom_por_pierna_en_sesion"}
    if r_l is None or r_r is None:
        out["reason"] = "muestras_insuficientes"
        return out
    if min(r_l, r_r) < MIN_ROM_GRADOS:
        out["reason"] = "rango_insuficiente"
        return out
    out["symmetry"] = round(max(0.0, 100.0 - abs(r_l - r_r) / max(r_l, r_r) * 100.0), 2)
    out["left_rom"], out["right_rom"] = round(r_l, 1), round(r_r, 1)
    out["valid"] = True
    return out


def resumir_articulaciones(series: Dict[str, List[float]]) -> Dict[str, Any]:
    """Resumen por articulación (ADR-017): rango de movimiento por pierna (percentil 95 - percentil 5) y simetría.

    `series` tiene claves como 'rodilla_izq', 'rodilla_der', 'cadera_izq', ... con las series por cuadro.
    Para cada articulación bilateral devuelve ROM por pierna y simetría de sesión (mismo método que ADR-013).
    También devuelve la simetría multiarticular: promedio de las simetrías evaluables.
    """
    out: Dict[str, Any] = {"articulaciones": {}}
    validas = []
    for art in ("rodilla", "cadera", "tobillo", "muslo_inclinacion", "pierna_inclinacion"):
        sim = calcular_simetria_sesion(series.get(f"{art}_izq", []), series.get(f"{art}_der", []))
        out["articulaciones"][art] = {"rom_izquierda": sim["left_rom"], "rom_derecha": sim["right_rom"],
                                      "simetria": sim["symmetry"], "evaluable": sim["valid"]}
        if sim["valid"] and art in ("rodilla", "cadera", "tobillo"):
            validas.append(sim["symmetry"])
    out["simetria_multiarticular"] = round(float(np.mean(validas)), 2) if validas else None
    out["articulaciones_evaluadas"] = len(validas)
    tr = [float(v) for v in series.get("tronco_inclinacion", [])]
    if len(tr) >= MIN_MUESTRAS_POR_PIERNA:
        out["tronco_inclinacion"] = {"media": round(float(np.mean(tr)), 1),
                                     "p5": round(float(np.percentile(tr, 5)), 1),
                                     "p95": round(float(np.percentile(tr, 95)), 1)}
    else:
        out["tronco_inclinacion"] = None
    return out


def calculate_ipt_evaluation(
    peak_knee_ext: float,
    min_knee_rec: float,
    avg_symmetry: float,
    flexion_cadera: float = 0.0,
    symmetry_available: bool = True
) -> Dict[str, Any]:
    """
    Calcula el Índice Propietario de Perfeccionamiento Técnico (IPT MetaHub UCT).
    Fórmula de Autoría (Felipe Arellano & Sofía Henríquez, 2026):
        IPT = (0.40 * Score_Propulsión) + (0.35 * Score_Recobro) + (0.25 * Simetría_Bilateral)

    Parámetros:
        peak_knee_ext: Máximo ángulo de extensión alcanzado en propulsión (grados).
        min_knee_rec: Mínimo ángulo de flexión alcanzado en recobro (grados).
        avg_symmetry: Índice de simetría bilateral promedio (%).
        flexion_cadera: Flexión máxima de cadera (180° - mínimo del ángulo hombro-cadera-rodilla).
            Solo se informa: no se puntúa porque no hay una referencia absoluta verificable (ADR-016).

    Retorna:
        Diccionario con el score IPT [0-100], desglose por sector, categoría clínica y prescripción.
    """
    # 1. Score Sector 1: Propulsión (Óptimo entre 165° y 175°, centro en 170°)
    # Valor objetivo de la tesis: 165° - 175° (Triple extensión completa)
    if 165.0 <= peak_knee_ext <= 175.0:
        score_prop = 100.0 - (abs(peak_knee_ext - 170.0) * 1.5)
    elif peak_knee_ext > 175.0:
        score_prop = max(50.0, 100.0 - (peak_knee_ext - 175.0) * 3.5)
    else:
        score_prop = max(30.0, 100.0 - (165.0 - peak_knee_ext) * 2.8)
    score_prop = round(max(0.0, min(100.0, score_prop)), 1)

    # 2. Score Sector 2: Vuelo / Recobro (flexión de rodilla en el balanceo)
    # Referencia: Novacheck (1998) informa una flexión máxima de rodilla en el balanceo de unos 90° al correr,
    # 105° al esprintar y hasta 130° en un velocista muy entrenado; con ángulo interior = 180° - flexión,
    # equivale a unos 90°, 75° y 50°. El umbral de 70° corresponde a un velocista entrenado: respaldo parcial.
    if min_knee_rec <= 70.0:
        score_rec_flex = 100.0 - (max(0.0, min_knee_rec - 60.0) * 1.2)
    else:
        # Penalización proporcional por péndulo largo (talón no sube al glúteo)
        score_rec_flex = max(20.0, 100.0 - ((min_knee_rec - 70.0) * 0.95))
    # La flexión de cadera se informa pero no se puntúa (ADR-016): antes se comparaba el percentil 95 del
    # ángulo hombro-cadera-rodilla (que mide extensión) con un umbral de elevación, y siempre se cumplía.
    score_rec = round(score_rec_flex, 1)

    # 3. Score Sector 3 / Simetría Bilateral de Apoyo
    # Valor objetivo de la tesis: Simetría bilateral >= 92% (evitar asimetrías y frenado)
    if avg_symmetry >= 92.0:
        score_symm = round(min(100.0, 90.0 + ((avg_symmetry - 92.0) * 1.25)), 1)
    else:
        score_symm = round(max(20.0, 90.0 - ((92.0 - avg_symmetry) * 3.2)), 1)

    # Si la simetría de sesión no es evaluable (pocas zancadas por pierna), no se castiga ni
    # se premia: el sector toma el valor ponderado de los otros dos y el IPT queda provisional.
    if not symmetry_available:
        score_symm = round(((0.40 * score_prop) + (0.35 * score_rec)) / 0.75, 1)

    # 4. Fórmula Compuesta Ponderada IPT UCT
    ipt = round((0.40 * score_prop) + (0.35 * score_rec) + (0.25 * score_symm), 1)

    # 5. Categoría Metodológica UCT
    if ipt >= 90.0:
        categoria = "Técnica Consolidada / Élite Escolar"
        color = "#00f5a0"
        badge = "NIVEL I · ÉLITE"
        diagnostico = "Mecánica de zancada simétrica con excelente transferencia propulsiva y palanca corta de vuelo."
    elif ipt >= 75.0:
        categoria = "En Perfeccionamiento (Déficit Menor)"
        color = "#00c2ff"
        badge = "NIVEL II · EN DESARROLLO"
        diagnostico = "Patrón cinemático funcional con oportunidad de optimización en uno de los sectores biomecánicos."
    else:
        categoria = "Fase de Corrección Requerida (Bandera Roja)"
        color = "#ff3366"
        badge = "NIVEL III · CORRECCIÓN PRIORITARIA"
        diagnostico = "Presencia de déficit mecánico o asimetría que compromete la velocidad terminal o eleva fatiga."

    # 6. Identificación del Sector Deficitario y Generación de Prescripción Inteligente
    planes_entrenamiento = {
        "Sector 1: Propulsión": {
            "causa_biomecanica": "Despegue prematuro o incompleto de la pierna de empuje (<160° o >175°). El estudiante trunca la fuerza horizontal reactiva generada por la cadena extensora (glúteo mayor, cuádriceps y tríceps sural).",
            "cue_verbal": "¡Empuja el suelo hacia atrás como si quisieras deslizar la pista hacia atrás!",
            "ejercicios": [
                {
                    "fase": "Fase 1 · Activación",
                    "nombre": "Empuje en pared a 45° con triple extensión",
                    "protocolo": "3 series x 8 reps por pierna (pausa isométrica de 2s en bloqueo)",
                    "foco": "Alinear tobillo, rodilla y cadera sin arquear la zona lumbar."
                },
                {
                    "fase": "Fase 2 · Fuerza Reactiva",
                    "nombre": "Bounding unipodal reactivo en pista",
                    "protocolo": "4 series x 15 metros buscando máxima proyección horizontal",
                    "foco": "Aplicar fuerza contra el tartán en lugar de saltar hacia arriba."
                },
                {
                    "fase": "Fase 3 · Transferencia",
                    "nombre": "Sprint lanzado con arrastre ligero (5-8% peso corporal)",
                    "protocolo": "3 pasadas x 30m al 95% de intensidad",
                    "foco": "Sentir la extensión completa antes de cambiar de apoyo."
                }
            ],
            "error_evitar": "Evitar inclinar el torso excesivamente hacia adelante, lo que quiebra la línea de transmisión de fuerza lumbo-pélvica."
        },
        "Sector 2: Recobro": {
            "causa_biomecanica": "Péndulo largo de rodilla (>75°) durante el vuelo. El talón queda rezagado y no sube hacia el glúteo, lo que cuadruplica el momento de inercia y ralentiza la cadencia de zancada.",
            "cue_verbal": "¡Talón instantáneo al glúteo, como si pisaras asfalto ardiendo!",
            "ejercicios": [
                {
                    "fase": "Fase 1 · Aislamiento",
                    "nombre": "Talón al glúteo dinámico con dorsiflexión activa",
                    "protocolo": "3 series x 20 reps en el lugar con cadencia rápida",
                    "foco": "El talón debe rozar el isquion con el tobillo a 90°."
                },
                {
                    "fase": "Fase 2 · Coordinación",
                    "nombre": "Skipping A sobre micro-vallas de 30-40cm",
                    "protocolo": "4 series x 8 vallas espaciadas a 1.2 metros",
                    "foco": "Obligar a la rodilla a subir por encima de la valla con palanca corta."
                },
                {
                    "fase": "Fase 3 · Transferencia",
                    "nombre": "Aceleración progresiva con foco 'Rodilla Alta / Talón Rápido'",
                    "protocolo": "3 pasadas x 40m alcanzando 90% de velocidad",
                    "foco": "Mantener la cadencia rápida sin arrastrar los pies hacia atrás."
                }
            ],
            "error_evitar": "Evitar 'patear hacia atrás' antes de recoger la pierna; la trayectoria del talón debe ser circular y hacia adelante."
        },
        "Sector 3: Simetría / Contacto": {
            "causa_biomecanica": "Asimetría bilateral de fuerza o aterrizaje adelantado al centro de gravedad (Overstriding), lo que genera frenado articular y sobrecarga la articulación de la rodilla.",
            "cue_verbal": "¡Pisa firme justo debajo de tus caderas, rebotando como un resorte rígido!",
            "ejercicios": [
                {
                    "fase": "Fase 1 · Estabilidad",
                    "nombre": "Puente glúteo unilateral y plancha lateral con abducción",
                    "protocolo": "3 series x 12 repeticiones por pierna",
                    "foco": "Eliminar la caída pélvica dinámica (signo de Trendelenburg)."
                },
                {
                    "fase": "Fase 2 · Pliometría Unilateral",
                    "nombre": "Saltos unipodales sobre cajón bajo (20cm) con caída rígida",
                    "protocolo": "3 series x 6 saltos por pierna con amortiguación breve",
                    "foco": "Nivelar la rigidez articular entre ambas piernas."
                },
                {
                    "fase": "Fase 3 · Transferencia",
                    "nombre": "Pasadas de 30m sobre línea recta con metatarso activo",
                    "protocolo": "4 pasadas buscando contacto neutro sin cruzar pies",
                    "foco": "Igualar la longitud de zancada entre pierna izquierda y derecha."
                }
            ],
            "error_evitar": "Evitar el apoyo de talón (taloneo), que frena el avance y absorbe la energía en lugar de devolverla reactivamente."
        }
    }

    scores = [
        {"sector": "Sector 1: Propulsión", "score": score_prop, "drill": "Empuje en Pared a 45° con Triple Extensión (3x8) y Bounding reactivo"},
        {"sector": "Sector 2: Recobro", "score": score_rec, "drill": "Skipping A con vallas bajas de 40cm (4x8 vallas) para acortar péndulo"},
        {"sector": "Sector 3: Simetría / Contacto", "score": score_symm, "drill": "Pliometría unipodal con estabilización pélvica y apoyo de metatarso"}
    ]
    menor = min(scores, key=lambda s: s['score'])
    plan_activo = planes_entrenamiento.get(menor['sector'], planes_entrenamiento["Sector 2: Recobro"])

    return {
        "ipt_score": ipt,
        "categoria": categoria,
        "color": color,
        "badge": badge,
        "diagnostico": diagnostico,
        "desglose_sectores": {
            "sector_1_propulsion": {
                "nombre": "Sector 1: Propulsión",
                "score": score_prop,
                "angulo_real": peak_knee_ext,
                "rango_optimo": "165° - 175°",
                "ponderacion": "40%"
            },
            "sector_2_recobro": {
                "nombre": "Sector 2: Vuelo / Recobro",
                "score": score_rec,
                "angulo_real": min_knee_rec,
                "rango_optimo": "< 70° (Talón a glúteo)",
                "ponderacion": "35%"
            },
            "simetria_bilateral": {
                "nombre": "Sector 3: Contacto / Simetría",
                "score": score_symm,
                "porcentaje_real": avg_symmetry,
                "rango_optimo": "≥ 92.0%",
                "ponderacion": "25%"
            }
        },
        "flexion_cadera_max": round(flexion_cadera, 1),
        "referencias": [
            {"parametro": "Propulsión: extensión de rodilla 165°-175°", "estado": "diseno_a_calibrar",
             "fuente": "Sin fuente verificada; calibrar con datos de validación"},
            {"parametro": "Recobro: ángulo interior de rodilla <= 70°", "estado": "respaldo_parcial",
             "fuente": "Novacheck (1998): flexión de balanceo ~90° correr, ~105° esprint, hasta 130° velocistas entrenados"},
            {"parametro": "Simetría >= 92%", "estado": "diseno_a_calibrar",
             "fuente": "Sin umbral universal; Exell et al. (2012): considerar la variabilidad intra-extremidad"},
            {"parametro": "Pesos 0,40 / 0,35 / 0,25", "estado": "diseno_a_calibrar",
             "fuente": "Decisión de diseño; acotada con análisis de sensibilidad"},
            {"parametro": "Flexión máxima de cadera", "estado": "solo_informativo",
             "fuente": "Novacheck (1998): aumenta con la velocidad; sin valor absoluto"}
        ],
        "sector_prioritario": menor['sector'],
        "drill_prescrito": menor['drill'],
        "prescripcion_completa": {
            "sector": menor['sector'],
            "causa_biomecanica": plan_activo["causa_biomecanica"],
            "cue_verbal": plan_activo["cue_verbal"],
            "ejercicios": plan_activo["ejercicios"],
            "error_evitar": plan_activo["error_evitar"]
        },
        "metodologia": "Modelo Cinemático UCT · Arellano & Henríquez (2026)"
    }

