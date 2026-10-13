"""
=========================================================================================
PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco

Memoria / Trabajo de Título:
Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
Profesor Guía: Dr. Marcos Lévano

Módulo: API Microservicio de Visión por Computador (main.py)
Descripción: Servidor FastAPI que expone endpoints para la estimación de postura
             y cómputo de métricas biomecánicas sobre corredores.
=========================================================================================
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from metrics_engine import compute_biomechanical_metrics, calculate_angle

app = FastAPI(
    title="MetaHub CV Service — Performance Lab",
    description="Microservicio de Visión por Computador con MediaPipe BlazePose para análisis biomecánico de carrera en atletismo escolar (Memoria UCT).",
    version="1.1.0"
)

# Configuración de políticas de CORS para comunicación con el frontend y backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class KeypointsPayload(BaseModel):
    """
    Estructura de coordenadas articulares 2D requeridas para el cálculo biomecánico.
    Cada coordenada se compone de una tupla o lista [x, y] normalizada entre 0.0 y 1.0.
    """
    left_hip: List[float] = Field(..., description="Coordenada [x, y] de la cadera izquierda")
    left_knee: List[float] = Field(..., description="Coordenada [x, y] de la rodilla izquierda")
    left_ankle: List[float] = Field(..., description="Coordenada [x, y] del tobillo izquierdo")
    right_hip: List[float] = Field(..., description="Coordenada [x, y] de la cadera derecha")
    right_knee: List[float] = Field(..., description="Coordenada [x, y] de la rodilla derecha")
    right_ankle: List[float] = Field(..., description="Coordenada [x, y] del tobillo derecho")
    left_shoulder: Optional[List[float]] = Field(None, description="Coordenada opcional del hombro izquierdo")
    right_shoulder: Optional[List[float]] = Field(None, description="Coordenada opcional del hombro derecho")


@app.get("/", summary="Información del microservicio de visión por computador")
def read_root():
    return {
        "servicio": "metahub-cv-service",
        "estado": "operativo",
        "framework": "FastAPI",
        "motor_vision": "MediaPipe BlazePose",
        "autores": ["Felipe Arellano Vargas", "Sofía Henríquez Soto"],
        "institucion": "Universidad Católica de Temuco",
        "version": "1.1.0"
    }


@app.get("/health", summary="Comprobación de estado (Health Check)")
def health_check():
    return {"status": "ok", "servicio": "cv-service"}


@app.post("/api/cv/metrics", summary="Cálculo de ángulos articulares y simetría bilateral")
def calculate_metrics(payload: KeypointsPayload):
    """
    Recibe las coordenadas anatómicas extraídas de un cuadro de video y retorna
    los ángulos articulares calculados junto con el índice de simetría de zancada.
    """
    try:
        datos = payload.dict(exclude_none=True)
        metricas = compute_biomechanical_metrics(datos)
        return {
            "status": "success",
            "metrics": metricas
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error durante el cálculo biomecánico: {str(e)}"
        )
