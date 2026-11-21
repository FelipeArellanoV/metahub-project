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

# Referencia de máxima velocidad (ADR-023). Valores copiados de la Tabla 1 del artículo (media, DE y rango).
# Misma vista (2D sagital) y misma convención de ángulo articular (ángulo interior, 180° = extensión).
_CITA_MIYASHIRO = ("Miyashiro K, Nagahara R, Yamamoto K, Nishijima T. Kinematics of Maximal Speed Sprinting With "
                   "Different Running Speed, Leg Length, and Step Characteristics. Front Sports Act Living. "
                   "2019;1:37. doi:10.3389/fspor.2019.00037")
REFERENCIA_MAXIMA_VELOCIDAD = {
    "cita": _CITA_MIYASHIRO,
    "poblacion": {"descripcion": "79 velocistas varones, 20,7 ± 1,9 años, mejor marca en 100 m 11,08 ± 0,42 s",
                  "edad_min": 18, "edad_max": 27, "sexo": "masculino"},
    "metodo": "Video 2D sagital a 300 Hz con paneo, tramo 40-50 m de un sprint de 60 m (máxima velocidad), "
              "digitalización manual; velocidad media 9,90 ± 0,46 m/s.",
    "variables": {
        "rodilla_contacto": {"etiqueta": "Rodilla al contacto", "media": 152.3, "de": 5.6, "rango": [140.3, 166.5],
                             "unidad": "°", "fs_min": 60.0,
                             "definicion": "Ángulo interior cadera-rodilla-tobillo en el contacto inicial."},
        "rodilla_despegue": {"etiqueta": "Rodilla al despegue", "media": 155.4, "de": 4.8, "rango": [141.5, 168.2],
                             "unidad": "°", "fs_min": 60.0,
                             "definicion": "Ángulo interior cadera-rodilla-tobillo en el despegue."},
        "muslo_contacto": {"etiqueta": "Muslo al contacto", "media": 33.0, "de": 3.6, "rango": [24.0, 40.2],
                           "unidad": "°", "fs_min": 60.0, "requiere_sentido": True,
                           "definicion": "Muslo respecto de la vertical; positivo con la rodilla por delante de la cadera."},
        "muslo_despegue": {"etiqueta": "Muslo al despegue", "media": -28.7, "de": 3.6, "rango": [-37.6, -15.7],
                           "unidad": "°", "fs_min": 60.0, "requiere_sentido": True,
                           "definicion": "Muslo respecto de la vertical; negativo con la rodilla por detrás de la cadera."},
        "muslo_contralateral_contacto": {"etiqueta": "Muslo libre al contacto del otro pie", "media": 4.1, "de": 8.6,
                                         "rango": [-17.7, 22.9], "unidad": "°", "fs_min": 60.0, "requiere_sentido": True,
                                         "definicion": "Muslo de la pierna en balanceo cuando la otra toca el suelo."},
        "distancia_relativa_contacto": {"etiqueta": "Pie por delante de la cadera al contacto", "media": 49.8,
                                        "de": 3.6, "rango": [39.7, 56.9], "unidad": "%", "fs_min": 60.0,
                                        "requiere_sentido": True,
                                        "definicion": "Distancia horizontal cadera-pie / largo de pierna × 100. La "
                                                      "referencia usa el 5.º metatarsiano; MetaHub, la punta del pie."},
        "distancia_relativa_despegue": {"etiqueta": "Pie por detrás de la cadera al despegue", "media": 72.4,
                                        "de": 3.9, "rango": [62.6, 83.0], "unidad": "%", "fs_min": 60.0,
                                        "requiere_sentido": True,
                                        "definicion": "Distancia horizontal cadera-pie / largo de pierna × 100."},
        "rodilla_min_balanceo": {"etiqueta": "Rodilla mínima en el recobro", "media": 31.6, "de": 5.6,
                                 "rango": [22.1, 47.3], "unidad": "°", "fs_min": 20.0,
                                 "definicion": "Menor ángulo interior de rodilla entre el despegue y el siguiente contacto."},
        "muslo_max_elevacion": {"etiqueta": "Elevación máxima del muslo", "media": 70.3, "de": 4.6,
                                "rango": [62.0, 83.6], "unidad": "°", "fs_min": 20.0, "requiere_sentido": True,
                                "definicion": "Mayor ángulo del muslo por delante de la vertical durante el balanceo "
                                              "(convención de la figura 1 del artículo, no verificada en el texto)."},
        "tiempo_apoyo_s": {"etiqueta": "Tiempo de apoyo", "media": 0.104, "de": 0.007, "rango": [0.087, 0.120],
                           "unidad": "s", "fs_min": 240.0,
                           "definicion": "Promedio de izquierda (0,103 s) y derecha (0,105 s) del artículo. Con "
                                         "resolución de un cuadro, a 120 Hz el error (~15 ms) ya es 2 DE."},
        "frecuencia_paso_hz": {"etiqueta": "Frecuencia de paso", "media": 4.60, "de": 0.22, "rango": [4.17, 5.17],
                               "unidad": "Hz", "fs_min": 25.0,
                               "definicion": "Pasos por segundo (1 / tiempo entre contactos de piernas alternas). "
                                             "Depende de la velocidad y del largo de pierna."},
    },
}

# Qué mide cada sector del IPT y con qué referencia se contrasta.
COMPARABILIDAD = {
    "propulsion": {
        "metrica": "rodilla y muslo en el despegue (por evento)",
        "referencia": "Miyashiro et al. (2019): rodilla 155,4 ± 4,8°, muslo −28,7 ± 3,6° al despegue.",
        "comparable": "parcial",
        "motivo": "Misma variable, vista y fase (máxima velocidad), pero en velocistas adultos varones.",
    },
    "recobro": {
        "metrica": "rodilla mínima en el balanceo (por zancada)",
        "referencia": "Miyashiro et al. (2019): 31,6 ± 5,6° (ángulo interior, 2D).",
        "comparable": "parcial",
        "motivo": "Misma variable y método 2D, en velocistas adultos varones.",
    },
    "contacto": {
        "metrica": "distancia cadera-pie, rodilla y muslo en el contacto inicial (por evento)",
        "referencia": "Miyashiro et al. (2019): 49,8 ± 3,6 % del largo de pierna; rodilla 152,3 ± 5,6°; muslo 33,0 ± 3,6°.",
        "comparable": "parcial",
        "motivo": "Velocistas adultos varones; MetaHub usa la punta del pie y no el 5.º metatarsiano.",
    },
    "simetria": {
        "metrica": "diferencia izquierda-derecha de cada variable por evento, en DE de la referencia",
        "referencia": None,
        "comparable": False,
        "motivo": "No hay un umbral publicado de asimetría; se expresa en unidades de la variabilidad "
                  "entre velocistas de la referencia. La oclusión de la pierna lejana puede generar asimetrías aparentes.",
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
        "referencia_principal": {"cita": REFERENCIA_MAXIMA_VELOCIDAD["cita"],
                                 "poblacion": REFERENCIA_MAXIMA_VELOCIDAD["poblacion"]["descripcion"],
                                 "metodo": REFERENCIA_MAXIMA_VELOCIDAD["metodo"]},
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
