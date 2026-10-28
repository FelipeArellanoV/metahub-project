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
import math
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
        with open(MODEL_PATH, "rb") as f:
            model_bytes = f.read()
        base_options = python.BaseOptions(model_asset_buffer=model_bytes)
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
@app.get("/api/cv/health", summary="Health Check Alias")
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
    (0,1),(1,2),(2,3),(3,7),(0,4),(4,5),(5,6),(6,8),(9,10),
    (11,12),(11,13),(13,15),(15,17),(15,19),(15,21),(17,19),
    (12,14),(14,16),(16,18),(16,20),(16,22),(18,20),
    (11,23),(12,24),(23,24),(23,25),(25,27),(27,29),(29,31),(27,31),
    (24,26),(26,28),(28,30),(30,32),(28,32)
]


def draw_skeleton_on_frame(frame: np.ndarray, landmarks, metrics: Dict[str, Any]) -> np.ndarray:
    """Superpone el cuerpo detectado; no genera puntos fuera de imagen o con baja confianza."""
    h, w = frame.shape[:2]
    annotated = frame.copy()
    coords = {}
    for index, point in enumerate(landmarks):
        if (getattr(point, "visibility", 0) >= 0.4 and getattr(point, "presence", 1) >= 0.4
                and 0 <= point.x <= 1 and 0 <= point.y <= 1):
            coords[index] = (min(w-1, int(point.x*w)), min(h-1, int(point.y*h)))
    thickness = max(1, int(min(w,h)/150))
    for start, end in SKELETON_CONNECTIONS:
        if start in coords and end in coords:
            cv2.line(annotated, coords[start], coords[end], (255,255,255), thickness, cv2.LINE_AA)
    if 0 in coords and 11 in coords and 12 in coords:
        neck = ((coords[11][0]+coords[12][0])//2, (coords[11][1]+coords[12][1])//2)
        cv2.line(annotated, coords[0], neck, (255,255,255), thickness, cv2.LINE_AA)
    for index, xy in coords.items():
        color = (255,180,40) if index < 11 else ((40,70,255) if index < 23 else (100,255,50))
        cv2.circle(annotated, xy, max(2, thickness+1), color, -1, cv2.LINE_AA)
    return annotated


@app.post("/api/cv/process-video", summary="Extraer frames de video y procesar con MediaPipe real")
async def process_video(
    file: Optional[UploadFile] = File(None),
    use_sample: bool = Form(False),
    sample_stride: int = Form(3),
    max_frames: int = Form(150),
    scan_full_video: bool = Form(False),
    include_pose: bool = Form(False),
    max_samples: int = Form(4500)
):
    """
    Recibe un archivo de video (.mp4, .webm, .mov) o usa el video de muestra de velocista.
    Extrae los cuadros con OpenCV, ejecuta MediaPipe PoseLandmarker en cada cuadro real,
    calcula ángulos vectoriales y simetría bilateral, y retorna la telemetría completa.
    """
    temp_path = None
    if not 1 <= sample_stride <= 60 or not 1 <= max_frames <= 3600 or not 30 <= max_samples <= 6000:
        raise HTTPException(status_code=422, detail="Parámetros de muestreo fuera de rango.")
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

        if scan_full_video and duration_sec > 300:
            cap.release()
            raise HTTPException(status_code=413, detail="Usa un clip de hasta cinco minutos para analizar el recorrido completo.")
        effective_stride = sample_stride
        if scan_full_video:
            effective_stride = max(sample_stride, int(math.ceil(fps / 15)), int(math.ceil(max(1,total_frames) / max_samples)))
        processing_limit = total_frames if scan_full_video and total_frames > 0 else (int(fps * 300) if scan_full_video else max_frames)
        pose_frames = []
        processed_frames = []
        preview_frames = []
        frame_idx = 0
        frames_with_pose = 0

        knee_angles = []
        hip_angles = []
        symmetries = []

        # Procesar cuadros
        while cap.isOpened() and frame_idx < processing_limit:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % effective_stride == 0:
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

                sample_landmarks = None
                if detection.pose_landmarks and len(detection.pose_landmarks) > 0:
                    frames_with_pose += 1
                    lm = detection.pose_landmarks[0]
                    if include_pose:
                        sample_landmarks = [[round(float(p.x),5), round(float(p.y),5),
                            round(float(getattr(p,"visibility",0)),3), round(float(getattr(p,"presence",1)),3)] for p in lm]
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
                if include_pose:
                    pose_frames.append({"time": time_sec, "frame": frame_idx, "landmarks": sample_landmarks})

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
            "pose_track": {
                "version": 1, "landmark_count": 33, "width": width, "height": height,
                "fps": fps, "duration": duration_sec, "sample_stride": effective_stride,
                "sample_interval": round(effective_stride / fps, 5),
                "full_video": scan_full_video, "connections": SKELETON_CONNECTIONS,
                "frames": pose_frames
            } if include_pose else None,
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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando video: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
