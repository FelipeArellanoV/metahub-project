# 📋 Backlog & Lista de Tareas Técnicas — MetaHub
**Proyecto de Título:** Plataforma Web Progresiva para el Seguimiento Longitudinal de la Técnica de Carrera en Atletismo Escolar  
**Autores:** Felipe Arellano Vargas & Sofía Henríquez Soto  
**Profesor Guía:** Dr. Marcos Lévano — Universidad Católica de Temuco (UCT)  
**Fecha de Actualización:** 26 de Octubre, 2026 (Etapa 3)

---

## 📌 Estado de Avance General

- [x] **Persistencia y Modelado de Datos (Etapa 3 - Sprint 1)**
  - [x] Incorporación del campo `birth_date` en la tabla `athletes`.
  - [x] Cálculo dinámico de `age` en tiempo de ejecución (resuelve deuda técnica de Tabla 14).
  - [x] Creación de tabla y auditoría de `consents` para cumplimiento de Leyes 19.628 y 21.719 (Protección de datos de menores).
  - [x] Endpoints REST `GET /api/athletes/:id/consents` y `POST /api/athletes/:id/consents`.
  - [x] Suite de 18 pruebas automatizadas pasando al 100%.
  - [x] Commit y sincronización con repositorio GitHub (`origin/main`).

---

## 🚀 Tareas Pendientes Prioritarias (Backlog de Desarrollo)

### Tarea 1: Asistente Biomecánico IA Generativo en Vivo (Google Gemini)
* **Objetivo:** Conectar un Modelo de Lenguaje Grande (LLM) que reciba la telemetría angular y cinemática calculada por MediaPipe y redacte diagnósticos y consejos formativos personalizados.
* **Componentes Técnicos:**
  - [ ] **Backend:** Crear endpoint `POST /api/ai/coach-advice` en `apps/api-backend`.
  - [ ] **Prompt Engineering:** Diseñar el System Prompt con rol de entrenador de atletismo escolar UCT (World Athletics / IAAF).
  - [ ] **Manejo de Secretos:** Configurar variable de entorno `GEMINI_API_KEY` en `.env`.
  - [ ] **Mecanismo de Respaldo (Fallback Offline):** Si no hay API key o no hay conexión en pista, responder con el motor de reglas biomecánicas local sin interrumpir el flujo.
  - [ ] **Frontend:** Modal/tarjeta interactiva en `preview.html` y `index.html` con botón de *"Consultar al Asistente IA"*.

---

### Tarea 2: Prescripción Automática de Drills Técnicos de Atletismo
* **Objetivo:** Vincular las anomalías biomecánicas detectadas en la pasada (baja extensión, recobro bajo, asimetría) con ejercicios correctivos dosificados.
* **Componentes Técnicos:**
  - [ ] **Catálogo de Ejercicios:** Definir biblioteca de drills (*Skipping A/B, Zarpazos, Bounding, Empuje contra muro a 45°, Butt-Kicks activos*).
  - [ ] **Dosificación Escolar:** Asignación automática de series, repeticiones y descansos según la edad calculada del estudiante.
  - [ ] **Consignas Cognitivas (Cues):** Frases mnemotécnicas para que el profesor de educación física o el atleta apliquen en la sesión.

---

### Tarea 3: Comparador Biomecánico Visual «Split-Screen»
* **Objetivo:** Permitir la comparación visual lado a lado de dos pasadas (ej. inicio de semestre vs. final de semestre o atleta vs. patrón de referencia).
* **Componentes Técnicos:**
  - [ ] Controlador de reproducción de video sincronizado en el cuadro de contacto del pie.
  - [ ] Comparativa diferencial de métricas clave (Δ IPT, Δ simetría, Δ extensión de rodilla).

---

### Tarea 4: Registro Subjetivo de Fatiga y Carga (Escala de Borg / RPE)
* **Objetivo:** Prevenir lesiones musculares y sobrecargas en atletas en etapa de crecimiento (Sub-14 a Sub-18).
* **Componentes Técnicos:**
  - [ ] Modal de 2 preguntas post-sesión: RPE (1-10) y mapa corporal simple de molestias.
  - [ ] Alerta predictiva al entrenador: cruce de fatiga alta con caídas pronunciadas en la simetría de carrera.

---

### Tarea 5: Generador de Informe PDF Trimestral para Colegios y Apoderados
* **Objetivo:** Proveer evidencia formal del progreso atlético escolar para coordinaciones deportivas escolares.
* **Componentes Técnicos:**
  - [ ] Exportador de ficha resumen de 1 página con membrete UCT / Colegio.
  - [ ] Resumen gráfico de evolución del IPT, medallas obtenidas y recomendaciones del entrenador.

---

### Tarea 6: Baremos Normativos por Categoría Escolar Oficial (Sub-14, Sub-16, Sub-18 FEDACHI)
* **Objetivo:** Contextualizar el índice IPT y las métricas cinemáticas según el rango etario oficial de atletismo escolar chileno, evitando comparar a menores de 12 años con juveniles de 17.
* **Componentes Técnicos:**
  - [ ] **Mapeador de Categorías:** Asignación automática de categoría según `birth_date` y edad calculada (`Sub-14: 12-13`, `Sub-16: 14-15`, `Sub-18: 16-17`, `Adulto: 18+`).
  - [ ] **Tablas de Baremos FEDACHI:** Definir rangos IPT y percentiles específicos por categoría (Inicial, Estándar, Avanzado, Élite).
  - [ ] **Indicadores Visuales en UI:** Badges de categoría oficial en fichas de atletas y semáforos de percentil en los resultados de análisis de video.

