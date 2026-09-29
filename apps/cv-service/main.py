from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
from metrics_engine import compute_biomechanical_metrics, calculate_angle

app = FastAPI(
    title="MetaHub CV Service",
    description="Servicio de Visión por Computador con MediaPipe BlazePose para análisis biomecánico de carrera (T-01 a T-03)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class KeypointsPayload(BaseModel):
    left_hip: List[float]
    left_knee: List[float]
    left_ankle: List[float]
    right_hip: List[float]
    right_knee: List[float]
    right_ankle: List[float]

@app.get("/")
def read_root():
    return {
        "service": "metahub-cv-service",
        "status": "online",
        "framework": "FastAPI",
        "vision_engine": "MediaPipe BlazePose",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/cv/metrics")
def calculate_metrics(payload: KeypointsPayload):
    try:
        data = payload.dict()
        metrics = compute_biomechanical_metrics(data)
        return {
            "status": "success",
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
