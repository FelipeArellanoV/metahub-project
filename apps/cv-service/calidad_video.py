"""
Calidad del video subido y de los datos obtenidos (ADR-019).

Antes de interpretar ángulos se comprueba que el video permite medirlos: resolución, cuadros por
segundo, duración, nitidez, iluminación, tamaño del atleta en el encuadre, cortes en el borde y
plano de grabación. Después se comprueba que los datos obtenidos son coherentes con una carrera.

Los umbrales son de diseño (sin norma publicada para videos de celular de escolares): cada chequeo
informa valor, umbral y cómo corregirlo. Un chequeo en "falla" impide recomendar; en "aviso" baja la
confianza. No se inventan valores: sin muestras suficientes el chequeo queda "sin_datos".
"""
import math

import numpy as np

# Umbrales de diseño (a calibrar con videos reales de la población objetivo)
MIN_LADO_CORTO_PX = 480        # falla por debajo; aviso bajo 720
AVISO_LADO_CORTO_PX = 720
MIN_FPS = 15.0                 # falla por debajo; aviso bajo 30
AVISO_FPS = 30.0
MIN_DURACION_S = 1.5           # falla por debajo; aviso bajo 3
AVISO_DURACION_S = 3.0
MIN_NITIDEZ = 8.0              # varianza del laplaciano en imagen reducida; falla por debajo; aviso bajo 25
AVISO_NITIDEZ = 25.0
BRILLO_MIN, BRILLO_MAX = 40.0, 215.0     # aviso fuera de este rango (escala 0-255)
MIN_ALTURA_CUERPO = 0.20       # fracción del alto del cuadro; falla por debajo; aviso bajo 0.35
AVISO_ALTURA_CUERPO = 0.35
MAX_PCT_CORTES_BORDE = 25.0    # aviso si más de este % de cuadros tiene el cuerpo cortado
RAZON_VISTA_FRONTAL = 0.70     # separación de hombros / largo del tronco; sobre esto, vista no lateral
MIN_CUADROS_CON_POSE_PCT = 50.0
AVISO_CUADROS_CON_POSE_PCT = 80.0
MIN_ROM_RODILLA_CARRERA = 40.0 # ROM de rodilla (p95-p5) bajo el cual no parece una carrera
DESBALANCE_VISIBILIDAD = 0.25  # diferencia de visibilidad media entre piernas que sugiere oclusión


def _chequeo(id_, estado, valor, umbral, mensaje, corregir=None):
    return {"id": id_, "estado": estado, "valor": valor, "umbral": umbral,
            "mensaje": mensaje, "como_corregir": corregir}


def medidas_cuadro(frame_bgr, lm, width, height):
    """Medidas de un cuadro muestreado. `lm` son los landmarks de MediaPipe o None."""
    import cv2
    escala = 320.0 / max(1, width)
    gris = cv2.cvtColor(cv2.resize(frame_bgr, (320, max(1, int(height * escala)))), cv2.COLOR_BGR2GRAY)
    out = {"nitidez": float(cv2.Laplacian(gris, cv2.CV_64F).var()), "brillo": float(gris.mean())}
    if lm is None:
        return out
    try:
        ys = [lm[i].y for i in (0, 27, 28, 31, 32)]
        out["altura_cuerpo"] = max(0.0, max(ys[1:]) - ys[0])
        puntos = [lm[i] for i in (0, 27, 28, 31, 32)]
        out["cortado"] = any(p.x < 0.02 or p.x > 0.98 or p.y < 0.02 or p.y > 0.98 for p in puntos)
        hx = (lm[11].x - lm[12].x) * width
        hy = (lm[11].y - lm[12].y) * height
        sep = math.hypot(hx, hy)
        mx, my = (lm[11].x + lm[12].x) / 2 * width, (lm[11].y + lm[12].y) / 2 * height
        cx, cy = (lm[23].x + lm[24].x) / 2 * width, (lm[23].y + lm[24].y) / 2 * height
        tronco = math.hypot(mx - cx, my - cy)
        if tronco > 1e-6:
            out["razon_hombros"] = sep / tronco
    except (IndexError, TypeError, AttributeError):
        pass
    return out


def _mediana(valores):
    return float(np.median(valores)) if valores else None


def evaluar_calidad_video(tecnica, medidas, tasa_pose_pct):
    """
    tecnica: width, height, fps, fps_valido (bool), duracion_s
    medidas: lista de dicts de `medidas_cuadro` (solo cuadros muestreados)
    tasa_pose_pct: % de cuadros muestreados con pose detectada
    """
    ch = []
    lado = min(tecnica.get("width") or 0, tecnica.get("height") or 0)
    est = "falla" if lado < MIN_LADO_CORTO_PX else ("aviso" if lado < AVISO_LADO_CORTO_PX else "ok")
    ch.append(_chequeo("resolucion", est, lado, f">={AVISO_LADO_CORTO_PX} px (mínimo {MIN_LADO_CORTO_PX})",
                       "Resolución del lado corto." if est == "ok" else "Resolución baja: los ángulos pierden precisión.",
                       None if est == "ok" else "Grabar en 720p o más."))

    fps = tecnica.get("fps")
    if not tecnica.get("fps_valido", True) or not fps:
        ch.append(_chequeo("fps", "aviso", None, f">={AVISO_FPS}", "El video no informa sus cuadros por segundo; se asumió 30.",
                           "Usar un video con metadatos de tiempo válidos."))
    else:
        est = "falla" if fps < MIN_FPS else ("aviso" if fps < AVISO_FPS else "ok")
        ch.append(_chequeo("fps", est, round(fps, 1), f">={AVISO_FPS} (mínimo {MIN_FPS})",
                           "Cuadros por segundo." if est == "ok" else
                           "Pocos cuadros por segundo: la rodilla cambia mucho entre cuadros y puede perderse el momento de máxima extensión.",
                           None if est == "ok" else "Grabar a 30 o 60 cuadros por segundo."))

    dur = tecnica.get("duracion_s") or 0.0
    est = "falla" if dur < MIN_DURACION_S else ("aviso" if dur < AVISO_DURACION_S else "ok")
    ch.append(_chequeo("duracion", est, round(dur, 2), f">={AVISO_DURACION_S} s (mínimo {MIN_DURACION_S})",
                       "Duración del clip." if est == "ok" else "Clip muy corto: pocas zancadas para estimar simetría.",
                       None if est == "ok" else "Grabar el recorrido completo, con varias zancadas de cada pierna."))

    est = "falla" if tasa_pose_pct < MIN_CUADROS_CON_POSE_PCT else ("aviso" if tasa_pose_pct < AVISO_CUADROS_CON_POSE_PCT else "ok")
    ch.append(_chequeo("deteccion", est, round(tasa_pose_pct, 1),
                       f">={AVISO_CUADROS_CON_POSE_PCT} % (mínimo {MIN_CUADROS_CON_POSE_PCT})",
                       "Cuadros con persona detectada." if est == "ok" else "El atleta no se detecta en muchos cuadros.",
                       None if est == "ok" else "Cuerpo completo visible, un solo atleta destacado y fondo despejado."))

    nit = _mediana([m["nitidez"] for m in medidas if "nitidez" in m])
    if nit is None:
        ch.append(_chequeo("nitidez", "sin_datos", None, f">={AVISO_NITIDEZ}", "No hay cuadros para medir la nitidez."))
    else:
        est = "falla" if nit < MIN_NITIDEZ else ("aviso" if nit < AVISO_NITIDEZ else "ok")
        ch.append(_chequeo("nitidez", est, round(nit, 1), f">={AVISO_NITIDEZ} (mínimo {MIN_NITIDEZ})",
                           "Nitidez de la imagen." if est == "ok" else "Imagen borrosa o desenfocada.",
                           None if est == "ok" else "Enfocar, limpiar el lente, aumentar la luz y evitar zoom digital."))

    br = _mediana([m["brillo"] for m in medidas if "brillo" in m])
    if br is None:
        ch.append(_chequeo("iluminacion", "sin_datos", None, f"{BRILLO_MIN:.0f}-{BRILLO_MAX:.0f}", "No hay cuadros para medir la luz."))
    else:
        est = "ok" if BRILLO_MIN <= br <= BRILLO_MAX else "aviso"
        ch.append(_chequeo("iluminacion", est, round(br, 1), f"{BRILLO_MIN:.0f}-{BRILLO_MAX:.0f} (escala 0-255)",
                           "Iluminación." if est == "ok" else ("Video muy oscuro." if br < BRILLO_MIN else "Video sobreexpuesto."),
                           None if est == "ok" else "Grabar con luz pareja y sin contraluz."))

    alt = _mediana([m["altura_cuerpo"] for m in medidas if "altura_cuerpo" in m])
    if alt is None:
        ch.append(_chequeo("tamano_atleta", "sin_datos", None, f">={AVISO_ALTURA_CUERPO}", "Sin cuerpo detectado para medir su tamaño."))
    else:
        est = "falla" if alt < MIN_ALTURA_CUERPO else ("aviso" if alt < AVISO_ALTURA_CUERPO else "ok")
        ch.append(_chequeo("tamano_atleta", est, round(alt, 2),
                           f">={AVISO_ALTURA_CUERPO} del alto del cuadro (mínimo {MIN_ALTURA_CUERPO})",
                           "Tamaño del atleta en el encuadre." if est == "ok" else "El atleta se ve muy pequeño: los ángulos son poco precisos.",
                           None if est == "ok" else "Acercar la cámara o recortar de modo que el cuerpo ocupe al menos un tercio del alto."))

    cort = [m["cortado"] for m in medidas if "cortado" in m]
    if not cort:
        ch.append(_chequeo("encuadre", "sin_datos", None, f"<={MAX_PCT_CORTES_BORDE} %", "Sin cuerpo detectado para revisar el encuadre."))
    else:
        pct = 100.0 * sum(cort) / len(cort)
        est = "ok" if pct <= MAX_PCT_CORTES_BORDE else "aviso"
        ch.append(_chequeo("encuadre", est, round(pct, 1), f"<={MAX_PCT_CORTES_BORDE} % de cuadros con el cuerpo cortado",
                           "Encuadre." if est == "ok" else "El cuerpo sale del encuadre en muchos cuadros (cabeza o pies cortados).",
                           None if est == "ok" else "Dejar margen arriba, abajo y a los lados; seguir al atleta con la cámara."))

    raz = _mediana([m["razon_hombros"] for m in medidas if "razon_hombros" in m])
    if raz is None:
        ch.append(_chequeo("plano_lateral", "sin_datos", None, f"<={RAZON_VISTA_FRONTAL}", "Sin datos para estimar el plano de grabación."))
    else:
        est = "ok" if raz <= RAZON_VISTA_FRONTAL else "aviso"
        ch.append(_chequeo("plano_lateral", est, round(raz, 2), f"<={RAZON_VISTA_FRONTAL} (separación de hombros / largo del tronco)",
                           "Plano de grabación lateral (indicio)." if est == "ok" else
                           "Indicio de vista frontal u oblicua: los ángulos sagitales se distorsionan.",
                           None if est == "ok" else "Grabar de costado, con la cámara perpendicular a la dirección de carrera."))

    if any(c["estado"] == "falla" for c in ch):
        nivel = "insuficiente"
    elif any(c["estado"] == "aviso" for c in ch):
        nivel = "limitada"
    else:
        nivel = "adecuada"
    return {
        "nivel": nivel,
        "apta_para_analisis": nivel != "insuficiente",
        "chequeos": ch,
        "fallas": [c["id"] for c in ch if c["estado"] == "falla"],
        "avisos": [c["id"] for c in ch if c["estado"] == "aviso"],
        "estado_umbrales": "diseno_a_calibrar",
    }


def evaluar_datos_obtenidos(series_rodilla_izq, series_rodilla_der, vis_izq, vis_der, resumen_zancadas=None):
    """Coherencia de los datos medidos con una carrera real."""
    ch = []
    for nombre, serie in (("izquierda", series_rodilla_izq), ("derecha", series_rodilla_der)):
        if len(serie) < 10:
            ch.append(_chequeo(f"cobertura_rodilla_{nombre}", "falla", len(serie), ">=10 mediciones",
                               f"Muy pocas mediciones de la rodilla {nombre}.",
                               "Que la pierna se vea completa; evitar que la pierna lejana quede tapada."))
            continue
        rom = float(np.percentile(serie, 95) - np.percentile(serie, 5))
        est = "ok" if rom >= MIN_ROM_RODILLA_CARRERA else "aviso"
        ch.append(_chequeo(f"rango_rodilla_{nombre}", est, round(rom, 1), f">={MIN_ROM_RODILLA_CARRERA}°",
                           "Rango de movimiento de la rodilla " + nombre + "." if est == "ok" else
                           f"Rango de rodilla {nombre} muy pequeño para una carrera: el video puede no mostrar carrera continua o la detección es inestable.",
                           None if est == "ok" else "Revisar que el clip contenga carrera y no solo la partida o la llegada."))
    if vis_izq and vis_der:
        dif = abs(float(np.mean(vis_izq)) - float(np.mean(vis_der)))
        est = "ok" if dif <= DESBALANCE_VISIBILIDAD else "aviso"
        ch.append(_chequeo("oclusion_pierna", est, round(dif, 2), f"<={DESBALANCE_VISIBILIDAD}",
                           "Visibilidad similar en ambas piernas." if est == "ok" else
                           "Una pierna se ve mucho menos que la otra: la simetría puede estar subestimada por oclusión.",
                           None if est == "ok" else "Grabar desde ambos lados y comparar."))
    if isinstance(resumen_zancadas, dict) and isinstance(resumen_zancadas.get("conteo_zancadas"), (int, float)):
        n = resumen_zancadas["conteo_zancadas"]
        est = "ok" if n >= 4 else "aviso"
        ch.append(_chequeo("zancadas_detectadas", est, n, ">=4 (detector experimental)",
                           "Zancadas detectadas." if est == "ok" else "Pocas zancadas detectadas para estimar simetría y tendencia.",
                           None if est == "ok" else "Grabar un tramo más largo."))
    nivel = ("insuficiente" if any(c["estado"] == "falla" for c in ch)
             else "limitada" if any(c["estado"] == "aviso" for c in ch) else "coherente")
    return {"nivel": nivel, "chequeos": ch}
