"""
=========================================================================================
PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco

Memoria / Trabajo de Título:
Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
Profesor Guía: Dr. Marcos Lévano

Módulo: API Microservicio de Visión por Computador (main.py)
Descripción: Servidor FastAPI con MediaPipe PoseLandmarker y OpenCV para procesar
             videos reales, extraer cuadros y computar cinemática y simetría.
=========================================================================================
"""

import os
import io
import cv2
import base64
import tempfile
import numpy as np
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks import python

from metrics_engine import compute_biomechanical_metrics, calculate_angle, calculate_ipt_evaluation, classify_kinematic_sector

# Inicialización de la aplicación FastAPI
app = FastAPI(
    title="MetaHub CV Service — Real Biomechanics Lab",
    description="Microservicio de Visión por Computador con MediaPipe Pose para análisis biomecánico real de carrera (Memoria UCT).",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicialización de MediaPipe PoseLandmarker
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "pose_landmarker_lite.task")
SAMPLE_VIDEO_PATH = os.path.join(os.path.dirname(__file__), "sample_sprinter_clip.mp4")

detector = None

def get_detector():
    global detector
    if detector is None:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(f"Modelo MediaPipe no encontrado en {MODEL_PATH}")
        base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            output_segmentation_masks=False
        )
        detector = vision.PoseLandmarker.create_from_options(options)
    return detector


class KeypointsPayload(BaseModel):
    left_hip: List[float] = Field(..., description="[x, y] cadera izquierda")
    left_knee: List[float] = Field(..., description="[x, y] rodilla izquierda")
    left_ankle: List[float] = Field(..., description="[x, y] tobillo izquierdo")
    right_hip: List[float] = Field(..., description="[x, y] cadera derecha")
    right_knee: List[float] = Field(..., description="[x, y] rodilla derecha")
    right_ankle: List[float] = Field(..., description="[x, y] tobillo derecho")
    left_shoulder: Optional[List[float]] = Field(None, description="[x, y] hombro izquierdo")
    right_shoulder: Optional[List[float]] = Field(None, description="[x, y] hombro derecho")


@app.get("/", summary="Información del microservicio")
def read_root():
    return {
        "servicio": "metahub-cv-service",
        "estado": "operativo",
        "modo": "real_inference",
        "motor_vision": "MediaPipe PoseLandmarker (Google)",
        "modelo_activo": os.path.basename(MODEL_PATH),
        "autores": ["Felipe Arellano Vargas", "Sofía Henríquez Soto"],
        "institucion": "Universidad Católica de Temuco",
        "version": "1.2.0"
    }


@app.get("/health", summary="Health Check")
def health_check():
    return {"status": "ok", "servicio": "cv-service", "mediapipe": "ready"}


@app.post("/api/cv/metrics", summary="Cálculo matemático de ángulos desde keypoints")
def calculate_metrics(payload: KeypointsPayload):
    try:
        datos = payload.dict(exclude_none=True)
        metricas = compute_biomechanical_metrics(datos)
        return {"status": "success", "metrics": metricas}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Conexiones óseas estándar de MediaPipe Pose para renderizar el esqueleto
SKELETON_CONNECTIONS = [
    (11, 12), # Hombro a hombro
    (11, 23), # Hombro izq a cadera izq
    (12, 24), # Hombro der a cadera der
    (23, 24), # Cadera a cadera
    (23, 25), # Cadera izq a rodilla izq
    (25, 27), # Rodilla izq a tobillo izq
    (24, 26), # Cadera der a rodilla der
    (26, 28), # Rodilla der a tobillo der
    (11, 13), # Brazo izq
    (13, 15), # Antebrazo izq
    (12, 14), # Brazo der
    (14, 16), # Antebrazo der
]


def draw_skeleton_on_frame(frame: np.ndarray, landmarks, metrics: Dict[str, Any]) -> np.ndarray:
    """Dibuja el esqueleto cinemático y los ángulos en el cuadro con OpenCV."""
    h, w, _ = frame.shape
    annotated = frame.copy()

    # Coordenadas en píxeles
    coords = {}
    for idx, lm in enumerate(landmarks):
        px = int(lm.x * w)
        py = int(lm.y * h)
        coords[idx] = (px, py)

    # 1. Dibujar conexiones óseas
    for start_idx, end_idx in SKELETON_CONNECTIONS:
        if start_idx in coords and end_idx in coords:
            p1 = coords[start_idx]
            p2 = coords[end_idx]
            # Solo si están en rango visible
            if 0 <= p1[0] < w and 0 <= p1[1] < h and 0 <= p2[0] < w and 0 <= p2[1] < h:
                cv2.line(annotated, p1, p2, (0, 245, 160), 3, cv2.LINE_AA)

    # 2. Dibujar nodos articulares
    for idx in [11, 12, 23, 24, 25, 26, 27, 28]:
        if idx in coords:
            p = coords[idx]
            if 0 <= p[0] < w and 0 <= p[1] < h:
                # Nodo central y halo
                cv2.circle(annotated, p, 7, (0, 194, 255), -1, cv2.LINE_AA)
                cv2.circle(annotated, p, 9, (255, 255, 255), 2, cv2.LINE_AA)

    # 3. Superponer valores de ángulos
    left_knee = metrics.get('left_knee_angle')
    if left_knee and 25 in coords:
        kp = coords[25]
        text = f"Rodilla: {left_knee:.1f}°"
        cv2.putText(annotated, text, (kp[0] + 12, kp[1] - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2, cv2.LINE_AA)

    symmetry = metrics.get('symmetry_score')
    if symmetry:
        sym_text = f"Simetria: {symmetry:.1f}%"
        color = (0, 245, 160) if symmetry >= 90.0 else (51, 102, 255)
        cv2.putText(annotated, sym_text, (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2, cv2.LINE_AA)

    # 4. Superponer Sector Cinemático (Metodología UCT Arellano & Henríquez)
    phase_sector = metrics.get('phase_sector')
    if phase_sector:
        sec_tag = phase_sector.get('tag', 'UCT CINEMÁTICA')
        cv2.putText(annotated, f"UCT [{sec_tag}]", (20, h - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 245, 160), 2, cv2.LINE_AA)

    return annotated


@app.post("/api/cv/process-video", summary="Extraer frames de video y procesar con MediaPipe real")
async def process_video(
    file: Optional[UploadFile] = File(None),
    use_sample: bool = Form(False),
    sample_stride: int = Form(3),
    max_frames: int = Form(150)
):
    """
    Recibe un archivo de video (.mp4, .webm, .mov) o usa el video de muestra de velocista.
    Extrae los cuadros con OpenCV, ejecuta MediaPipe PoseLandmarker en cada cuadro real,
    calcula ángulos vectoriales y simetría bilateral, y retorna la telemetría completa.
    """
    temp_path = None
    try:
        # Determinar fuente del video
        if use_sample or file is None:
            if not os.path.exists(SAMPLE_VIDEO_PATH):
                raise HTTPException(status_code=404, detail="Video de muestra no encontrado en el servidor.")
            video_source = SAMPLE_VIDEO_PATH
            video_filename = "sample_sprint.webm"
        else:
            suffix = os.path.splitext(file.filename)[1] or ".mp4"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                content = await file.read()
                tmp.write(content)
                temp_path = tmp.name
            video_source = temp_path
            video_filename = file.filename

        # Abrir video con OpenCV
        cap = cv2.VideoCapture(video_source)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="No se pudo decodificar el archivo de video.")

        raw_fps = cap.get(cv2.CAP_PROP_FPS)
        fps = raw_fps if (raw_fps and 1.0 <= raw_fps <= 240.0) else 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration_sec = round(total_frames / fps, 2) if (total_frames > 0 and fps > 0) else 0.0

        pose_detector = get_detector()

        processed_frames = []
        preview_frames = []
        frame_idx = 0
        frames_with_pose = 0

        knee_angles = []
        hip_angles = []
        symmetries = []

        # Procesar cuadros
        while cap.isOpened() and frame_idx < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_stride == 0:
                time_sec = round(frame_idx / fps, 3)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

                detection = pose_detector.detect(mp_image)

                frame_data = {
                    "frame_index": frame_idx,
                    "time_sec": time_sec,
                    "has_pose": False,
                    "metrics": None,
                    "landmarks_summary": None
                }

                if detection.pose_landmarks and len(detection.pose_landmarks) > 0:
                    frames_with_pose += 1
                    lm = detection.pose_landmarks[0]
                    frame_data["has_pose"] = True

                    # Coordenadas normalizadas clave
                    kp_dict = {
                        'left_hip': [round(lm[23].x, 4), round(lm[23].y, 4)],
                        'right_hip': [round(lm[24].x, 4), round(lm[24].y, 4)],
                        'left_knee': [round(lm[25].x, 4), round(lm[25].y, 4)],
                        'right_knee': [round(lm[26].x, 4), round(lm[26].y, 4)],
                        'left_ankle': [round(lm[27].x, 4), round(lm[27].y, 4)],
                        'right_ankle': [round(lm[28].x, 4), round(lm[28].y, 4)],
                        'left_shoulder': [round(lm[11].x, 4), round(lm[11].y, 4)],
                        'right_shoulder': [round(lm[12].x, 4), round(lm[12].y, 4)],
                    }

                    # Cálculo cinemático real con metrics_engine
                    metrics = compute_biomechanical_metrics(kp_dict)
                    frame_data["metrics"] = metrics
                    frame_data["keypoints"] = kp_dict

                    if 'left_knee_angle' in metrics:
                        knee_angles.append(metrics['left_knee_angle'])
                    if 'right_knee_angle' in metrics:
                        knee_angles.append(metrics['right_knee_angle'])
                    if 'left_hip_angle' in metrics:
                        hip_angles.append(metrics['left_hip_angle'])
                    if 'symmetry_score' in metrics:
                        symmetries.append(metrics['symmetry_score'])

                    # Resumen de landmarks corporales principales para la tabla
                    frame_data["landmarks_summary"] = {
                        "left_knee_x": kp_dict['left_knee'][0],
                        "left_knee_y": kp_dict['left_knee'][1],
                        "left_hip_x": kp_dict['left_hip'][0],
                        "left_hip_y": kp_dict['left_hip'][1],
                        "left_ankle_x": kp_dict['left_ankle'][0],
                        "left_ankle_y": kp_dict['left_ankle'][1]
                    }

                    # Guardar hasta 6 fotogramas de vista previa con esqueleto superpuesto
                    if len(preview_frames) < 8 and (frame_idx % (sample_stride * 3) == 0 or len(preview_frames) == 0):
                        annotated = draw_skeleton_on_frame(frame, lm, metrics)
                        # Redimensionar para reducir peso del JSON (ancho 480px)
                        preview_h = int(480 * height / width)
                        resized = cv2.resize(annotated, (480, preview_h))
                        _, buffer = cv2.imencode('.jpg', resized, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                        b64_str = base64.b64encode(buffer).decode('utf-8')
                        preview_frames.append({
                            "frame_index": frame_idx,
                            "time_sec": time_sec,
                            "image_base64": f"data:image/jpeg;base64,{b64_str}",
                            "metrics": metrics
                        })

                processed_frames.append(frame_data)

            frame_idx += 1

        cap.release()
        if total_frames <= 0 or duration_sec <= 0.0:
            total_frames = frame_idx
            duration_sec = round(frame_idx / fps, 2) if fps > 0 else 0.0

        # Resumen y diagnósticos basados en datos reales
        peak_knee = max(knee_angles) if knee_angles else 0.0
        min_knee = min(knee_angles) if knee_angles else 0.0
        peak_hip = max(hip_angles) if hip_angles else 0.0
        avg_symmetry = round(float(np.mean(symmetries)), 2) if symmetries else 0.0
        min_symmetry = min(symmetries) if symmetries else 0.0

        # Detección de anomalías y fortalezas reales
        anomalies = []
        praises = []

        if peak_knee > 165.0:
            praises.append({
                "type": "good",
                "badge": "TRIPLE EXTENSIÓN REAL",
                "message": f"Pico de extensión alcanzado de {peak_knee:.1f}°. Excelente transferencia propulsiva.",
                "color": "#00f5a0"
            })
        elif peak_knee < 152.0:
            anomalies.append({
                "type": "anomaly",
                "badge": "EXTENSIÓN INCOMPLETA",
                "message": f"Pico de rodilla limitado a {peak_knee:.1f}° (esperado >160°). Impulso truncado.",
                "advice": "Prescribir dril de empuje en pared o saltos de tobillo.",
                "color": "#ff3366"
            })

        if avg_symmetry >= 92.0:
            praises.append({
                "type": "good",
                "badge": "SIMETRÍA EXCELENTE",
                "message": f"Simetría bilateral media del {avg_symmetry}%. Equilibrio de zancada validado.",
                "color": "#00f5a0"
            })
        else:
            anomalies.append({
                "type": "anomaly",
                "badge": "ASIMETRÍA DETECTADA",
                "message": f"Simetría bilateral promedio de {avg_symmetry}% (caída mínima {min_symmetry}%).",
                "advice": "Revisar apoyo unipodal y prescribir Skipping unilateral.",
                "color": "#ffaa00"
            })

        # Cálculo de Índice Propietario de Perfeccionamiento Técnico (IPT MetaHub UCT)
        # Autoría: Felipe Arellano Vargas & Sofía Henríquez Soto (2026)
        ipt_eval = calculate_ipt_evaluation(peak_knee, min_knee, avg_symmetry, peak_hip)

        return {
            "status": "success",
            "video_info": {
                "filename": video_filename,
                "resolution": f"{width}x{height}",
                "fps": round(fps, 1),
                "total_video_frames": total_frames,
                "duration_seconds": duration_sec,
                "analyzed_frames": len(processed_frames),
                "frames_with_pose": frames_with_pose,
                "detection_rate_pct": round((frames_with_pose / max(1, len(processed_frames))) * 100, 1)
            },
            "summary_metrics": {
                "peak_knee_extension": peak_knee,
                "min_knee_flexion": min_knee,
                "peak_hip_extension": peak_hip,
                "avg_symmetry_score": avg_symmetry,
                "min_symmetry_score": min_symmetry,
                "total_anomalies": len(anomalies),
                "total_praises": len(praises)
            },
            "ipt_evaluation": ipt_eval,
            "ai_evaluations": {
                "praises": praises,
                "anomalies": anomalies
            },
            "preview_frames": preview_frames,
            "processed_frames": processed_frames
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando video: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
