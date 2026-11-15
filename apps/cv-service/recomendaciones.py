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
SEVERIDAD_MEDIA = 75.0   # puntaje de sector bajo el cual se informa un hallazgo (a calibrar)
SEVERIDAD_ALTA = 50.0


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


def _severidad(score):
    return "alta" if score < SEVERIDAD_ALTA else "media"


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
        "no_evaluado": [
            "Cadencia: el detector de zancadas es experimental y no se usa para recomendar.",
            "Inclinación del tronco, tobillo, muslo y pierna: se informan, pero no tienen "
            "referencia absoluta verificada y no generan recomendaciones.",
        ],
        "advertencia": ADVERTENCIA_GENERAL,
        "estado_validacion": "experimental_no_validado",
        "referencias": contexto_referencias(banda.get("edad")),
    }
    if not isinstance(ipt_eval, dict) or "desglose_sectores" not in ipt_eval:
        base["motivo_no_disponible"] = "El análisis no entregó métricas suficientes."
        return base
    if confianza["nivel"] == "baja":
        base["motivo_no_disponible"] = (
            "Análisis de baja confianza: repite el video con el cuerpo completo, plano lateral "
            "y buena luz. " + " ".join(confianza["motivos"]) +
            (" Cómo mejorarlo: " + " ".join(confianza.get("como_mejorar_el_video", [])) if confianza.get("como_mejorar_el_video") else ""))
        return base

    ds = ipt_eval["desglose_sectores"]
    inputs = ipt_eval.get("inputs_robustos") or {}
    hallazgos = []

    s1 = ds.get("sector_1_propulsion") or {}
    if isinstance(s1.get("score"), (int, float)) and s1["score"] < SEVERIDAD_MEDIA:
        ang = s1.get("angulo_real")
        if isinstance(ang, (int, float)) and ang > 175:
            titulo = "Extensión de rodilla en el empuje por sobre la ventana de diseño"
            interp = "Puede ser real o un artefacto de la medición 2D; verificar en el video."
        else:
            titulo = "Extensión incompleta de rodilla en el empuje"
            interp = "La pierna de empuje no alcanza la extensión de la ventana de diseño."
        hallazgos.append({
            "id": "propulsion", "tipo": "propulsion", "titulo": titulo,
            "severidad": _severidad(s1["score"]),
            "valor": ang, "unidad": "°", "umbral": s1.get("rango_optimo"),
            "metrica": "rodilla_p95 (extensión máxima robusta)",
            "estado_respaldo": "diseno_a_calibrar",
            "fuente": "Ventana 165°–175° sin fuente verificada; se calibra con la validación.",
            "interpretacion": interp})

    s2 = ds.get("sector_2_recobro") or {}
    if isinstance(s2.get("score"), (int, float)) and s2["score"] < SEVERIDAD_MEDIA:
        hallazgos.append({
            "id": "recobro", "tipo": "recobro",
            "titulo": "Flexión de rodilla limitada durante el recobro",
            "severidad": _severidad(s2["score"]),
            "valor": s2.get("angulo_real"), "unidad": "°", "umbral": s2.get("rango_optimo"),
            "metrica": "rodilla_p5 (ángulo interior mínimo robusto)",
            "estado_respaldo": "respaldo_parcial",
            "fuente": "Novacheck (1998): flexión de balanceo ~90° al correr y ~105° al esprintar.",
            "interpretacion": "El talón sube menos hacia el glúteo que en la referencia de diseño."})

    s3 = ds.get("simetria_bilateral") or {}
    simetria_excluida = bool(ipt_eval.get("symmetry_excluded"))
    if simetria_excluida:
        base["no_evaluado"].append(
            "Simetría: no evaluable en este video (datos insuficientes de una de las piernas).")
    elif isinstance(s3.get("score"), (int, float)) and s3["score"] < SEVERIDAD_MEDIA:
        articulaciones = (analisis_articular or {}).get("articulaciones") or {}
        peor, peor_valor = None, None
        for nombre in ("rodilla", "cadera", "tobillo"):
            j = articulaciones.get(nombre) or {}
            if j.get("evaluable") and isinstance(j.get("simetria"), (int, float)):
                if peor_valor is None or j["simetria"] < peor_valor:
                    peor, peor_valor = nombre, j["simetria"]
        detalle = (f" La articulación con menor simetría fue {peor} ({peor_valor:.1f} %)."
                   if peor else "")
        hallazgos.append({
            "id": "simetria", "tipo": "simetria",
            "titulo": "Diferencia entre ambas piernas en el rango de movimiento",
            "severidad": _severidad(s3["score"]),
            "valor": s3.get("porcentaje_real"), "unidad": "%", "umbral": s3.get("rango_optimo"),
            "metrica": "simetría multiarticular (rodilla, cadera y tobillo evaluables)",
            "estado_respaldo": "diseno_a_calibrar",
            "fuente": "Sin umbral universal; Exell et al. (2012): considerar la variabilidad.",
            "interpretacion": "Una pierna recorre menos rango que la otra." + detalle + " " + NOTA_2D})

    base["hallazgos"] = hallazgos
    base["disponible"] = True
    if not hallazgos:
        base["mensaje"] = ("Ningún sector quedó bajo el umbral de seguimiento. Mantener el trabajo "
                           "técnico y repetir la medición para observar la tendencia.")
    if banda["etiqueta"] is None:
        base["advertencia"] += " " + banda["nota"]
    return base
