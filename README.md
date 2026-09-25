# MetaHub Project 🏃‍♂️

**Plataforma Web Progresiva para el Seguimiento Longitudinal de la Técnica de Carrera en Atletismo Escolar**

Trabajo de Título — Universidad Católica de Temuco  
*Estudiantes:* Felipe Arellano Vargas & Sofía Henríquez Soto  
*Profesor Guía:* Marcos Levano  

---

## 📌 Descripción General

MetaHub es una plataforma PWA diseñada para capturar sesiones de carrera mediante la cámara de un smartphone, estimar la postura corporal mediante visión por computador (MediaPipe BlazePose), calcular métricas biomecánicas (ángulos articulares y simetría) y almacenarlas longitudinalmente para permitir a atletas y entrenadores comparar la evolución técnica en el tiempo.

---

## 🏗️ Arquitectura del Sistema

* **Frontend:** React (PWA) + Vite
* **Servicio de Visión por Computador:** Python + FastAPI + MediaPipe BlazePose
* **Backend Transaccional:** Node.js + Express (JWT Auth, CRUD atletas & sesiones)
* **Base de Datos:** PostgreSQL + TimescaleDB (Hypertables para series temporales)
* **Contenerización:** Docker / Docker Compose

---

## 🚀 Estructura del Repositorio

```
metahub-project/
├── apps/
│   ├── frontend/        # PWA React + Vite
│   ├── cv-service/      # API FastAPI (MediaPipe Pose + Métricas)
│   └── api-backend/     # API Node.js + Express
├── docker-compose.yml   # Orquestación de servicios y base de datos
└── README.md            # Documentación del proyecto
```

---

## 📄 Licencia y Derechos
Desarrollado para el ramo de Trabajo de Título, Escuela de Ingeniería Civil en Informática, UCT.
