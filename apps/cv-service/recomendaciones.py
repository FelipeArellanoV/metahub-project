"""
Motor de recomendaciones de MetaHub (ADR-018).

Genera hallazgos y sugerencias EXCLUSIVAMENTE a partir de métricas medidas en el video
analizado. Si el dato no existe o el análisis no es confiable, no recomienda: declara el
motivo. Nada de valores por defecto ni de datos de demostración.

Las sugerencias son apoyo al entrenador, no un diagnóstico ni una prescripción clínica.
"""

from referencias import contexto_referencias

ADVERTENCIA_GENERAL = (
    "Apoyo a la decisión del entrenador. No es diagnóstico ni prescripción clínica; "
    "el IPT es experimental y las dosis requieren revisión de un profesional."
)
NOTA_2D = (
    "La medición es 2D: la perspectiva y la oclusión de la pierna lejana pueden generar "
    "asimetrías aparentes. Confirmar con un segundo video o con observación directa."
)


def banda_edad(edad):
    """Banda de trabajo por edad cronológica. No equivale a la maduración biológica."""
    if edad is None:
        return {"etiqueta": None, "edad": None,
                "nota": "Edad no registrada: no se dosifica por edad."}
    try:
        e = int(edad)
    except (TypeError, ValueError):
        return {"etiqueta": None, "edad": None, "nota": "Edad no válida: no se dosifica por edad."}
    if e < 10 or e > 17:
        return {"etiqueta": None, "edad": e,
                "nota": "Edad fuera del rango del estudio (10 a 17 años): no se dosifica."}
    etiqueta = "Sub-14" if e <= 13 else ("Sub-16" if e <= 15 else "Sub-18")
    return {"etiqueta": etiqueta, "edad": e,
            "nota": "Banda por edad cronológica; entre los 13 y los 17 años la maduración biológica "
                    "varía mucho. El entrenador debe ajustar la carga a cada atleta."}


def evaluar_confianza(video_info, analisis_articular):
    """Nivel de confianza del análisis según la calidad real de la detección."""
    vi = video_info or {}
    motivos = []
    nivel = "alta"
    valid_rate = vi.get("valid_rate_pct")
    valid_frames = vi.get("valid_frames")
    if vi.get("low_confidence") is True:
        nivel = "baja"
        motivos.append("El servicio marcó el análisis como de baja confianza.")
    if isinstance(valid_rate, (int, float)) and valid_rate < 60:
        nivel = "baja"
        motivos.append(f"Solo {valid_rate:.0f} % de los cuadros analizados fue válido (mínimo 60 %).")
    if isinstance(valid_frames, (int, float)) and valid_frames < 30:
        nivel = "baja"
        motivos.append(f"Solo {int(valid_frames)} cuadros válidos (mínimo 30).")
    if valid_rate is None and valid_frames is None:
        nivel = "baja"
        motivos.append("El análisis no informa la calidad de la detección.")
    if nivel != "baja":
        if isinstance(valid_rate, (int, float)) and valid_rate < 80:
            nivel = "media"
            motivos.append(f"{valid_rate:.0f} % de cuadros válidos (se recomienda 80 % o más).")
        evaluadas = (analisis_articular or {}).get("articulaciones_evaluadas")
        if not evaluadas or evaluadas < 2:
            nivel = "media"
            motivos.append("Menos de dos articulaciones evaluables para la simetría.")
    # Calidad técnica del video y coherencia de los datos (ADR-019)
    cv = vi.get("calidad_video") or {}
    cd = vi.get("calidad_datos") or {}
    correcciones = []
    for c in (cv.get("chequeos") or []) + (cd.get("chequeos") or []):
        if c.get("estado") == "falla":
            nivel = "baja"
            motivos.append(c["mensaje"])
        elif c.get("estado") == "aviso":
            if nivel == "alta":
                nivel = "media"
            motivos.append(c["mensaje"])
        if c.get("estado") in ("falla", "aviso") and c.get("como_corregir"):
            correcciones.append(c["como_corregir"])
    if not motivos:
        motivos.append("Detección estable en la mayor parte del video.")
    out = {"nivel": nivel, "motivos": motivos}
    if correcciones:
        out["como_mejorar_el_video"] = list(dict.fromkeys(correcciones))
    return out


# Variable medida -> tipo de hallazgo (el frontend asocia cada tipo a sus ejercicios).
TIPO_POR_VARIABLE = {
    "rodilla_despegue": "propulsion", "muslo_despegue": "propulsion", "distancia_relativa_despegue": "propulsion",
    "rodilla_min_balanceo": "recobro", "muslo_max_elevacion": "recobro",
    "distancia_relativa_contacto": "contacto", "rodilla_contacto": "contacto", "muslo_contacto": "contacto",
    "muslo_contralateral_contacto": "recobro", "tiempo_apoyo_s": "contacto", "frecuencia_paso_hz": "cadencia",
}
# Lectura de la diferencia según su sentido. Son hipótesis para el entrenador, no causas.
LECTURA = {
    ("rodilla_despegue", "mayor"): "La rodilla despega más extendida que en la referencia.",
    ("rodilla_despegue", "menor"): "La rodilla despega más flexionada que en la referencia.",
    ("muslo_despegue", "mayor"): "El muslo queda menos atrás al despegar: el empuje termina antes.",
    ("muslo_despegue", "menor"): "El muslo queda más atrás al despegar que en la referencia.",
    ("distancia_relativa_despegue", "mayor"): "El pie despega más atrás de la cadera que en la referencia.",
    ("distancia_relativa_despegue", "menor"): "El pie despega más cerca de la cadera que en la referencia.",
    ("rodilla_min_balanceo", "mayor"): "En el recobro el talón sube menos hacia el glúteo que en la referencia.",
    ("rodilla_min_balanceo", "menor"): "En el recobro la rodilla se cierra más que en la referencia.",
    ("muslo_max_elevacion", "mayor"): "El muslo sube más en el balanceo que en la referencia.",
    ("muslo_max_elevacion", "menor"): "El muslo sube menos en el balanceo que en la referencia.",
    ("distancia_relativa_contacto", "mayor"): "El pie toca el suelo más adelante de la cadera que en la referencia "
                                              "(posible sobrezancada).",
    ("distancia_relativa_contacto", "menor"): "El pie toca el suelo más cerca bajo la cadera que en la referencia.",
    ("rodilla_contacto", "mayor"): "La rodilla llega al suelo más extendida que en la referencia.",
    ("rodilla_contacto", "menor"): "La rodilla llega al suelo más flexionada que en la referencia.",
    ("muslo_contacto", "mayor"): "El muslo está más adelantado al contacto que en la referencia.",
    ("muslo_contacto", "menor"): "El muslo está menos adelantado al contacto que en la referencia.",
    ("muslo_contralateral_contacto", "mayor"): "La pierna libre va más adelantada cuando la otra apoya.",
    ("muslo_contralateral_contacto", "menor"): "La pierna libre va más atrasada cuando la otra apoya.",
    ("tiempo_apoyo_s", "mayor"): "El pie pasa más tiempo en el suelo que en la referencia.",
    ("tiempo_apoyo_s", "menor"): "El pie pasa menos tiempo en el suelo que en la referencia.",
    ("frecuencia_paso_hz", "mayor"): "Más pasos por segundo que en la referencia.",
    ("frecuencia_paso_hz", "menor"): "Menos pasos por segundo que en la referencia (depende de la velocidad).",
}
Z_SEVERIDAD_ALTA = 3.0


def hallazgos_por_referencia(comparacion):
    """Un hallazgo por cada variable en estado "alteracion" y por cada asimetría que cumple el mismo criterio:
    más de 2 DE de la referencia y una diferencia mayor que el error del método (ADR-023)."""
    from cinematica_eventos import Z_ALTERACION
    hallazgos = []
    for clave, v in (comparacion or {}).items():
        if not isinstance(v, dict):
            continue
        ref = v.get("referencia") or {}
        umbral = f"{ref.get('media')} ± {ref.get('de')} {v.get('unidad', '')} (media ± DE de la referencia)"
        if v.get("estado") == "alteracion":
            hallazgos.append({
                "id": clave, "tipo": TIPO_POR_VARIABLE.get(clave, "otro"),
                "titulo": f"{v['etiqueta']} fuera del rango de referencia",
                "severidad": "alta" if abs(v["z"]) >= Z_SEVERIDAD_ALTA else "media",
                "valor": v["valor"], "unidad": v.get("unidad"), "umbral": umbral, "z": v["z"],
                "n_eventos": v.get("n"), "metrica": clave, "estado_respaldo": "referencia_publicada",
                "fuente": "Miyashiro et al. (2019), velocistas adultos varones, 2D, máxima velocidad.",
                "interpretacion": LECTURA.get((clave, v.get("sentido")), "") + " " +
                                  (v.get("nota_poblacion") or "") + " Hipótesis a verificar por el entrenador."})
        bil = v.get("bilateral")
        err = v.get("error_metodo")
        if (bil and v.get("estado") in ("dentro_de_referencia", "dentro_del_error_del_metodo", "alteracion")
                and abs(bil["z"]) > Z_ALTERACION and (err is None or abs(bil["diferencia"]) > err)):
            hallazgos.append({
                "id": f"simetria_{clave}", "tipo": "simetria",
                "titulo": f"Diferencia entre piernas en {v['etiqueta'].lower()}",
                "severidad": "alta" if abs(bil["z"]) >= Z_SEVERIDAD_ALTA else "media",
                "valor": bil["diferencia"], "unidad": v.get("unidad"),
                "umbral": f"±{round(Z_ALTERACION * ref.get('de', 0), 1)} {v.get('unidad', '')} (2 DE de la referencia)",
                "z": bil["z"], "metrica": f"{clave}: pasos de la pierna A − pasos de la pierna B",
                "estado_respaldo": "diseno_a_calibrar",
                "fuente": "Sin umbral publicado de asimetría; se expresa en DE de Miyashiro et al. (2019).",
                "interpretacion": (f"Pasos de una pierna {bil['pierna_a']} y de la otra {bil['pierna_b']} "
                                   "(con una cámara no se sabe cuál es la izquierda: confirmar en el video). ")
                                  + NOTA_2D})
    hallazgos.sort(key=lambda h: -abs(h.get("z") or 0))
    return hallazgos


def _no_evaluado(comparacion):
    """Variables no comparadas, agrupadas por motivo (suele ser uno solo para varias variables)."""
    por_motivo = {}
    for v in (comparacion or {}).values():
        if isinstance(v, dict) and v.get("estado") in ("no_comparable", "insuficiente") and v.get("motivo"):
            por_motivo.setdefault(v["motivo"], []).append(v["etiqueta"])
    out = [f"{', '.join(etiquetas)}: {motivo}" for motivo, etiquetas in por_motivo.items()]
    out.append("Inclinación del tronco y tobillo: se informan, pero la referencia de máxima velocidad no las "
               "incluye y no generan recomendaciones.")
    return out


def generar_recomendaciones(ipt_eval, analisis_articular, video_info, edad):
    """Devuelve el bloque de recomendaciones. Nunca inventa datos."""
    banda = banda_edad(edad)
    confianza = evaluar_confianza(video_info, analisis_articular)
    base = {
        "disponible": False,
        "motivo_no_disponible": None,
        "confianza": confianza,
        "banda_edad": banda,
        "hallazgos": [],
        "no_evaluado": _no_evaluado((ipt_eval or {}).get("comparacion_referencia") if isinstance(ipt_eval, dict) else None),
        "advertencia": ADVERTENCIA_GENERAL,
        "estado_validacion": "experimental_no_validado",
        "referencias": contexto_referencias(banda.get("edad")),
    }
    # Los hallazgos dependen de la comparación por variable, no del IPT: una variable fuera de la referencia
    # se informa aunque el video no tenga variables suficientes para calcular el índice.
    if not isinstance(ipt_eval, dict) or not ipt_eval.get("comparacion_referencia"):
        base["motivo_no_disponible"] = "El análisis no entregó métricas suficientes."
        return base
    if confianza["nivel"] == "baja":
        base["motivo_no_disponible"] = (
            "Análisis de baja confianza: repite el video con el cuerpo completo, plano lateral "
            "y buena luz. " + " ".join(confianza["motivos"]) +
            (" Cómo mejorarlo: " + " ".join(confianza.get("como_mejorar_el_video", [])) if confianza.get("como_mejorar_el_video") else ""))
        return base

    comparacion = ipt_eval.get("comparacion_referencia") or {}
    hallazgos = hallazgos_por_referencia(comparacion)

    base["hallazgos"] = hallazgos
    base["disponible"] = True
    if not hallazgos:
        base["mensaje"] = ("Ninguna variable comparable se alejó de la referencia más de 2 DE y del error del "
                           "método. Mantener el trabajo técnico y repetir la medición para observar la tendencia.")
    if banda["etiqueta"] is None:
        base["advertencia"] += " " + banda["nota"]
    return base
