"""
Cinemática por evento de paso y comparación con la referencia publicada (ADR-023).

Principio: con una sola cámara lateral, MediaPipe no distingue de forma fiable la pierna izquierda
de la derecha (en los videos de prueba rotulaba "izquierda" a la pierna de adelante en casi todos
los cuadros). Por eso el análisis NO usa los rótulos izquierda/derecha. Las piernas se identifican
por su función geométrica en cada instante:
- pierna de apoyo: la que tiene el pie más bajo en la imagen mientras hay contacto con el suelo;
- pierna en recobro: la otra durante el apoyo y, en el vuelo, la que va por delante.

Qué hace:
1. Detecta cada apoyo como un tramo en que el punto más bajo de los pies (talón, tobillo o punta)
   está a nivel del suelo. Si dos apoyos se juntan sin vuelo visible, se separan cuando el pie de
   apoyo salta hacia adelante (un pie apoyado solo puede retroceder respecto de la cadera).
2. Mide en el contacto y en el despegue de cada paso la rodilla, el muslo respecto de la vertical y
   la distancia horizontal cadera-pie relativa al largo de la pierna; en cada paso, la rodilla
   mínima y la elevación máxima del muslo de la pierna en recobro; y la frecuencia de paso y los
   tiempos de apoyo y vuelo.
3. Resume cada variable (n, media, DE, CV, IC 95 %). Como los pasos se alternan entre piernas, los
   pasos pares son de una pierna ("A") y los impares de la otra ("B"): la simetría compara A con B,
   solo si la secuencia de pasos no tiene huecos. Se desconoce cuál de las dos es la izquierda.
4. Compara la media con la referencia: z = (media − media_ref) / DE_ref. "Alteración" solo si
   |z| > 2 y además la diferencia supera el error del método medido frente a Kinovea.

Límites declarados:
- Video 2D sagital; referencia de velocistas adultos varones en máxima velocidad.
- Resolución de un cuadro en el contacto y el despegue: ángulos y distancias en esos instantes se
  comparan con 60 o más cuadros/s reales, y los tiempos de apoyo con 240 o más.
- MediaPipe da la punta del pie, no el 5.º metatarsiano de la referencia.
"""
import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from referencias import REFERENCIA_MAXIMA_VELOCIDAD, ERROR_METODO_PILOTO_GRADOS

FS_MIN_DETECCION = 20.0     # por debajo no se intenta detectar pasos
MIN_EVENTOS = 3             # pasos válidos mínimos por variable para comparar
TOL_SUELO = 0.03            # tolerancia del contacto, en fracción del largo de pierna
MIN_PROMINENCIA = 0.03      # el punto más bajo de los pies debe subir al menos esto entre apoyos
SALTO_NUEVO_APOYO = 0.25    # avance del pie de apoyo (fracción de pierna) que indica un apoyo nuevo
MIN_AVANCE_CONTACTO = 0.05  # al tocar el suelo el pie está por delante de la cadera (fracción de pierna)
MIN_APOYO_MEDIANO_S = 0.06  # apoyos más cortos indican que el pie no se detecta estable en el suelo
                            # (el mínimo publicado en velocistas es 0,087 s; Miyashiro et al., 2019)
MIN_APOYO_S = 0.03
MAX_APOYO_S = 0.40
PASO_MIN_S, PASO_MAX_S = 0.15, 0.50
CV_PASO_MAX_PCT = 15.0      # variación máxima del tiempo de paso para aceptar la detección
FRACCION_PASOS_VALIDOS_MIN = 0.75
VENTANA_SUELO_S = 0.6       # ventana para estimar el nivel del suelo (cámara que sigue al atleta)
Z_ALTERACION = 2.0
# Ritmo mínimo para considerar que el video es un sprint. El mínimo publicado en velocistas adultos es
# 4,17 pasos/s (Miyashiro et al., 2019); se deja margen para escolares. Valor de diseño, a calibrar.
FRECUENCIA_MIN_SPRINT_HZ = 3.5

PUNTOS_PIE = ('heel', 'ankle', 'foot_index')
PUNTOS_PIERNA = ('hip', 'knee', 'ankle', 'heel', 'foot_index')
_T95 = {2: 12.71, 3: 4.30, 4: 3.18, 5: 2.78, 6: 2.57, 7: 2.45, 8: 2.36, 9: 2.31, 10: 2.26,
        12: 2.20, 15: 2.14, 20: 2.09, 30: 2.05}


def _t95(n: int) -> float:
    if n >= 31:
        return 1.96
    claves = [k for k in sorted(_T95) if k <= n]
    return _T95[claves[-1]] if claves else float('nan')


def _dist(a, b) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _angulo(a, b, c) -> float:
    rad = math.atan2(c[1] - b[1], c[0] - b[0]) - math.atan2(a[1] - b[1], a[0] - b[0])
    ang = abs(math.degrees(rad))
    return 360.0 - ang if ang > 180.0 else ang


def resumen_estadistico(valores: List[float]) -> Dict[str, Any]:
    """n, media, DE muestral, CV, IC 95 % (t de Student), mínimo y máximo."""
    v = [float(x) for x in valores if x is not None and np.isfinite(x)]
    n = len(v)
    if n == 0:
        return {"n": 0}
    media = float(np.mean(v))
    out = {"n": n, "media": round(media, 2), "min": round(min(v), 2), "max": round(max(v), 2)}
    if n >= 2:
        de = float(np.std(v, ddof=1))
        semi = _t95(n) * de / math.sqrt(n)
        out.update({"de": round(de, 2),
                    "cv_pct": round(abs(de / media) * 100, 1) if media else None,
                    "ic95": [round(media - semi, 2), round(media + semi, 2)]})
    return out


# ------------------------------------------------------------------------------- geometría por cuadro

def _piernas(kp: Dict[str, List[float]]) -> List[Dict[str, Any]]:
    """Las dos piernas detectadas como observaciones sin rótulo (cada una con sus puntos)."""
    out = []
    for lado in ('left', 'right'):
        pts = {p: kp[f'{lado}_{p}'] for p in PUNTOS_PIERNA if f'{lado}_{p}' in kp}
        if 'hip' in pts and 'knee' in pts and 'ankle' in pts:
            pies = [pts[p][1] for p in PUNTOS_PIE if p in pts]
            pts['_y_pie'] = max(pies)                       # y crece hacia abajo: punto más bajo del pie
            pts['_x_pie'] = pts.get('foot_index', pts['ankle'])[0]
            out.append(pts)
    return out


def _cadera(kp) -> Optional[Tuple[float, float]]:
    h = [kp[k] for k in ('left_hip', 'right_hip') if k in kp]
    return (float(np.mean([p[0] for p in h])), float(np.mean([p[1] for p in h]))) if h else None


def _rodilla(p) -> float:
    return _angulo(p['hip'], p['knee'], p['ankle'])


def _muslo(p, sentido) -> float:
    """Muslo respecto de la vertical: positivo con la rodilla por delante de la cadera."""
    return math.degrees(math.atan2((p['knee'][0] - p['hip'][0]) * sentido, p['knee'][1] - p['hip'][1]))


def _sentido_de_carrera(cuadros: List[Dict[str, Any]]) -> Dict[str, Any]:
    """+1 si el atleta avanza hacia x creciente en la imagen; -1 si hacia x decreciente.

    Se usa la nariz respecto del punto medio de las orejas (la cara mira hacia donde se corre); si no
    hay cara visible, el desplazamiento de la cadera (cámara fija).
    """
    caras = []
    for c in cuadros:
        kp = c['kp']
        if 'nose' in kp and 'left_ear' in kp and 'right_ear' in kp:
            caras.append(kp['nose'][0] - (kp['left_ear'][0] + kp['right_ear'][0]) / 2.0)
    if len(caras) >= 5 and abs(float(np.median(caras))) > 1.0:
        return {"sentido": 1 if np.median(caras) > 0 else -1, "metodo": "orientacion_de_la_cara"}
    caderas = [(c['t'], _cadera(c['kp'])[0]) for c in cuadros if _cadera(c['kp'])]
    if len(caderas) >= 5 and abs(caderas[-1][1] - caderas[0][1]) > 1.0:
        return {"sentido": 1 if caderas[-1][1] > caderas[0][1] else -1, "metodo": "desplazamiento_de_cadera"}
    return {"sentido": None, "metodo": "indeterminado"}


def _largo_pierna(cuadros: List[Dict[str, Any]]) -> Optional[float]:
    """Mediana de (muslo + pierna) en píxeles, como en la referencia."""
    largos = [_dist(p['hip'], p['knee']) + _dist(p['knee'], p['ankle'])
              for c in cuadros for p in _piernas(c['kp'])]
    return float(np.median(largos)) if len(largos) >= 5 else None


# ------------------------------------------------------------------------------- detección de apoyos

def detectar_apoyos(t: np.ndarray, y_bajo: np.ndarray, x_rel: np.ndarray, largo: float) -> List[Dict[str, int]]:
    """Apoyos [contacto, despegue] a partir del punto más bajo de los pies.

    `y_bajo`: y del pie más bajo en cada cuadro (NaN sin detección). `x_rel`: avance de ese pie respecto
    de la cadera, en fracción del largo de pierna (positivo = por delante).
    """
    n = len(y_bajo)
    valido = ~np.isnan(y_bajo)
    if valido.sum() < 5:
        return []
    # Nivel del suelo local: percentil alto del pie más bajo en una ventana móvil (admite que la cámara
    # suba o baje al seguir al atleta).
    suelo = np.full(n, np.nan)
    for i in range(n):
        if not valido[i]:
            continue
        ventana = (np.abs(t - t[i]) <= VENTANA_SUELO_S / 2) & valido
        suelo[i] = np.percentile(y_bajo[ventana], 90)
    en_suelo = valido & (y_bajo >= suelo - TOL_SUELO * largo)

    # Tramos consecutivos en el suelo (un hueco sin detección corta el tramo).
    tramos, i = [], 0
    while i < n:
        if en_suelo[i]:
            j = i
            while j + 1 < n and en_suelo[j + 1]:
                j += 1
            tramos.append([i, j])
            i = j + 1
        else:
            i += 1
    # Separar apoyos unidos sin vuelo: el pie de apoyo solo retrocede respecto de la cadera; si avanza
    # bruscamente, es el otro pie que acaba de apoyar.
    apoyos = []
    for a, b in tramos:
        ini = a
        for k in range(a + 1, b + 1):
            if (not np.isnan(x_rel[k]) and not np.isnan(x_rel[k - 1])
                    and x_rel[k] - x_rel[k - 1] > SALTO_NUEVO_APOYO):
                apoyos.append([ini, k - 1])
                ini = k
        apoyos.append([ini, b])
    out = []
    for a, b in apoyos:
        # Debe estar acotado por cuadros detectados fuera del suelo (no por el borde ni por un hueco).
        if a == 0 or b == n - 1 or not valido[a - 1] or not valido[b + 1]:
            continue
        dur = t[b] - t[a]
        if dur > MAX_APOYO_S:
            continue
        # Un contacto inicial ocurre con el pie por delante de la cadera; si empieza con el pie bajo o detrás
        # de ella, es el final de un apoyo anterior o ruido de detección (ADR-023).
        if np.isnan(x_rel[a]) or x_rel[a] < MIN_AVANCE_CONTACTO:
            continue
        # el pie debe haberse elevado antes y después del apoyo (prominencia)
        antes = y_bajo[max(0, a - 6):a][valido[max(0, a - 6):a]]
        despues = y_bajo[b + 1:b + 7][valido[b + 1:b + 7]]
        pico = np.nanmax(y_bajo[a:b + 1])
        if (len(antes) and pico - antes.min() < MIN_PROMINENCIA * largo
                and len(despues) and pico - despues.min() < MIN_PROMINENCIA * largo):
            continue
        out.append({"td": int(a), "to": int(b)})
    return out


# ------------------------------------------------------------------------------- análisis principal

def analizar_cinematica_eventos(cuadros: List[Dict[str, Any]], fps_muestreo: float,
                                edad: Optional[int] = None) -> Dict[str, Any]:
    """`cuadros`: [{'t': segundos reales, 'kp': {nombre: [x_px, y_px]}}] en orden, incluidos los sin detección."""
    out: Dict[str, Any] = {"metodo": "apoyos_por_pie_mas_bajo_sin_rotulos", "fs_muestreo": round(float(fps_muestreo), 1),
                           "valida": False, "variables": {}, "comparacion": {}}
    if fps_muestreo < FS_MIN_DETECCION:
        out["motivo"] = f"Muestreo de {fps_muestreo:.0f} cuadros/s: insuficiente para detectar apoyos."
        return out
    largo = _largo_pierna(cuadros)
    if not largo:
        out["motivo"] = "No se pudo estimar el largo de la pierna (cadera, rodilla y tobillo poco visibles)."
        return out
    sentido = _sentido_de_carrera(cuadros)
    out["sentido_de_carrera"] = sentido
    out["largo_pierna_px"] = round(largo, 1)
    s = sentido["sentido"]
    if s is None:
        out["motivo"] = "No se pudo determinar hacia dónde corre el atleta en la imagen."
        return out

    n = len(cuadros)
    t = np.array([c['t'] for c in cuadros], dtype=float)
    piernas = [_piernas(c['kp']) for c in cuadros]
    caderas = [_cadera(c['kp']) for c in cuadros]
    y_bajo, x_rel, apoyo_idx = np.full(n, np.nan), np.full(n, np.nan), [None] * n
    for i, (ps, cad) in enumerate(zip(piernas, caderas)):
        if len(ps) == 2 and cad:
            k = 0 if ps[0]['_y_pie'] >= ps[1]['_y_pie'] else 1
            apoyo_idx[i] = k
            y_bajo[i] = ps[k]['_y_pie']
            x_rel[i] = (ps[k]['_x_pie'] - cad[0]) * s / largo

    depurado = depurar_apoyos(detectar_apoyos(t, y_bajo, x_rel, largo), t)
    out["paso_dominante_s"] = depurado["paso_dominante_s"]
    out["contactos_descartados"] = depurado.get("contactos_descartados", 0)
    pasos: List[Dict[str, Any]] = []
    for ap in depurado["apoyos"]:
        td, to = ap['td'], ap['to']
        pa_td, pa_to = piernas[td][apoyo_idx[td]], piernas[to][apoyo_idx[to]]
        libre_td = piernas[td][1 - apoyo_idx[td]]
        cad_td, cad_to = caderas[td], caderas[to]
        pasos.append({
            "td": td, "to": to, "tramo": ap["tramo"],
            "t_contacto": round(float(t[td]), 3), "t_despegue": round(float(t[to]), 3),
            "tiempo_apoyo_s": round(float(t[to] - t[td] + 1.0 / fps_muestreo), 3),
            "rodilla_contacto": _rodilla(pa_td), "rodilla_despegue": _rodilla(pa_to),
            "muslo_contacto": _muslo(pa_td, s), "muslo_despegue": _muslo(pa_to, s),
            "muslo_contralateral_contacto": _muslo(libre_td, s),
            "distancia_relativa_contacto": (pa_td['_x_pie'] - cad_td[0]) * s / largo * 100.0,
            "distancia_relativa_despegue": (cad_to[0] - pa_to['_x_pie']) * s / largo * 100.0,
        })

    # Recobro y tiempos entre contactos consecutivos del mismo tramo continuo. La pierna libre es la que
    # no apoya (durante el apoyo) o la que va por delante (durante el vuelo); su rodilla mínima y su muslo
    # máximo describen el recobro de la pierna que apoyará en el contacto siguiente.
    for k in range(len(pasos) - 1):
        a, b = pasos[k], pasos[k + 1]
        if a["tramo"] != b["tramo"]:
            continue
        dt = t[b['td']] - t[a['td']]
        rod, mus = [], []
        for i in range(a['td'], b['td']):
            ps = piernas[i]
            if len(ps) != 2:
                continue
            if i <= a['to']:
                libre = ps[1 - apoyo_idx[i]] if apoyo_idx[i] is not None else None
            else:
                libre = max(ps, key=lambda p: (p['knee'][0] - p['hip'][0]) * s)
            if libre:
                rod.append(_rodilla(libre))
                mus.append(_muslo(libre, s))
        if len(rod) >= 3:
            b["rodilla_min_balanceo"] = min(rod)
            b["muslo_max_elevacion"] = max(mus)
        b["tiempo_paso_s"] = round(float(dt), 3)
        vuelo = t[b['td']] - t[a['to']] - 1.0 / fps_muestreo
        if vuelo > 0:
            b["tiempo_vuelo_s"] = round(float(vuelo), 3)

    out["conteo_pasos"] = len(pasos)
    out["regularidad"] = _regularidad(pasos)
    apoyos_s = [p["tiempo_apoyo_s"] for p in pasos]
    mediana_apoyo = float(np.median(apoyos_s)) if apoyos_s else None
    out["apoyo_estable"] = {
        "estable": bool(mediana_apoyo is not None and mediana_apoyo >= MIN_APOYO_MEDIANO_S),
        "mediana_apoyo_s": round(mediana_apoyo, 3) if mediana_apoyo is not None else None,
        "motivo": None if (mediana_apoyo is not None and mediana_apoyo >= MIN_APOYO_MEDIANO_S) else
        (f"Los apoyos detectados duran {mediana_apoyo:.2f} s en mediana (mínimo plausible "
         f"{MIN_APOYO_MEDIANO_S} s): el pie no se detecta estable en el suelo (pies en el borde de la imagen, "
         "borrosos o tapados). Los instantes de contacto y despegue no son fiables."
         if mediana_apoyo is not None else "Sin apoyos detectados.")}
    # Pierna A / B por alternancia de pasos, dentro del tramo continuo más largo (entre tramos distintos
    # no se sabe cuál pierna es cuál). Requiere al menos 5 contactos seguidos (2 o más pasos por pierna).
    tramos: Dict[int, List[Dict[str, Any]]] = {}
    for p in pasos:
        tramos.setdefault(p["tramo"], []).append(p)
    tramo_largo = max(tramos.values(), key=len) if tramos else []
    secuencia_completa = len(tramo_largo) >= 5
    for p in pasos:
        p["pierna"] = None
    if secuencia_completa:
        for k, p in enumerate(tramo_largo):
            p["pierna"] = "A" if k % 2 == 0 else "B"
    out["simetria_por_alternancia"] = secuencia_completa
    out["contactos_en_tramo_mas_largo"] = len(tramo_largo)
    out["pasos"] = [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in p.items() if k not in ("td", "to")}
                    for p in pasos]

    claves = ("rodilla_contacto", "rodilla_despegue", "muslo_contacto", "muslo_despegue",
              "muslo_contralateral_contacto", "distancia_relativa_contacto", "distancia_relativa_despegue",
              "rodilla_min_balanceo", "muslo_max_elevacion", "tiempo_apoyo_s", "tiempo_vuelo_s")
    variables: Dict[str, Any] = {}
    for clave in claves:
        total = resumen_estadistico([p.get(clave) for p in pasos])
        if secuencia_completa:
            total["por_pierna"] = {x: resumen_estadistico([p.get(clave) for p in pasos if p["pierna"] == x])
                                   for x in ("A", "B")}
        variables[clave] = total
    tiempos_paso = [p["tiempo_paso_s"] for p in pasos if p.get("tiempo_paso_s")]
    variables["frecuencia_paso_hz"] = resumen_estadistico([1.0 / x for x in tiempos_paso])
    if tiempos_paso:
        variables["frecuencia_paso_hz"]["media_global"] = round(1.0 / float(np.mean(tiempos_paso)), 2)
    out["variables"] = variables
    frec = variables["frecuencia_paso_hz"].get("media_global")
    out["es_sprint"] = {
        "es_sprint": bool(frec is not None and frec >= FRECUENCIA_MIN_SPRINT_HZ),
        "frecuencia_paso_hz": frec,
        "motivo": None if (frec is not None and frec >= FRECUENCIA_MIN_SPRINT_HZ) else
        (f"Ritmo de {frec:.2f} pasos/s, propio de un trote (un sprint supera {FRECUENCIA_MIN_SPRINT_HZ}): la "
         "referencia es de sprint a máxima velocidad y no se aplica. Si el video está en cámara lenta, "
         "indicar el factor." if frec is not None else "No se pudo medir el ritmo de paso.")}
    out["comparacion"] = comparar_con_referencia(variables, fps_muestreo, edad, True, out["regularidad"],
                                                 out["apoyo_estable"], out["es_sprint"])
    out["valida"] = len(pasos) >= MIN_EVENTOS
    if not out["valida"]:
        out["motivo"] = f"Menos de {MIN_EVENTOS} apoyos detectados: grabar un tramo de carrera más largo."
    return out


def depurar_apoyos(apoyos: List[Dict[str, int]], t: np.ndarray) -> Dict[str, Any]:
    """Elige, entre los contactos candidatos, la secuencia más coherente con el ritmo de paso.

    1. Paso dominante T: mediana de los intervalos plausibles, refinada descartando los menores que
       0,75 T (contactos falsos intercalados).
    2. Programación dinámica: se elige el subconjunto de contactos que maximiza el número de pasos y
       minimiza la desviación de cada intervalo respecto de T. Un intervalo de 0,75 a 1,35 T es un
       paso; uno de 1,6 T o más indica pasos perdidos (pies tapados) y corta la secuencia en tramos, sin
       inventar contactos; un intervalo menor que 0,75 T o entre 1,35 y 1,6 T no se acepta.
    """
    if len(apoyos) < 2:
        return {"apoyos": [dict(a, tramo=0) for a in apoyos], "paso_dominante_s": None}
    tiempos = np.array([t[a["td"]] for a in apoyos], dtype=float)
    dif = np.diff(tiempos)
    plaus = dif[(dif >= PASO_MIN_S) & (dif <= PASO_MAX_S)]
    if not len(plaus):
        return {"apoyos": [dict(a, tramo=i) for i, a in enumerate(apoyos)], "paso_dominante_s": None}
    T = float(np.median(plaus))
    refinados = plaus[(plaus >= 0.75 * T) & (plaus <= 1.5 * T)]
    if len(refinados):
        T = float(np.median(refinados))

    n = len(apoyos)
    PREMIO, CORTE = 1.0, 0.8            # premio por contacto aceptado; costo de un paso perdido
    mejor = [-PREMIO] * n               # mejor puntaje (negativo = bueno) de una secuencia que termina en i
    previo: List[Optional[int]] = [None] * n
    for j in range(n):
        for i in range(j):
            r = (tiempos[j] - tiempos[i]) / T
            if 0.75 <= r <= 1.35:
                costo = (r - 1.0) ** 2 * 4.0
            elif r >= 1.6:
                costo = CORTE           # pasos perdidos: nuevo tramo
            else:
                continue
            v = mejor[i] + costo - PREMIO
            if v < mejor[j]:
                mejor[j], previo[j] = v, i
    fin = int(np.argmin(mejor))
    elegidos = []
    while fin is not None:
        elegidos.append(fin)
        fin = previo[fin]
    elegidos.reverse()
    tramo, out = 0, []
    for k, idx in enumerate(elegidos):
        if k and (tiempos[idx] - tiempos[elegidos[k - 1]]) / T > 1.5:
            tramo += 1
        out.append(dict(apoyos[idx], tramo=tramo))
    return {"apoyos": out, "paso_dominante_s": round(T, 3),
            "contactos_descartados": n - len(elegidos)}


def _regularidad(pasos: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Los pasos medidos (contactos consecutivos de un mismo tramo) deben tener duración plausible y
    regular. Si no, la detección no es fiable (pies tapados, cámara inestable) y no se compara."""
    tiempos = [p["tiempo_paso_s"] for p in pasos if p.get("tiempo_paso_s")]
    motivos = []
    plausibles = [x for x in tiempos if PASO_MIN_S <= x <= PASO_MAX_S]
    frac = len(plausibles) / len(tiempos) if tiempos else 0.0
    cv = float(np.std(tiempos, ddof=1) / np.mean(tiempos) * 100) if len(tiempos) >= 3 else None
    if len(tiempos) < 3:
        motivos.append("Menos de tres pasos completos medidos (se necesitan cuatro contactos seguidos).")
    elif frac < FRACCION_PASOS_VALIDOS_MIN:
        motivos.append(f"Solo {frac * 100:.0f} % de los pasos dura entre {PASO_MIN_S} y {PASO_MAX_S} s "
                       "(si el video es en cámara lenta, indicar el factor).")
    if cv is not None and cv > CV_PASO_MAX_PCT:
        motivos.append(f"El tiempo de paso varía {cv:.0f} % entre pasos (máximo {CV_PASO_MAX_PCT:.0f} %).")
    return {"regular": not motivos, "pasos_medidos": len(tiempos), "pasos_plausibles_pct": round(frac * 100, 1),
            "cv_tiempo_paso_pct": round(cv, 1) if cv is not None else None, "motivos": motivos}


def _error_metodo(unidad: str) -> Optional[float]:
    return max(ERROR_METODO_PILOTO_GRADOS.values()) if unidad == "°" else None


# Variables medidas en el instante de contacto o de despegue: requieren que el apoyo se detecte estable.
VARIABLES_DE_INSTANTE = ("rodilla_contacto", "rodilla_despegue", "muslo_contacto", "muslo_despegue",
                         "muslo_contralateral_contacto", "distancia_relativa_contacto",
                         "distancia_relativa_despegue", "tiempo_apoyo_s")


def comparar_con_referencia(variables: Dict[str, Any], fs: float, edad: Optional[int],
                            sentido_conocido: bool, regularidad: Optional[Dict[str, Any]] = None,
                            apoyo_estable: Optional[Dict[str, Any]] = None,
                            es_sprint: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Compara la media del atleta con la referencia publicada, variable por variable."""
    ref = REFERENCIA_MAXIMA_VELOCIDAD
    menor = isinstance(edad, int) and edad < ref["poblacion"]["edad_min"]
    out: Dict[str, Any] = {}
    for clave, r in ref["variables"].items():
        v = variables.get(clave) or {}
        item: Dict[str, Any] = {"etiqueta": r["etiqueta"], "unidad": r["unidad"],
                                "referencia": {"media": r["media"], "de": r["de"], "rango": r.get("rango")},
                                "definicion": r["definicion"]}
        media = v.get("media_global", v.get("media"))
        fs_min = r.get("fs_min", 0.0)
        if regularidad is not None and not regularidad.get("regular"):
            item.update(estado="no_comparable",
                        motivo="Apoyos detectados de forma irregular (pies tapados, apoyos perdidos o cámara "
                               "inestable): " + " ".join(regularidad.get("motivos", [])))
        elif es_sprint is not None and not es_sprint.get("es_sprint"):
            item.update(estado="no_comparable", motivo=es_sprint.get("motivo"))
        elif (clave in VARIABLES_DE_INSTANTE and apoyo_estable is not None
              and not apoyo_estable.get("estable")):
            item.update(estado="no_comparable", motivo=apoyo_estable.get("motivo"))
        elif r.get("requiere_sentido") and not sentido_conocido:
            item.update(estado="no_comparable", motivo="No se pudo determinar el sentido de carrera en la imagen.")
        elif fs < fs_min:
            item.update(estado="no_comparable",
                        motivo=f"Se necesitan {fs_min:.0f} cuadros/s reales o más para medir este instante con "
                               f"precisión; el video se analizó a {fs:.0f}.")
        elif not v.get("n") or v["n"] < MIN_EVENTOS or media is None:
            item.update(estado="insuficiente", motivo=f"Menos de {MIN_EVENTOS} pasos válidos.")
        else:
            dif = float(media) - r["media"]
            z = dif / r["de"]
            err = _error_metodo(r["unidad"])
            item.update(valor=round(float(media), 2), n=v["n"], diferencia=round(dif, 2), z=round(z, 2),
                        error_metodo=err)
            if abs(z) <= Z_ALTERACION:
                item["estado"] = "dentro_de_referencia"
            elif err is not None and abs(dif) <= err:
                item["estado"] = "dentro_del_error_del_metodo"
            else:
                item["estado"] = "alteracion"
            item["sentido"] = "mayor" if dif > 0 else "menor"
            # Asimetría entre la pierna A y la B (pasos alternos), en DE de la referencia.
            pp = v.get("por_pierna") or {}
            a, b = (pp.get("A") or {}), (pp.get("B") or {})
            if a.get("n", 0) >= 2 and b.get("n", 0) >= 2:
                d_ab = a["media"] - b["media"]
                item["bilateral"] = {"pierna_a": a["media"], "pierna_b": b["media"],
                                     "diferencia": round(d_ab, 2), "z": round(d_ab / r["de"], 2)}
        if menor:
            item["nota_poblacion"] = ("Referencia de velocistas adultos: en un escolar la diferencia puede deberse "
                                      "a la edad y la maduración, no a un error técnico.")
        out[clave] = item
    return out
