from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="MetaHub CV Service",
    description="Servicio de Visión por Computador con MediaPipe BlazePose para análisis biomecánico de carrera",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "service": "metahub-cv-service",
        "status": "online",
        "framework": "FastAPI",
        "vision_engine": "MediaPipe BlazePose"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}
