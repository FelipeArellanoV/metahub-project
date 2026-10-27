# 🔬 Fundamentación Analítica y Científica del IPT (MetaHub UCT)
**Proyecto de Título:** Plataforma Web Progresiva para el Seguimiento Longitudinal de la Técnica de Carrera en Atletismo Escolar  
**Autores:** Felipe Arellano Vargas & Sofía Henríquez Soto  
**Profesor Guía:** Dr. Marcos Lévano — Universidad Católica de Temuco (UCT)

---

## 1. Definición Matemática y Dimensional del IPT

El **Índice de Perfeccionamiento Técnico (IPT)** se define formalmente como una combinación lineal convexa y acotada en el intervalo $[0, 100]$:

$$\text{IPT} = 0.40 \cdot S_{\text{propulsión}} + 0.35 \cdot S_{\text{recobro}} + 0.25 \cdot S_{\text{simetría}}$$

Donde:
* $\sum_{i=1}^{3} w_i = 0.40 + 0.35 + 0.25 = 1.0$ (Convexidad matemática garantizada).
* Cada sub-score $S_i \in [0, 100]$ evalúa la desviación cinemática respecto a los intervalos angulares óptimos validados por la biomecánica del sprint.

---

## 2. Bibliografía y Respaldo Científico por Componente

### A. Sector 1: Propulsión y Triple Extensión ($w_1 = 0.40$ · Rango Óptimo: $165^\circ - 175^\circ$)
* **Citas Bibliográficas:**
  * **Mann, R., & Sprague, P. (1980, 1983).** *A kinetic analysis of the ground leg during sprint running.* Research Quarterly for Exercise and Sport.
  * **Mann, R. (2011).** *The Mechanics of Sprinting and Hurdling.* Compendio biomecánico de USA Track & Field (USATF).
  * **Weyand, P. G., Sternlight, D. B., Bellizzi, M. J., & Wright, S. (2000).** *Faster top running speeds are achieved with greater ground forces not more rapid leg movements.* Journal of Applied Physiology, 89(5), 1991-1999.
* **Justificación Biomecánica:**
  La velocidad máxima en velocistas está determinada predominantemente por la magnitud y orientación de la fuerza de reacción del suelo (*Ground Reaction Force - GRF*) aplicada en un tiempo de contacto mínimo. La triple extensión coordinada (tobillo, rodilla, cadera) transfiere la energía elástica de la cadena posterior. Despegues con ángulos $<155^\circ$ truncan la aceleración horizontal, mientras que hiperextensiones $>178^\circ$ retrasan el inicio de la siguiente fase oscilatoria.

---

### B. Sector 2: Vuelo y Flexión de Recobro ($w_2 = 0.35$ · Rango Óptimo: $\le 65^\circ - 70^\circ$)
* **Citas Bibliográficas:**
  * **Dillman, C. J. (1975).** *Kinematic analyses of running.* Exercise and Sport Sciences Reviews, 3(1), 193-218.
  * **Hay, J. G. (1993).** *The Biomechanics of Sports Techniques.* Prentice-Hall.
* **Justificación Física (Ley del Momento de Inercia):**
  La inercia rotacional de la extremidad inferior respecto a la articulación coxofemoral (cadera) está regida por:
  $$I = \int r^2 \, dm \approx m \cdot r^2$$
  Al producirse una flexión activa de rodilla aguda ($\le 65^\circ-70^\circ$, talón próximo a la tuberosidad isquiática), el radio de giro efectivo ($r$) de la masa distal de la pierna y calzado se reduce drásticamente. Al estar elevado al cuadrado ($r^2$), el momento de inercia se reduce a aproximadamente $\frac{1}{4}$ del valor con pierna extendida, facilitando una oscilación pendular anterior veloz con un mínimo consumo de glucógeno y menor fatiga del psoas ilíaco.

---

### C. Sector 3: Simetría Bilateral de Zancada ($w_3 = 0.25$ · Rango Óptimo: $\ge 92\%$)
* **Citas Bibliográficas:**
  * **Carpes, F. P., Mota, C. B., & Faria, I. E. (2010).** *On the significance of the evaluation of motor asymmetries in sports: A review of methodology, results, and recommendations.* Current Issues in Sports Biomechanics, 25-42.
  * **Zifchock, R. A., Davis, I., Higginson, J., & Royer, T. (2008).** *The symmetry angle: a novel, robust measure of symmetry.* Gait & Posture, 27(4), 622-627.
* **Justificación Clínica y Preventiva en Escolares:**
  Asimetrías bilaterales superiores al $8\%-10\%$ (simetría $<90\%-92\%$) generan momentos de torsión compensatorios en la pelvis y sacroilíacas. En velocistas escolares en etapa de maduración musculoesquelética, esta asimetría constituye el principal factor etiológico predictivo de distensión miofascial en el bíceps femoral (isquiotibiales).

---

## 3. Guion de Respuesta y Defensa ante la Comisión Evaluadora

> **Pregunta esperada:**  
> *«¿Cuál es la validez del IPT? ¿Por qué no utilizar un simple promedio aritmético entre los ángulos detectados?»*
>
> **Respuesta recomendada:**  
> *"Un promedio simple asignaría erróneamente el mismo peso a una fase propulsiva que a una compensación postural. En la literatura cinemática (Weyand et al., Ralph Mann), la fuerza horizontal de empuje es el principal determinante de la velocidad punta, por lo que representa el 40% del IPT. A su vez, el 35% del recobro se sustenta en la reducción cuadrática del momento de inercia según el modelo de Dillman, y el 25% restante a la simetría bilateral para salvaguardar la salud osteomuscular del estudiante frente a desgarros según los estándares de Carpes y Zifchock. Cada umbral está matemáticamente respaldado y calibrado específicamente para atletas en etapa formativa."*
