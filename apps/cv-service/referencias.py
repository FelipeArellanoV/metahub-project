"""
Referencias publicadas y comparabilidad (ADR-019).

Cada métrica de MetaHub se contrasta con la literatura SOLO si la variable, la tarea y la
población son comparables. Si no lo son, se declara "no comparable" y se explica por qué.
Además se informa el error del método medido en el piloto contra Kinovea, para que el
lector sepa qué diferencias pueden distinguirse del ruido de medición.

Las referencias son contexto, no un estándar de aprobación (no existe un umbral consensuado
de técnica buena/mala para escolares con video 2D de celular).
"""

# Error de medición observado en el piloto MetaHub vs Kinovea (informe Etapa 3, v1.5).
# Es una cota de trabajo de n pequeño, no una especificación del método.
ERROR_METODO_PILOTO_GRADOS = {"mae_izquierda": 14.64, "mae_derecha": 13.29}

REFERENCIAS = {
    "matsuzaki_2024": {
        "cita": "Matsuzaki Y, Heath MR, Khan J, Spitzer E, Fabricant PD. Normative Running "
                "Kinematics in Healthy Adolescent Runners: A 2-Dimensional Video Analysis. "
                "HSS Journal 2024;20(3).",
        "muestra": "53 corredores sanos de 14 a 18 años (media 16,0), carrera en cinta a "
                   "velocidad autoseleccionada, video 2D HD, Dartfish.",
        "tarea": "carrera_fondo_cinta",
        "edad_min": 14, "edad_max": 18,
        "variables": {
            "flexion_rodilla_contacto_inicial": {"media": 13.2, "de": 3.8, "unidad": "°"},
            "flexion_rodilla_maxima_apoyo": {"media": 44.5, "de": 3.6, "unidad": "°"},
            "caida_pelvica_contralateral": {"media": 6.0, "de": 2.2, "unidad": "°"},
        },
    },
}

# Qué mide cada métrica de MetaHub y si hay una referencia comparable.
COMPARABILIDAD = {
    "propulsion": {
        "metrica": "rodilla_p95 (extensión máxima robusta en sprint)",
        "referencia": None,
        "comparable": False,
        "motivo": "Matsuzaki mide flexión de rodilla en apoyo durante carrera de fondo en cinta; "
                  "MetaHub mide extensión máxima durante el empuje en velocidad. Distinta variable y tarea.",
    },
    "recobro": {
        "metrica": "rodilla_p5 (ángulo interior mínimo, fase de balanceo)",
        "referencia": "Novacheck (1998): flexión de balanceo ~90° al correr y ~105° al esprintar.",
        "comparable": "parcial",
        "motivo": "Referencia en adultos y con otro método (3D); sirve como orden de magnitud, no como umbral.",
    },
    "simetria": {
        "metrica": "simetría multiarticular de ROM por pierna",
        "referencia": None,
        "comparable": False,
        "motivo": "No hay un umbral publicado de simetría para escolares con video 2D; "
                  "la oclusión de la pierna lejana puede producir asimetrías aparentes.",
    },
}


def _resolucion(valor_limite_de=None):
    """Texto sobre la capacidad del método para distinguir diferencias."""
    mae = max(ERROR_METODO_PILOTO_GRADOS.values())
    return (f"En el piloto, el error medio de MetaHub frente a Kinovea fue de hasta {mae:.1f}°. "
            "Diferencias angulares menores que ese error no pueden atribuirse al atleta con certeza.")


def contexto_referencias(edad=None):
    """Bloque que acompaña a las recomendaciones: referencias, comparabilidad y límites."""
    ref = REFERENCIAS["matsuzaki_2024"]
    en_rango = isinstance(edad, int) and ref["edad_min"] <= edad <= ref["edad_max"]
    return {
        "estado": "referencias_contextuales_no_normativas",
        "error_metodo": {
            "fuente": "Piloto MetaHub vs Kinovea (informe Etapa 3)",
            "mae_grados": dict(ERROR_METODO_PILOTO_GRADOS),
            "lectura": _resolucion(),
        },
        "comparabilidad": COMPARABILIDAD,
        "poblacion_referencia": {
            "cita": ref["cita"], "muestra": ref["muestra"], "tarea": ref["tarea"],
            "edad_dentro_del_rango": bool(en_rango),
            "nota": ("La edad del atleta está dentro del rango del estudio, pero la tarea no es "
                     "comparable." if en_rango else
                     "La edad del atleta (o su ausencia) queda fuera del rango del estudio de referencia."),
        },
        "advertencia": "Las referencias no son un estándar de aprobación; los umbrales de MetaHub "
                       "siguen siendo de diseño y están por calibrar con revisión profesional.",
    }
